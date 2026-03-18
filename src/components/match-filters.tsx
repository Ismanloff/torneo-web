"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { EmptyStatePanel, StatusPill } from "@/components/surface-primitives";

type FilterTab = "hoy" | "proximos" | "todos";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "proximos", label: "Próximos" },
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

function statusTone(status: string) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "accent";
  return "muted";
}

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
              className="data-row row-surface app-row-link"
              href={`/app/partido/${match.matchId}?scope=${match.scope}`}
            >
              <div className="data-row__main">
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
                  <div className="mt-2 flex justify-end">
                    <StatusPill tone={statusTone(match.status) as "success" | "accent" | "muted"}>
                      {match.status}
                    </StatusPill>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--app-muted)]" />
              </div>
            </Link>
          ))
        ) : (
          <EmptyStatePanel
            eyebrow="Agenda"
            title="No hay partidos en este filtro"
            description="Los partidos aparecerán aquí en cuanto se programen o entren en tu vista operativa."
          />
        )}
      </div>
    </>
  );
}
