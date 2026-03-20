import "server-only";

import webpush from "web-push";

import { supabaseAdmin } from "@/lib/supabase/admin";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.NEXT_PUBLIC_SITE_URL
  ? `mailto:admin@${new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname}`
  : "mailto:admin@torneo.local";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendPushToStaff(
  staffUserId: string,
  payload: {
    title: string;
    body: string;
    url: string;
  },
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys not configured, skipping push notification");
    return;
  }

  try {
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("staff_user_id", staffUserId);

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: "/icon-192.png",
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_key,
            },
          },
          pushPayload,
        ),
      ),
    );

    // Clean up expired/gone subscriptions
    const idsToDelete: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;

        if (statusCode === 410 || statusCode === 404) {
          idsToDelete.push(subscriptions[index].id);
        }
      }
    });

    if (idsToDelete.length > 0) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .in("id", idsToDelete);
    }
  } catch (error) {
    console.error("[push] Error sending push notification:", error);
  }
}
