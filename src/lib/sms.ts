export async function sendSMS(params: {
  to: string;
  message: string;
  provider?: "twilio" | "msg91" | "textlocal";
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider =
    params.provider || (process.env.SMS_PROVIDER as string) || "twilio";

  switch (provider) {
    case "twilio":
      return sendViaTwilio(params.to, params.message);
    case "msg91":
      return sendViaMSG91(params.to, params.message);
    case "textlocal":
      return sendViaTextLocal(params.to, params.message);
    default:
      return { success: false, error: `Unknown provider: ${provider}` };
  }
}

async function sendViaTwilio(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({ To: to, From: from, Body: message });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.message || "Twilio error" };
    }

    return { success: true, messageId: json.sid };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Twilio request failed",
    };
  }
}

async function sendViaMSG91(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID;

  if (!authKey) {
    return { success: false, error: "MSG91 not configured" };
  }

  try {
    const res = await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderId || "TXLERP",
        route: "4",
        country: "91",
        sms: [{ message, to: [to] }],
      }),
    });

    const json = await res.json();
    if (!res.ok || json.type === "error") {
      return { success: false, error: json.message || "MSG91 error" };
    }

    return { success: true, messageId: json.request_id || json.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "MSG91 request failed",
    };
  }
}

async function sendViaTextLocal(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.TEXTLOCAL_API_KEY;
  const sender = process.env.TEXTLOCAL_SENDER;

  if (!apiKey) {
    return { success: false, error: "TextLocal not configured" };
  }

  try {
    const body = new URLSearchParams({
      apikey: apiKey,
      sender: sender || "TXLERP",
      numbers: to,
      message,
    });

    const res = await fetch("https://api.textlocal.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const json = await res.json();
    if (json.status !== "success") {
      return {
        success: false,
        error: json.errors?.[0]?.message || "TextLocal error",
      };
    }

    const batchId = json.batch_id || json.request_id;
    return { success: true, messageId: batchId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "TextLocal request failed",
    };
  }
}
