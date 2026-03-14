"use client";

import { useCallback, useEffect, useState } from "react";

import { getPendingCount } from "@/lib/offline-store";

export function SyncIndicator() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    getPendingCount()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, 5000);

    const onOnline = () => {
      refresh();
    };

    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
      {count} pendiente{count !== 1 ? "s" : ""} de sync
    </div>
  );
}
