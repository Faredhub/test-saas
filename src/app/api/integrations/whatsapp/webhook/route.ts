import { NextRequest, NextResponse } from "next/server";

/**
 * GET handler for Meta webhook verification.
 * Meta sends a challenge token that we must echo back to confirm the webhook.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST handler for incoming WhatsApp message webhooks.
 * Receives delivery status updates and incoming messages from users.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends a standard webhook payload structure
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // Process incoming messages
        const messages = value.messages ?? [];
        for (const message of messages) {
          // Log the incoming message for now -- extend with actual handling later
          console.log("[WhatsApp Webhook] Incoming message:", {
            from: message.from,
            type: message.type,
            timestamp: message.timestamp,
            text: message.text?.body,
          });
        }

        // Process delivery status updates
        const statuses = value.statuses ?? [];
        for (const status of statuses) {
          console.log("[WhatsApp Webhook] Status update:", {
            messageId: status.id,
            status: status.status,
            recipientId: status.recipient_id,
          });
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
