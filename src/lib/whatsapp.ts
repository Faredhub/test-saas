/**
 * WhatsApp Cloud API integration via Meta Graph API.
 * All functions gracefully return errors when credentials are missing.
 */

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

type WhatsAppResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

const GRAPH_API_VERSION = "v18.0";

function getBaseUrl(): string {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

/**
 * Send a template-based WhatsApp message.
 * Templates must be pre-approved in the Meta Business Manager.
 */
export async function sendWhatsAppMessage(
  to: string,
  templateName: string,
  params: string[]
): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        components: params.length > 0
          ? [
              {
                type: "body",
                parameters: params.map((p) => ({ type: "text", text: p })),
              },
            ]
          : [],
      },
    };

    const res = await fetch(getBaseUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const msgId = data.messages?.[0]?.id;
      return { success: true, messageId: msgId };
    }
    const err = await res.text();
    return { success: false, error: `WhatsApp API error: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Send a free-form text message via WhatsApp.
 * Only works for users who have opted in (messaged the business number first).
 */
export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    };

    const res = await fetch(getBaseUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const msgId = data.messages?.[0]?.id;
      return { success: true, messageId: msgId };
    }
    const err = await res.text();
    return { success: false, error: `WhatsApp API error: ${err}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
