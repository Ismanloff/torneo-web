"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Ellipsis, Share2, Smartphone, X } from "lucide-react";
import { trackPwaEvent } from "@/lib/pwa-telemetry";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "torneo-install-dismissed-until";
const HOME_VISIT_COUNT_KEY = "torneo-home-visit-count";
const INSTALL_INTEREST_KEY = "torneo-install-interest";
const AUTO_UPDATE_RELOAD_KEY = "torneo-auto-update-version";
export const OPEN_INSTALL_PROMPT_EVENT = "torneo:pwa-open-install";
const INSTALL_DISMISS_TTL = 1000 * 60 * 60 * 24 * 14;
const SHORT_INSTALL_DISMISS_TTL = 1000 * 60 * 60 * 24 * 3;
const INSTALL_SCROLL_THRESHOLD = 320;
const SW_UPDATE_READY = "update-ready";

type Platform = "ios-safari" | "ios-other" | "android" | "other";

function detectPlatform(): Platform {
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

function isStandaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function readDismissedState() {
  const rawValue = window.localStorage.getItem(INSTALL_DISMISSED_KEY);

  if (!rawValue) {
    return false;
  }

  const until = Number(rawValue);

  if (!Number.isFinite(until) || until <= Date.now()) {
    window.localStorage.removeItem(INSTALL_DISMISSED_KEY);
    return false;
  }

  return true;
}

function persistInstallDismiss(ttl = INSTALL_DISMISS_TTL) {
  window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now() + ttl));
}

function readVisitCount() {
  const rawValue = window.localStorage.getItem(HOME_VISIT_COUNT_KEY);
  const count = Number(rawValue ?? "0");

  return Number.isFinite(count) ? count : 0;
}

function markInstallInterest() {
  window.localStorage.setItem(INSTALL_INTEREST_KEY, "1");
  window.dispatchEvent(new CustomEvent("torneo:pwa-interest"));
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
 * Background Sync is only an enhancement, so foreground sync still runs.
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if ("sync" in registration) {
    try {
      await (registration as ServiceWorkerRegistration & {
        sync: { register: (syncTag: string) => Promise<void> };
      }).sync.register(tag);
    } catch {
      // Foreground retries cover browsers or states where sync registration fails.
    }
  }
}

