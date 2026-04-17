import webPush from "web-push";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

const isConfigured = !!(VAPID_PUBLIC && VAPID_PRIVATE && VAPID_SUBJECT);

if (isConfigured) {
  webPush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC!, VAPID_PRIVATE!);
}

export async function sendPushNotification(
  subscription: webPush.PushSubscription,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!isConfigured) {
    console.log("Push not configured -- skipping notification");
    return;
  }

  await webPush.sendNotification(subscription, JSON.stringify(payload));
}
