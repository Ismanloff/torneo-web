"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, RotateCcw } from "lucide-react";

const REFRESH_THRESHOLD = 88;

function isRefreshablePath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/clasificacion/") ||
    pathname.startsWith("/cuadro/") ||
    pathname.startsWith("/seguimiento/") ||
    pathname.startsWith("/app/")
  );
}

function isPullToRefreshEligible(pathname: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  const isMobileViewport = window.matchMedia?.("(max-width: 767px)").matches ?? false;

  return (isStandalone || isMobileViewport) && isRefreshablePath(pathname);
}

export function PullToRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [phase, setPhase] = useState<"idle" | "pulling" | "ready" | "refreshing">("idle");
  const [isPending, startTransition] = useTransition();
  const touchStartYRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    setEnabled(isPullToRefreshEligible(pathname));
  }, [pathname]);

  useEffect(() => {
    setPullDistance(0);
    setPhase("idle");
    touchStartYRef.current = null;
    isTrackingRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const getScrollTop = () =>
      document.scrollingElement?.scrollTop ??
      document.documentElement.scrollTop ??
      document.body.scrollTop ??
      0;

    const reset = () => {
      touchStartYRef.current = null;
      isTrackingRef.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
      setPhase("idle");
    };

    const triggerRefresh = () => {
      const now = Date.now();

      if (now - lastRefreshAtRef.current < 1200) {
        reset();
        return;
      }

      lastRefreshAtRef.current = now;
      setPhase("refreshing");
      setPullDistance(REFRESH_THRESHOLD);

      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      startTransition(() => {
        router.refresh();
      });

      window.setTimeout(reset, 850);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }

      if (getScrollTop() > 0) {
        reset();
        return;
      }

      touchStartYRef.current = event.touches[0].clientY;
      isTrackingRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isTrackingRef.current || touchStartYRef.current === null || event.touches.length !== 1) {
        return;
      }

      const delta = event.touches[0].clientY - touchStartYRef.current;

      if (delta <= 0 || getScrollTop() > 0) {
        reset();
        return;
      }

      event.preventDefault();

      const distance = Math.min(delta * 0.55, REFRESH_THRESHOLD * 1.35);
      pullDistanceRef.current = distance;
      setPullDistance(distance);
      setPhase(distance >= REFRESH_THRESHOLD ? "ready" : "pulling");
    };

    const onTouchEnd = () => {
      if (!isTrackingRef.current) {
        return;
      }

      if (pullDistanceRef.current >= REFRESH_THRESHOLD) {
        triggerRefresh();
        return;
      }

      reset();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, router, startTransition]);

  if (!enabled) {
    return null;
  }

  const visible = pullDistance > 0 || phase === "refreshing" || isPending;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-[calc(0.65rem+env(safe-area-inset-top))]"
    >
      <div
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(8,12,24,0.88)] px-4 py-2 text-xs font-semibold tracking-[0.12em] text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur"
        style={{
          opacity: visible ? 1 : 0,
          transform: `translateY(${visible ? Math.min(pullDistance * 0.18, 14) : -8}px) scale(${visible ? 1 : 0.96})`,
          transition: "opacity 160ms ease, transform 160ms ease",
        }}
      >
        {phase === "refreshing" || isPending ? (
          <>
            <RotateCcw className="h-3.5 w-3.5 animate-spin text-[var(--app-accent)]" />
            Actualizando
          </>
        ) : phase === "ready" ? (
          <>
            <ArrowDown className="h-3.5 w-3.5 text-[var(--app-accent)]" />
            Suelta para refrescar
          </>
        ) : (
          <>
            <ArrowDown className="h-3.5 w-3.5 text-[var(--app-accent)]" />
            Desliza para refrescar
          </>
        )}
      </div>
    </div>
  );
}
