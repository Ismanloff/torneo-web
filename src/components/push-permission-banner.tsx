"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, X } from "lucide-react";

const PUSH_DISMISSED_KEY = "torneo-push-dismissed";

function getPushBannerVisibility() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (Notification.permission !== "default") return false;
  if (localStorage.getItem(PUSH_DISMISSED_KEY) === "1") return false;
  return true;
}

export function PushPermissionBanner() {
  const [dismissed, setDismissed] = useState(false);
  const canShow = useSyncExternalStore(
    () => () => undefined,
    getPushBannerVisibility,
    () => false,
  );
  const visible = !dismissed && canShow;

  if (!visible) return null;

  const handleActivate = async () => {
    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setDismissed(true);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error("[push] VAPID public key not configured");
        setDismissed(true);
        return;
      }

      // Convert VAPID key from base64url to Uint8Array
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; i++) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          },
        }),
      });

      setDismissed(true);
    } catch (error) {
      console.error("[push] Error activating push notifications:", error);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(PUSH_DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="app-panel flex items-start gap-3">
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[var(--app-accent)]" />
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--app-text)]">
          Activa las notificaciones para recibir avisos de tus partidos
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            className="rounded-full bg-[var(--app-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            type="button"
            onClick={handleActivate}
          >
            Activar
          </button>
          <button
            className="rounded-full border border-[var(--app-line)] px-4 py-2 text-sm font-medium text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
            type="button"
            onClick={handleDismiss}
          >
            Ahora no
          </button>
        </div>
      </div>
      <button
        aria-label="Cerrar aviso de notificaciones"
        className="shrink-0 rounded-full p-1 text-[var(--app-muted)] transition hover:text-[var(--app-text)]"
        type="button"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
