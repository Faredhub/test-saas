import { NextRequest, NextResponse } from "next/server";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  getConfiguredGateway,
  verifyRazorpayWebhookSignature,
  getStripe,
} from "@/lib/payment-gateway";
import type { PaymentMethod } from "@/generated/prisma/enums";

// Disable body parsing so we can verify webhook signatures on raw body
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gateway = getConfiguredGateway();
  if (!gateway) {
    return NextResponse.json({ error: "No gateway" }, { status: 503 });
  }

  const rawBody = await request.text();

  try {
    if (gateway === "razorpay") {
      return handleRazorpayWebhook(rawBody, request);
    }
    return handleStripeWebhook(rawBody, request);
  } catch (err) {
    console.error("[payments/webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Razorpay webhook
// ---------------------------------------------------------------------------

async function handleRazorpayWebhook(rawBody: string, request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ status: "ignored" });
    }

    const invoiceId = payment.notes?.invoiceId;
    const tenantId = payment.notes?.tenantId;

    if (!invoiceId || !tenantId) {
      return NextResponse.json({ status: "ignored, no invoice metadata" });
    }

    await processWebhookPayment({
      invoiceId,
      tenantId,
      amount: payment.amount / 100, // paise to rupees
      method: "RAZORPAY",
      reference: payment.id,
      gatewayOrderId: payment.order_id,
    });
  }

  return NextResponse.json({ status: "ok" });
}

// ---------------------------------------------------------------------------
// Stripe webhook
// ---------------------------------------------------------------------------

async function handleStripeWebhook(rawBody: string, request: NextRequest) {
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId;
    const tenantId = session.metadata?.tenantId;

    if (!invoiceId || !tenantId) {
      return NextResponse.json({ status: "ignored, no invoice metadata" });
    }

    if (session.payment_status === "paid") {
      await processWebhookPayment({
        invoiceId,
        tenantId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        method: "STRIPE",
        reference: (session.payment_intent as string) ?? session.id,
        gatewayOrderId: session.id,
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}

// ---------------------------------------------------------------------------
// Shared: record payment from webhook (no user session)
// ---------------------------------------------------------------------------

async function processWebhookPayment(params: {
  invoiceId: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  gatewayOrderId: string;
}) {
  const { invoiceId, tenantId, method, reference, gatewayOrderId } = params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...tenantScope(tenantId) },
  });

  if (!invoice) {
    console.error("[webhook] Invoice not found:", invoiceId);
    return;
  }

  // Idempotency: skip if already recorded
  const existing = await prisma.payment.findFirst({
    where: { invoiceId, reference },
  });
  if (existing) return;

  const balanceDue = Number(invoice.total) - Number(invoice.amountPaid);
  const paymentAmount = Math.min(params.amount || balanceDue, balanceDue);

  if (paymentAmount <= 0) return;

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: paymentAmount,
      method,
      reference,
      notes: `Webhook: ${method} payment. Order: ${gatewayOrderId}`,
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
    action: "payment.webhook",
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
}
