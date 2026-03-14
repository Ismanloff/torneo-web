"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

type MatchForCountdown = {
  id: string;
  scheduledAt: string | null;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  location: string | null;
  sport: string;
};

type MatchCountdownProps = {
  matches: MatchForCountdown[];
};

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function MatchCountdown({ matches }: MatchCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the next upcoming match (closest scheduledAt in the future, not completed)
  const upcomingMatches = matches
    .filter((m) => {
      if (!m.scheduledAt || m.status === "completed" || m.status === "cancelled") return false;
      const scheduledTime = new Date(m.scheduledAt).getTime();
      // Only show if match hasn't started (give 2 min grace after scheduled time)
      return scheduledTime > now - 2 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  const nextMatch = upcomingMatches[0];

  if (!nextMatch || !nextMatch.scheduledAt) return null;

  const scheduledTime = new Date(nextMatch.scheduledAt).getTime();
  const diff = scheduledTime - now;

  // Hide if more than 30 minutes away
  const thirtyMinutes = 30 * 60 * 1000;
  if (diff > thirtyMinutes) return null;

  // Hide if match already started (past scheduled time by > 2 min)
  if (diff < -2 * 60 * 1000) return null;

  const fiveMinutes = 5 * 60 * 1000;
  const isUrgent = diff > 0 && diff < fiveMinutes;
  const hasStarted = diff <= 0;

  return (
    <div
      className={`
        sticky z-20 border-b border-[rgba(141,246,95,0.2)]
        ${isUrgent ? "animate-pulse" : ""}
      `}
      style={{
        top: "4.5rem",
        background: hasStarted
          ? "linear-gradient(135deg, rgba(246,185,59,0.12) 0%, rgba(246,185,59,0.04) 100%)"
          : "linear-gradient(135deg, rgba(141,246,95,0.1) 0%, rgba(84,209,43,0.04) 100%)",
      }}
    >
      <div className="public-wrap">
        <div className="flex flex-wrap items-center gap-3 py-3 sm:gap-4">
          <Zap
            className={`h-4 w-4 shrink-0 ${hasStarted ? "text-yellow-400" : "text-[var(--app-accent)]"}`}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-white uppercase tracking-[0.12em] text-xs">
              {hasStarted ? "EN JUEGO" : "PROXIMO"}:
            </span>
            <span className="font-semibold text-white">
              {nextMatch.homeTeamName} vs {nextMatch.awayTeamName}
            </span>
            <span className="text-[#9fb3d9]">
              {hasStarted ? (
                "comenzando ahora"
              ) : (
                <>en {formatCountdown(diff)}</>
              )}
              {nextMatch.location ? ` · ${nextMatch.location}` : ""}
              {` · ${nextMatch.sport}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
