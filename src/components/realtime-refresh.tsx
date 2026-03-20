"use client";

import { startTransition, useEffect, useEffectEvent, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type RealtimeRefreshProps = {
  channelName: string;
  tables: string[];
};

type RealtimeRow = Record<string, unknown>;

function getRealtimeRow(payload: { new: RealtimeRow; old: RealtimeRow }) {
  if (payload.new && Object.keys(payload.new).length > 0) {
    return payload.new;
  }

  if (payload.old && Object.keys(payload.old).length > 0) {
    return payload.old;
  }

  return null;
}

function pathContext(pathname: string) {
  if (pathname === "/app") return { kind: "staff-home" as const };
  if (pathname === "/app/partidos") return { kind: "staff-matches" as const };
  if (pathname === "/app/equipos") return { kind: "staff-teams" as const };
  if (pathname.startsWith("/app/partido/")) {
    return {
      kind: "staff-match" as const,
      matchId: pathname.split("/").at(-1) ?? null,
    };
  }
  if (pathname.startsWith("/app/equipo/")) {
    return {
      kind: "staff-team" as const,
      teamId: pathname.split("/").at(-1) ?? null,
    };
  }

  return { kind: "other" as const };
}

function rowTouchesTeam(row: RealtimeRow | null, teamId: string | null) {
  if (!row || !teamId) {
    return false;
  }

  return (
    row.team_id === teamId ||
    row.home_team_id === teamId ||
    row.away_team_id === teamId ||
    row.winner_team_id === teamId
  );
}

function rowTouchesMatch(row: RealtimeRow | null, matchId: string | null) {
  if (!row || !matchId) {
    return false;
  }

  return row.id === matchId || row.match_id === matchId || row.category_match_id === matchId || row.bracket_match_id === matchId;
}

function shouldRefreshRoute(input: {
  pathname: string;
  searchParams: Pick<URLSearchParams, "get">;
  table: string;
  row: RealtimeRow | null;
}) {
  if (!input.pathname.startsWith("/app/")) {
    return true;
  }

  const context = pathContext(input.pathname);

  if (context.kind === "staff-home") {
    return ["category_matches", "bracket_matches", "team_checkins", "staff_assignments", "category_brackets"].includes(
      input.table,
    );
  }

  if (context.kind === "staff-matches") {
    return ["category_matches", "bracket_matches", "staff_assignments", "category_brackets"].includes(
      input.table,
    );
  }

  if (context.kind === "staff-teams") {
    return ["category_matches", "bracket_matches", "team_checkins", "staff_assignments"].includes(
      input.table,
    );
  }

  if (context.kind === "staff-match") {
    const scope = input.searchParams.get("scope");

    if (input.table === "team_checkins" || input.table === "staff_assignments") {
      return rowTouchesMatch(input.row, context.matchId) || input.table === "staff_assignments";
    }

    if (scope === "category_match") {
      return input.table === "category_matches" && rowTouchesMatch(input.row, context.matchId);
    }

    if (scope === "bracket_match") {
      return (
        (input.table === "bracket_matches" && rowTouchesMatch(input.row, context.matchId)) ||
        input.table === "category_brackets"
      );
    }

    return false;
  }

  if (context.kind === "staff-team") {
    if (input.table === "staff_assignments") {
      return true;
    }

    return rowTouchesTeam(input.row, context.teamId);
  }

  return true;
}

export function RealtimeRefresh({ channelName, tables }: RealtimeRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pendingRefreshRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useEffectEvent((reason: "realtime" | "resume") => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      pendingRefreshRef.current = true;
      return;
    }

    pendingRefreshRef.current = false;

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const now = Date.now();
    const elapsed = now - lastRefreshAtRef.current;
    const baseDelay = reason === "resume" ? 90 : 260;
    const cooldownDelay = elapsed >= 1200 ? 0 : 1200 - elapsed;
    const delay = Math.max(baseDelay, cooldownDelay);

    refreshTimeoutRef.current = setTimeout(() => {
      lastRefreshAtRef.current = Date.now();
      startTransition(() => {
        router.refresh();
      });
    }, delay);
  });

  const handleRealtimeChange = useEffectEvent((table: string, payload: { new: RealtimeRow; old: RealtimeRow }) => {
    if (
      !shouldRefreshRoute({
        pathname,
        searchParams,
        table,
        row: getRealtimeRow(payload),
      })
    ) {
      return;
    }

    scheduleRefresh("realtime");
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(channelName);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          handleRealtimeChange(table, payload as { new: RealtimeRow; old: RealtimeRow });
        },
      );
    }

    channel.subscribe();

    const flushPendingRefresh = () => {
      if (pendingRefreshRef.current) {
        scheduleRefresh("resume");
      }
    };

    window.addEventListener("focus", flushPendingRefresh);
    document.addEventListener("visibilitychange", flushPendingRefresh);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      window.removeEventListener("focus", flushPendingRefresh);
      document.removeEventListener("visibilitychange", flushPendingRefresh);
      void supabase.removeChannel(channel);
    };
  }, [channelName, tables]);

  return null;
}
