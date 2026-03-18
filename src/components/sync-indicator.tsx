"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { getPendingCount } from "@/lib/offline-store";
import { trackPwaEvent } from "@/lib/pwa-telemetry";

async function requestOfflineScoreSync() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    try {
      await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-scores");
    } catch {
      // Foreground sync below handles browsers or states without SyncManager support.
    }
  }

  registration.active?.postMessage({ type: "sync-offline-scores" });
}

export function SyncIndicator() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<"idle" | "syncing" | "synced" | "pending">("idle");
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const refresh = useCallback(() => {
    getPendingCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, 5000);

    const onOnline = () => {
      setIsOnline(true);
      refresh();
      void requestOfflineScoreSync().catch(() => {});
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onOnline();
      }
    };

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "sync-complete" || event.data?.type === "offline-sync-update") {
        if (typeof event.data?.status === "string") {
          setStatus(event.data.status);
        }
        refresh();
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, [refresh]);

  useEffect(() => {
    if (count === 0) {
      return;
    }

    if (status === "syncing") {
      trackPwaEvent("offline_queue_syncing", { count });
    } else if (status === "synced") {
      trackPwaEvent("offline_queue_synced", { count });
    } else if (status === "pending" || !isOnline) {
      trackPwaEvent("offline_queue_pending", { count, online: isOnline });
    }
  }, [count, isOnline, status]);

  if (count === 0) {
    return null;
  }

  const title =
    status === "syncing"
      ? "Sincronizando cambios"
      : status === "synced"
        ? "Cambios enviados"
        : isOnline
          ? "Cambios pendientes"
          : "Modo sin conexión";

  const meta =
    status === "synced"
      ? "La cola se ha refrescado."
      : `${count} cambio${count !== 1 ? "s" : ""} en cola`;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(8,12,24,0.9)] px-4 py-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
          <RotateCcw className={`h-4 w-4 ${isOnline ? "animate-pulse" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-white/65">
            {meta}
          </p>
        </div>
      </div>
    </div>
  );
}
