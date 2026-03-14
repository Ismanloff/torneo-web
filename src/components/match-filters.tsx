"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type FilterTab = "hoy" | "proximos" | "todos";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "proximos", label: "Proximos" },
  { key: "todos", label: "Todos" },
];

type MatchItem = {
  scope: string;
  matchId: string;
  categoryName: string;
  location: string | null;
  scheduledAt: string | null;
  status: string;
  homeTeamName: string;
  awayTeamName: string;
  duty: string;
};

export function MatchFilters({ matches }: { matches: MatchItem[] }) {
  const [active, setActive] = useState<FilterTab>("hoy");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const filtered = matches.filter((m) => {
    if (active === "todos") return true;

    if (!m.scheduledAt) return active === "proximos";

    const d = new Date(m.scheduledAt);

    if (active === "hoy") {
      return d >= todayStart && d < todayEnd;
    }

    // "proximos" — today onwards, not completed
    return d >= todayStart && m.status !== "completed";
  });

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <>
      <div
        className="inline-grid grid-cols-3 gap-2 rounded-[1.25rem] border border-[var(--app-line)] bg-white/[0.035] p-2"
        role="tablist"
        aria-label="Filtro de partidos"
      >
        {TABS.map((tab, index) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => { tabRefs.current[index] = el; }}
              id={`match-tab-${tab.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls="match-tabpanel"
              tabIndex={isActive ? 0 : -1}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[var(--app-accent-soft)] text-white shadow-[inset_0_0_0_1px_rgba(141,246,95,0.15)]"
                  : "text-[var(--app-muted)] hover:bg-white/[0.04]"
              }`}
              type="button"
              onClick={() => setActive(tab.key)}
              onKeyDown={(e) => {
                let next = index;
                if (e.key === "ArrowRight") {
                  next = (index + 1) % TABS.length;
                } else if (e.key === "ArrowLeft") {
                  next = (index - 1 + TABS.length) % TABS.length;
                } else if (e.key === "Home") {
                  next = 0;
                } else if (e.key === "End") {
                  next = TABS.length - 1;
                } else {
                  return;
                }
                e.preventDefault();
                setActive(TABS[next].key);
                tabRefs.current[next]?.focus();
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3" role="tabpanel" id="match-tabpanel" aria-labelledby={`match-tab-${active}`}>
        {filtered.length ? (
          filtered.map((match, index) => (
            <Link
              key={`${match.scope}:${match.matchId}`}
              className="flex items-center justify-between gap-4 rounded-[1.55rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-4 transition hover:bg-white/[0.05]"
              href={`/app/partido/${match.matchId}?scope=${match.scope}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="app-metric__label">
                    Bloque {String(index + 1).padStart(2, "0")}
                  </p>
                  <span className="text-xs text-[var(--app-muted)]">{match.duty}</span>
                </div>
                <p className="mt-2 truncate text-lg font-semibold text-white">
                  {match.homeTeamName} vs {match.awayTeamName}
                </p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {match.categoryName} · {match.location ?? "Sin pista"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-white">
                    {match.scheduledAt
                      ? formatDateTime(match.scheduledAt)
                      : "Sin fecha"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--app-muted)]">
                    {match.status}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--app-muted)]" />
              </div>
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-[1.6rem] border border-dashed border-[var(--app-line)] bg-white/[0.02] py-10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--app-muted)]" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <p className="text-sm font-medium text-[var(--app-muted)]">No hay partidos en este filtro.</p>
            <p className="text-xs text-[var(--app-muted)]/60">Los partidos apareceran aqui cuando se programen</p>
          </div>
        )}
      </div>
    </>
  );
}
