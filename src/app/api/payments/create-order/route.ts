import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { normalizeUrlEnv } from "@/lib/env";
import {
  getConfiguredGateway,
  getRazorpay,
  getStripe,
} from "@/lib/payment-gateway";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId as string;

  const gateway = getConfiguredGateway();
  if (!gateway) {
    return NextResponse.json(
      { error: "No payment gateway configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { invoiceId, currency } = body as {
    invoiceId: string;
    currency?: string;
  };

  if (!invoiceId) {
    return NextResponse.json(
      { error: "invoiceId is required" },
      { status: 400 }
    );
  }

  // Fetch the invoice and validate ownership
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...tenantScope(tenantId) },
    include: { contact: true, tenant: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (["PAID", "CANCELLED", "REFUNDED"].includes(invoice.status)) {
    return NextResponse.json(
      { error: "Invoice is not payable" },
      { status: 400 }
    );
  }

  const balanceDue = Number(invoice.total) - Number(invoice.amountPaid);
  if (balanceDue <= 0) {
    return NextResponse.json(
      { error: "No balance due on this invoice" },
      { status: 400 }
    );
  }

  const cur = (currency ?? "INR").toUpperCase();

  try {
    if (gateway === "razorpay") {
      const rz = getRazorpay();
      const order = await rz.orders.create({
        amount: Math.round(balanceDue * 100), // paise
        currency: cur,
        receipt: invoice.invoiceNo ?? invoiceId,
        notes: {
          invoiceId,
          tenantId,
        },
      });

      return NextResponse.json({
        gateway: "razorpay",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        invoiceNo: invoice.invoiceNo,
        contactName: invoice.contact
          ? `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim()
          : undefined,
        contactEmail: invoice.contact?.email ?? undefined,
        contactPhone: invoice.contact?.phone ?? undefined,
        tenantName: invoice.tenant?.name ?? undefined,
      });
    }

    // Stripe
    const stripe = getStripe();
    const origin = request.headers.get("origin") ?? normalizeUrlEnv(process.env.NEXTAUTH_URL, "");

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: cur.toLowerCase(),
            product_data: {
              name: `Invoice ${invoice.invoiceNo ?? invoiceId}`,
              description: `Payment for invoice ${invoice.invoiceNo}`,
            },
            unit_amount: Math.round(balanceDue * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        tenantId,
      },
      success_url: `${origin}/sales/invoices/${invoiceId}?payment=success`,
      cancel_url: `${origin}/sales/invoices/${invoiceId}?payment=cancelled`,
    });

    return NextResponse.json({
      gateway: "stripe",
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (err) {
    console.error("[payments/create-order] Error:", err);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
