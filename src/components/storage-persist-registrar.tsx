"use client";

import { useEffect } from "react";

import { trackPwaEvent } from "@/lib/pwa-telemetry";

const STORAGE_PERSIST_KEY = "torneo-storage-persist-requested";

export function StoragePersistRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("storage" in navigator) || typeof navigator.storage.persist !== "function") {
      trackPwaEvent("storage_persist_unavailable");
      return;
    }

    if (window.localStorage.getItem(STORAGE_PERSIST_KEY) === "1") {
      return;
    }

    let cancelled = false;

    const requestPersistence = async () => {
      try {
        const alreadyPersisted = await navigator.storage.persisted?.();

        if (alreadyPersisted) {
          window.localStorage.setItem(STORAGE_PERSIST_KEY, "1");
          trackPwaEvent("storage_persist_granted", { source: "persisted" });
          return;
        }

        const granted = await navigator.storage.persist();

        if (cancelled) {
          return;
        }

        window.localStorage.setItem(STORAGE_PERSIST_KEY, "1");
        trackPwaEvent(granted ? "storage_persist_granted" : "storage_persist_denied", {
          source: "request",
        });
      } catch {
        if (!cancelled) {
          trackPwaEvent("storage_persist_denied", { source: "error" });
        }
      }
    };

    void requestPersistence();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
