import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@district3141.com", pub, priv);
  configured = true;
  return true;
}

/** Best-effort: never throws, never blocks the caller's main flow. */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  try {
    if (userIds.length === 0 || !configure()) return;
    const subs = await (prisma as any).pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body
          );
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await (prisma as any).pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }
        }
      })
    );
  } catch {
    // push is optional — ignore any failure (table missing, keys missing, etc.)
  }
}
