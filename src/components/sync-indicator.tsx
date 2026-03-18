"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { getPendingCount } from "@/lib/offline-store";

async function requestOfflineScoreSync() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    return;
  }

  registration.active?.postMessage({ type: "sync-offline-scores" });
}

export function SyncIndicator() {
  const [count, setCount] = useState(0);
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

    const onOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "sync-complete" || event.data?.type === "offline-sync-update") {
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
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, [refresh]);

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(8,12,24,0.9)] px-4 py-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
          <RotateCcw className={`h-4 w-4 ${isOnline ? "animate-pulse" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isOnline ? "Sincronizando cambios" : "Cambios pendientes"}
          </p>
          <p className="mt-0.5 text-xs text-white/65">
            {count} cambio{count !== 1 ? "s" : ""} en cola
          </p>
        </div>
      </div>
    </div>
  );
}
