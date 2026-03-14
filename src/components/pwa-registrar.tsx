"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "torneo-install-dismissed";

/**
 * Request notification permission from the user.
 * Call this after login, not on first visit.
 * Returns the permission state: "granted", "denied", or "default".
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

/**
 * Register a Background Sync tag with the active service worker registration.
 * If Background Sync is not supported, resolves silently.
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
  }
}

export function PwaRegistrar() {
  const pathname = usePathname();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  });
  const [isStandaloneMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    );
  });
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => {});

        const onUpdateFound = () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        };

        registration.addEventListener("updatefound", onUpdateFound);

        if (registration.waiting) {
          setUpdateReady(true);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const shouldShowInstallPrompt =
    pathname === "/" &&
    installEvent &&
    !installDismissed &&
    !isStandaloneMode;

  const dismissInstallPrompt = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    }

    setInstallDismissed(true);
  };

  return (
    <>
      {shouldShowInstallPrompt ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[color:rgba(255,248,236,0.98)] p-4 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">
              Instalar app
            </p>
            <button
              aria-label="Cerrar aviso de instalacion"
              className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] transition hover:text-[var(--ink)]"
              type="button"
              onClick={dismissInstallPrompt}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Anade el torneo a la pantalla de inicio para usarlo como PWA en movil.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              className="action-button action-button--signal w-full"
              type="button"
              onClick={async () => {
                await installEvent.prompt();
                await installEvent.userChoice.catch(() => {});
                setInstallEvent(null);
              }}
            >
              Instalar ahora
            </button>
            <button
              className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
              type="button"
              onClick={dismissInstallPrompt}
            >
              Ahora no
            </button>
          </div>
        </div>
      ) : null}

      {updateReady ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[color:rgba(23,19,17,0.96)] p-4 text-white shadow-[var(--shadow)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--signal-soft)]">
            Nueva version lista
          </p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Hay una actualizacion disponible del sistema del torneo.
          </p>
          <button
            className="action-button mt-4 w-full bg-white text-[var(--ink)]"
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            Actualizar
          </button>
        </div>
      ) : null}
    </>
  );
}
