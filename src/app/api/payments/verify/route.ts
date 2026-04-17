import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  getConfiguredGateway,
  verifyRazorpaySignature,
  getStripe,
} from "@/lib/payment-gateway";
import type { PaymentMethod } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const userId = user.id as string;
  const tenantId = user.tenantId as string;

  const gateway = getConfiguredGateway();
  if (!gateway) {
    return NextResponse.json(
      { error: "No payment gateway configured" },
      { status: 503 }
    );
  }

  const body = await request.json();

  try {
    if (gateway === "razorpay") {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        invoiceId,
      } = body as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        invoiceId: string;
      };

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !invoiceId
      ) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid payment signature" },
          { status: 400 }
        );
      }

      // Record the payment
      const result = await recordOnlinePayment({
        invoiceId,
        tenantId,
        userId,
        amount: null, // will be fetched from invoice balance
        method: "RAZORPAY",
        reference: razorpay_payment_id,
        gatewayOrderId: razorpay_order_id,
      });

      return NextResponse.json({ success: true, payment: result });
    }

    // Stripe verification via session retrieval
    const { sessionId, invoiceId } = body as {
      sessionId: string;
      invoiceId: string;
    };

    if (!sessionId || !invoiceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Verify the metadata matches
    if (checkoutSession.metadata?.invoiceId !== invoiceId) {
      return NextResponse.json(
        { error: "Invoice mismatch" },
        { status: 400 }
      );
    }

    const result = await recordOnlinePayment({
      invoiceId,
      tenantId,
      userId,
      amount: checkoutSession.amount_total
        ? checkoutSession.amount_total / 100
        : null,
      method: "STRIPE",
      reference: checkoutSession.payment_intent as string,
      gatewayOrderId: sessionId,
    });

    return NextResponse.json({ success: true, payment: result });
  } catch (err) {
    console.error("[payments/verify] Error:", err);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Shared helper to record a payment and update the invoice
// ---------------------------------------------------------------------------

async function recordOnlinePayment(params: {
  invoiceId: string;
  tenantId: string;
  userId: string;
  amount: number | null;
  method: PaymentMethod;
  reference: string;
  gatewayOrderId: string;
}) {
  const { invoiceId, tenantId, userId, method, reference, gatewayOrderId } =
    params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...tenantScope(tenantId) },
  });

  if (!invoice) throw new Error("Invoice not found");

  const balanceDue = Number(invoice.total) - Number(invoice.amountPaid);
  const paymentAmount = params.amount ?? balanceDue;

  if (paymentAmount <= 0) throw new Error("No balance due");

  // Check for duplicate payment reference
  const existing = await prisma.payment.findFirst({
    where: { invoiceId, reference },
  });
  if (existing) {
    return existing; // idempotent
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: paymentAmount,
      method,
      reference,
      notes: `Online payment via ${method}. Order: ${gatewayOrderId}`,
    },
  });

  const newAmountPaid = Number(invoice.amountPaid) + paymentAmount;
  const invoiceTotal = Number(invoice.total);
  const isFullyPaid = newAmountPaid >= invoiceTotal - 0.01;

  await prisma.invoice.updateMany({
    where: { id: invoiceId, ...tenantScope(tenantId) },
    data: {
      amountPaid: newAmountPaid,
      status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
      ...(isFullyPaid ? { paidDate: new Date() } : {}),
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: "payment.online",
    entity: "Payment",
    entityId: payment.id,
    metadata: {
      invoiceId,
      amount: paymentAmount,
      method,
      reference,
      gatewayOrderId,
    },
  });

  return payment;
}
