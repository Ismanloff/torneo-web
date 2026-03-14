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
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia?.("(max-width: 767px)").matches ?? false;
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

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const shouldShowInstallPrompt =
    pathname === "/" &&
    installEvent &&
    !installDismissed &&
    !isStandaloneMode &&
    isMobileViewport;

  const dismissInstallPrompt = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    }

    setInstallDismissed(true);
  };

  return (
    <>
      {shouldShowInstallPrompt ? (
        <div className="fixed inset-x-3 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-[22rem] rounded-[1.15rem] border border-[var(--line)] bg-[color:rgba(255,248,236,0.96)] p-2.5 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">
                PWA
              </p>
              <p className="mt-1 text-[0.95rem] leading-5 text-[var(--ink)]">
                Instala el torneo y abrelo como app en el movil.
              </p>
            </div>
            <button
              aria-label="Cerrar aviso de instalacion"
              className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] transition hover:text-[var(--ink)]"
              type="button"
              onClick={dismissInstallPrompt}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              className="action-button action-button--signal min-h-10 flex-1 px-4 py-2.5 text-[0.8rem]"
              type="button"
              onClick={async () => {
                await installEvent.prompt();
                await installEvent.userChoice.catch(() => {});
                setInstallEvent(null);
              }}
            >
              Instalar
            </button>
            <button
              className="rounded-full border border-[var(--line)] px-3 py-2 text-[0.92rem] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
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
