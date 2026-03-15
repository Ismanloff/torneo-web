"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Ellipsis, Share2, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "torneo-install-dismissed";

type Platform = "ios-safari" | "ios-other" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return "other";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSafari =
    /safari/.test(userAgent) &&
    !/crios|fxios|edgios|opr\//.test(userAgent);

  if (isIOS && isSafari) {
    return "ios-safari";
  }

  if (isIOS) {
    return "ios-other";
  }

  if (isAndroid) {
    return "android";
  }

  return "other";
}

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

export function PwaRegistrar({ appVersion }: { appVersion: string }) {
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
  const [platform] = useState<Platform>(() => detectPlatform());
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith("torneo-"))
              .map((key) => window.caches.delete(key)),
          );
        }

        const devResetKey = "torneo-dev-sw-reset";
        if (
          registrations.length > 0 &&
          window.sessionStorage.getItem(devResetKey) !== "1"
        ) {
          window.sessionStorage.setItem(devResetKey, "1");
          window.location.reload();
          return;
        }

        window.sessionStorage.removeItem(devResetKey);
      })();

      return;
    }

    let registrationCleanup: (() => void) | undefined;
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(appVersion)}`, { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => {});

        const refreshRegistration = () => {
          if (document.visibilityState === "hidden") {
            return;
          }

          registration.update().catch(() => {});
        };

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
        window.addEventListener("focus", refreshRegistration);
        document.addEventListener("visibilitychange", refreshRegistration);

        if (registration.waiting) {
          setUpdateReady(true);
        }

        const intervalId = window.setInterval(refreshRegistration, 60_000);

        registrationCleanup = () => {
          registration.removeEventListener("updatefound", onUpdateFound);
          window.removeEventListener("focus", refreshRegistration);
          document.removeEventListener("visibilitychange", refreshRegistration);
          window.clearInterval(intervalId);
        };
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      registrationCleanup?.();
    };
  }, [appVersion]);

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
    !installDismissed &&
    !isStandaloneMode &&
    isMobileViewport &&
    (Boolean(installEvent) || platform === "ios-safari" || platform === "ios-other" || platform === "android");

  const isDirectInstall = Boolean(installEvent);
  const isIosInstall = platform === "ios-safari" || platform === "ios-other";

  const title = isDirectInstall
    ? "Instala la app del torneo"
    : isIosInstall
      ? "Guarda la app en tu inicio"
      : "Instala la app del torneo";

  const description = isDirectInstall
    ? "Abrela como una app, sin barras del navegador y con acceso rapido desde tu movil."
    : platform === "ios-safari"
      ? "En iPhone o iPad se instala desde Safari. Toca compartir y anadela a la pantalla de inicio."
      : platform === "ios-other"
        ? "Para instalarla en iPhone o iPad, abre esta pagina en Safari y anadela a la pantalla de inicio."
        : "Si tu navegador no muestra el boton directo, abre el menu y toca Instalar app o Anadir a pantalla de inicio.";

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
                App del torneo
              </p>
              <p className="mt-1 text-[0.95rem] leading-5 text-[var(--ink)]">
                {title}
              </p>
              <p className="mt-1.5 text-[0.88rem] leading-5 text-[var(--muted)]">
                {description}
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
          {isDirectInstall ? (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                className="action-button action-button--signal min-h-10 flex-1 px-4 py-2.5 text-[0.8rem]"
                type="button"
                onClick={async () => {
                  if (!installEvent) {
                    return;
                  }

                  await installEvent.prompt();
                  await installEvent.userChoice.catch(() => {});
                  setInstallEvent(null);
                }}
              >
                Instalar app
              </button>
              <button
                className="rounded-full border border-[var(--line)] px-3 py-2 text-[0.92rem] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                type="button"
                onClick={dismissInstallPrompt}
              >
                Ahora no
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {platform === "ios-safari" ? (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    1. Toca <span className="font-semibold">Compartir</span> <Share2 className="ml-1 inline h-3.5 w-3.5 align-[-2px]" /> en Safari.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    2. Pulsa <span className="font-semibold">Anadir a pantalla de inicio</span>.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    3. Confirma con <span className="font-semibold">Anadir</span>.
                  </div>
                </>
              ) : platform === "ios-other" ? (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    1. Abre esta pagina en <span className="font-semibold">Safari</span>.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    2. Toca <span className="font-semibold">Compartir</span> <Share2 className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    3. Pulsa <span className="font-semibold">Anadir a pantalla de inicio</span>.
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    1. Abre el menu del navegador <Ellipsis className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    2. Toca <span className="font-semibold">Instalar app</span> o <span className="font-semibold">Anadir a pantalla de inicio</span>.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2.5 text-[0.85rem] text-[var(--ink)]">
                    3. Confirma la instalacion y abre la <span className="font-semibold">app</span> desde tu inicio.
                  </div>
                </>
              )}

              <button
                className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-[0.92rem] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                type="button"
                onClick={dismissInstallPrompt}
              >
                <Smartphone className="h-4 w-4" />
                Entendido
              </button>
            </div>
          )}
        </div>
      ) : null}

      {updateReady ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[color:rgba(23,19,17,0.96)] p-4 text-white shadow-[var(--shadow)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--signal-soft)]">
            Nueva version de la app
          </p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Hay una actualizacion disponible. Al recargar tendras la ultima version instalada.
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
