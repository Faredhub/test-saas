import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
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

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  const tenantId = paymentIntent.metadata?.tenantId;

  if (!orderId || !tenantId) {
    console.log("[stripe/webhook] Missing order metadata, skipping");
    return;
  }

  const order = await prisma.ecommerceOrder.findFirst({
    where: { id: orderId },
  });

  if (!order) {
    console.error("[stripe/webhook] Order not found:", orderId);
    return;
  }

  if (order.paymentStatus === "PAID") return;

  await prisma.ecommerceOrder.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paymentId: paymentIntent.id,
      status: order.status === "PENDING" ? "CONFIRMED" : order.status,
    },
  });

  await logAudit({
    tenantId,
    action: "payment.succeeded",
    entity: "EcommerceOrder",
    entityId: orderId,
    metadata: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
    },
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  const tenantId = paymentIntent.metadata?.tenantId;

  if (!orderId || !tenantId) return;

  await logAudit({
    tenantId,
    action: "payment.failed",
    entity: "EcommerceOrder",
    entityId: orderId,
    metadata: {
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message,
    },
  });
}