export function PwaRegistrar({ appVersion }: { appVersion: string }) {
  const pathname = usePathname();
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const shouldReloadOnControllerChangeRef = useRef(false);
  const autoUpdateInFlightRef = useRef(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(() =>
    typeof window === "undefined" ? false : readDismissedState(),
  );
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window === "undefined" ? false : isStandaloneMode(),
  );
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window === "undefined"
      ? false
      : (window.matchMedia?.("(max-width: 767px)").matches ?? false),
  );
  const [platform] = useState<Platform>(() =>
    typeof window === "undefined" ? "other" : detectPlatform(),
  );
  const [visitCount, setVisitCount] = useState(() =>
    typeof window === "undefined" ? 0 : readVisitCount(),
  );
  const [hasInstallInterest, setHasInstallInterest] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.localStorage.getItem(INSTALL_INTEREST_KEY) === "1",
  );
  const [forceInstallPrompt, setForceInstallPrompt] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  const requestUpdate = useCallback(() => {
    if (autoUpdateInFlightRef.current) {
      return;
    }

    autoUpdateInFlightRef.current = true;
    trackPwaEvent("update_applied");

    const waitingWorker = registrationRef.current?.waiting;

    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    shouldReloadOnControllerChangeRef.current = true;
    waitingWorker.postMessage({ type: "skip-waiting" });
  }, []);

  const syncToVersion = useCallback(async (nextVersion: string, reason: string) => {
    const normalizedVersion = nextVersion.trim();

    if (!normalizedVersion || normalizedVersion === appVersion) {
      return;
    }

    const reloadedForVersion = window.sessionStorage.getItem(AUTO_UPDATE_RELOAD_KEY);

    if (reloadedForVersion === normalizedVersion) {
      return;
    }

    trackPwaEvent("update_ready", {
      reason,
      currentVersion: appVersion,
      remoteVersion: normalizedVersion,
    });
    window.sessionStorage.setItem(AUTO_UPDATE_RELOAD_KEY, normalizedVersion);
    setUpdateReady(true);
    setUpdateDismissed(false);

    const registration = registrationRef.current;

    if (registration) {
      await registration.update().catch(() => {});

      if (registration.waiting) {
        requestUpdate();
        return;
      }
    }

    shouldReloadOnControllerChangeRef.current = true;
    window.location.reload();
  }, [appVersion, requestUpdate]);

  const autoApplyUpdate = useCallback((reason: "waiting" | "installed") => {
    setUpdateReady(true);
    setUpdateDismissed(false);
    trackPwaEvent("update_ready", { reason });

    if (document.visibilityState !== "visible") {
      return;
    }

    window.setTimeout(() => {
      requestUpdate();
    }, 650);
  }, [requestUpdate]);

  const checkDeploymentVersion = useCallback(async () => {
    try {
      const response = await fetch("/api/version", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { version?: string };
      const remoteVersion = payload.version?.trim();

      if (!remoteVersion || remoteVersion === appVersion) {
        return;
      }
      await syncToVersion(remoteVersion, "remote-version");
    } catch {
      // Version checks are best-effort.
    }
  }, [appVersion, syncToVersion]);

  useEffect(() => {
    const handleVisitCountUpdate = (event: Event) => {
      const nextCount = (event as CustomEvent<number>).detail;
      setVisitCount(typeof nextCount === "number" ? nextCount : readVisitCount());
    };

    window.addEventListener("torneo:visit-count", handleVisitCountUpdate);

    return () => {
      window.removeEventListener("torneo:visit-count", handleVisitCountUpdate);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const nextCount = Number(window.localStorage.getItem(HOME_VISIT_COUNT_KEY) ?? "0") + 1;
    window.localStorage.setItem(HOME_VISIT_COUNT_KEY, String(nextCount));
    window.dispatchEvent(new CustomEvent("torneo:visit-count", { detail: nextCount }));
  }, [pathname]);

  useEffect(() => {
    if (window.sessionStorage.getItem(AUTO_UPDATE_RELOAD_KEY) === appVersion) {
      window.sessionStorage.removeItem(AUTO_UPDATE_RELOAD_KEY);
    }
  }, [appVersion]);

  useEffect(() => {
    if (!window.matchMedia) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateViewportState = () => {
      setIsMobileViewport(mobileQuery.matches);
      setIsStandalone(
        standaloneQuery.matches ||
          Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
      );
    };

    updateViewportState();
    mobileQuery.addEventListener("change", updateViewportState);
    standaloneQuery.addEventListener("change", updateViewportState);

    return () => {
      mobileQuery.removeEventListener("change", updateViewportState);
      standaloneQuery.removeEventListener("change", updateViewportState);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/" || isStandalone) {
      return;
    }

    const handleScroll = () => {
      if (window.scrollY >= INSTALL_SCROLL_THRESHOLD) {
        markInstallInterest();
      }
    };

    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-pwa-value-signal]")) {
        markInstallInterest();
      }
    };

    const handleInterest = () => {
      setHasInstallInterest(true);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClick);
    window.addEventListener("torneo:pwa-interest", handleInterest);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      window.removeEventListener("torneo:pwa-interest", handleInterest);
    };
  }, [isStandalone, pathname]);

  useEffect(() => {
    const handleOpenInstallPrompt = () => {
      window.localStorage.removeItem(INSTALL_DISMISSED_KEY);
      markInstallInterest();
      setInstallDismissed(false);
      setHasInstallInterest(true);
      setForceInstallPrompt(true);
      trackPwaEvent("install_prompt_shown", {
        platform,
        direct: Boolean(installEvent),
        source: "menu",
      });
    };

    window.addEventListener(OPEN_INSTALL_PROMPT_EVENT, handleOpenInstallPrompt);

    return () => {
      window.removeEventListener(OPEN_INSTALL_PROMPT_EVENT, handleOpenInstallPrompt);
    };
  }, [installEvent, platform]);

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
    const handleAppInstalled = () => {
      setInstallEvent(null);
      setForceInstallPrompt(false);
      persistInstallDismiss(INSTALL_DISMISS_TTL);
      setInstallDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const handleControllerChange = () => {
      if (
        !shouldReloadOnControllerChangeRef.current &&
        window.sessionStorage.getItem(AUTO_UPDATE_RELOAD_KEY) !== appVersion
      ) {
        shouldReloadOnControllerChangeRef.current = true;
      }

      if (!shouldReloadOnControllerChangeRef.current) {
        return;
      }

      shouldReloadOnControllerChangeRef.current = false;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    const handleServiceWorkerMessage = (event: MessageEvent<{ type?: string; version?: string }>) => {
      if (event.data?.type !== SW_UPDATE_READY) {
        return;
      }

      if (event.data.version && event.data.version !== appVersion) {
        void syncToVersion(event.data.version, "service-worker-message");
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(appVersion)}`, { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        registrationRef.current = registration;
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
              autoApplyUpdate("installed");
            }
          });
        };

        registration.addEventListener("updatefound", onUpdateFound);
        window.addEventListener("focus", refreshRegistration);
        document.addEventListener("visibilitychange", refreshRegistration);

        if (registration.waiting) {
          autoApplyUpdate("waiting");
        }

        const intervalId = window.setInterval(refreshRegistration, 60_000);
        const versionCheckId = window.setInterval(() => {
          void checkDeploymentVersion();
        }, 60_000);

        registrationCleanup = () => {
          registration.removeEventListener("updatefound", onUpdateFound);
          window.removeEventListener("focus", refreshRegistration);
          document.removeEventListener("visibilitychange", refreshRegistration);
          window.clearInterval(intervalId);
          window.clearInterval(versionCheckId);
          if (registrationRef.current === registration) {
            registrationRef.current = null;
          }
        };
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      registrationCleanup?.();
    };
  }, [appVersion, autoApplyUpdate, checkDeploymentVersion, syncToVersion]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleRefreshTriggers = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void checkDeploymentVersion();
    };

    window.addEventListener("focus", handleRefreshTriggers);
    document.addEventListener("visibilitychange", handleRefreshTriggers);

    const initialCheckId = window.setTimeout(() => {
      void checkDeploymentVersion();
    }, 0);

    return () => {
      window.clearTimeout(initialCheckId);
      window.removeEventListener("focus", handleRefreshTriggers);
      document.removeEventListener("visibilitychange", handleRefreshTriggers);
    };
  }, [checkDeploymentVersion]);

  const canExplainInstall =
    Boolean(installEvent) || platform === "ios-safari" || platform === "ios-other" || platform === "android";
  const shouldShowInstallPrompt =
    (pathname === "/" || forceInstallPrompt) &&
    !installDismissed &&
    !isStandalone &&
    isMobileViewport &&
    (forceInstallPrompt || visitCount >= 2 || hasInstallInterest) &&
    canExplainInstall;

  const isDirectInstall = Boolean(installEvent);
  const isIosInstall = platform === "ios-safari" || platform === "ios-other";

  const title = isDirectInstall
    ? "Instala la app del torneo"
    : isIosInstall
      ? "Guarda la app en tu inicio"
      : "Instala la app del torneo";

  const description = isDirectInstall
    ? "Ábrela como app y entra más rápido a la jornada."
    : platform === "ios-safari"
      ? "En iPhone o iPad se instala desde Safari."
      : platform === "ios-other"
        ? "Ábrela en Safari para añadirla a pantalla de inicio."
        : "Si no ves el botón directo, instálala desde el menú del navegador.";

  useEffect(() => {
    if (shouldShowInstallPrompt) {
      trackPwaEvent("install_prompt_shown", {
        platform,
        direct: Boolean(installEvent),
      });
    }
  }, [installEvent, platform, shouldShowInstallPrompt]);

  const dismissInstallPrompt = (ttl = INSTALL_DISMISS_TTL) => {
    persistInstallDismiss(ttl);
    setInstallDismissed(true);
    setForceInstallPrompt(false);
    trackPwaEvent("install_prompt_dismissed", { platform, ttl });
  };

  return (
    <>
      {shouldShowInstallPrompt ? (
        <div className="fixed inset-x-3 bottom-[max(0.8rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-[22rem] rounded-[1.25rem] border border-[var(--line)] bg-[color:rgba(247,239,223,0.96)] p-3 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">
                App del torneo
              </p>
              <p className="mt-1 text-[0.95rem] leading-5 text-[var(--ink)]">
                {title}
              </p>
              <p className="mt-1 text-[0.85rem] leading-5 text-[var(--muted)]">
                {description}
              </p>
            </div>
            <button
              aria-label="Cerrar aviso de instalacion"
              className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)] transition hover:text-[var(--ink)]"
              type="button"
              onClick={() => dismissInstallPrompt()}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isDirectInstall ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                className="action-button action-button--signal min-h-10 flex-1 px-4 py-2.5 text-[0.78rem]"
                type="button"
                onClick={async () => {
                  if (!installEvent) {
                    return;
                  }

                  await installEvent.prompt();
                  const choice = await installEvent.userChoice.catch(() => null);
                  setInstallEvent(null);
                  setForceInstallPrompt(false);

                  if (choice?.outcome === "accepted") {
                    trackPwaEvent("install_prompt_accepted", { platform });
                  } else {
                    dismissInstallPrompt(SHORT_INSTALL_DISMISS_TTL);
                  }
                }}
              >
                Instalar app
              </button>
              <button
                className="rounded-full border border-[var(--line)] px-3 py-2 text-[0.86rem] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                type="button"
                onClick={() => dismissInstallPrompt(SHORT_INSTALL_DISMISS_TTL)}
              >
                Ahora no
              </button>
            </div>
          ) : (
            <div className="mt-3 grid gap-2">
              {platform === "ios-safari" ? (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-[0.82rem] text-[var(--ink)]">
                    1. Toca <span className="font-semibold">Compartir</span> <Share2 className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-[0.82rem] text-[var(--ink)]">
                    2. Elige <span className="font-semibold">Añadir a pantalla de inicio</span>.
                  </div>
                </>
              ) : platform === "ios-other" ? (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-[0.82rem] text-[var(--ink)]">
                    1. Abre esta página en <span className="font-semibold">Safari</span>.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-[0.82rem] text-[var(--ink)]">
                    2. Usa <span className="font-semibold">Compartir</span> y añade la app al inicio.
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-[0.82rem] text-[var(--ink)]">
                    1. Abre el menú del navegador <Ellipsis className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />.
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-white/55 px-3 py-2 text-[0.82rem] text-[var(--ink)]">
                    2. Toca <span className="font-semibold">Instalar app</span> o <span className="font-semibold">Añadir a pantalla de inicio</span>.
                  </div>
                </>
              )}

              <button
                className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-[0.86rem] font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                type="button"
                onClick={() => dismissInstallPrompt()}
              >
                <Smartphone className="h-4 w-4" />
                Entendido
              </button>
            </div>
          )}
        </div>
      ) : null}

      {updateReady && !updateDismissed ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-[1.4rem] border border-[var(--line)] bg-[color:rgba(23,19,17,0.96)] p-4 text-white shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--signal-soft)]">
                Nueva version disponible
              </p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Hay una actualización lista. Pulsa actualizar para recargar la app con la última versión.
              </p>
            </div>
            <button
              aria-label="Cerrar aviso de actualización"
              className="rounded-full border border-white/10 p-1.5 text-white/60 transition hover:text-white"
              type="button"
              onClick={() => setUpdateDismissed(true)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              className="action-button action-button--signal min-h-10 flex-1 px-4 py-2.5 text-[0.8rem]"
              type="button"
              onClick={requestUpdate}
            >
              Actualizar ahora
            </button>
            <button
              className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
              type="button"
              onClick={() => setUpdateDismissed(true)}
            >
              Más tarde
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
