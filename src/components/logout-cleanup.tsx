"use client";

import { useEffect } from "react";

type LogoutCleanupProps = {
  enabled: boolean;
};

export function LogoutCleanup({ enabled }: LogoutCleanupProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void (async () => {
      if ("caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key.startsWith("torneo-"))
            .map((key) => window.caches.delete(key)),
        );
      }

      try {
        window.indexedDB.deleteDatabase("torneo-offline");
      } catch {
        // Ignore storage cleanup failures on logout.
      }
    })();
  }, [enabled]);

  return null;
}
