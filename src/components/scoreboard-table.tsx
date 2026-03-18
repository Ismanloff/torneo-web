import Link from "next/link";

import { ExportPdfButton } from "@/components/export-pdf-button";
import type { CategoryStandingRow, ScoreboardCategory } from "@/lib/types";

type ScoreboardTableProps = {
  category: ScoreboardCategory;
  compact?: boolean;
  showHeader?: boolean;
};

function StandingsTable({
  category,
  rows,
  compact,
}: {
  category: ScoreboardCategory;
  rows: CategoryStandingRow[];
  compact: boolean;
}) {
  const visibleRows = compact ? rows.slice(0, 5) : rows;
  const arrivalByTeamId = new Map(
    category.teams.map((team) => [team.id, Boolean(team.checked_in_at)]),
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-[0.72rem] uppercase tracking-[0.18em] text-[#8fa1c2]">
          <tr>
            <th className="px-4 py-3">Pos</th>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-4 py-3 text-center">Pts</th>
            <th className="px-4 py-3 text-center">Dif</th>
            <th className="px-4 py-3 text-center">PJ</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.length ? (
            visibleRows.map((row, index) => (
              <tr key={row.team_id} className="border-t border-white/8">
                <td className="px-4 py-3 font-semibold text-white">{index + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{row.team_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                      {row.registration_code}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${
                        arrivalByTeamId.get(row.team_id)
                          ? "border-[rgba(141,246,95,0.18)] bg-[rgba(141,246,95,0.12)] text-[#d8ffc7]"
                          : "border-white/10 bg-white/[0.04] text-[#9fb3d9]"
                      }`}
                    >
                      {arrivalByTeamId.get(row.team_id) ? "Llegado" : "Pendiente"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-[var(--app-accent)]">
                  {row.total_points}
                </td>
                <td className="px-4 py-3 text-center text-[#d6e1f3]">
                  {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                </td>
                <td className="px-4 py-3 text-center text-[#d6e1f3]">{row.played}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-[#8fa1c2]" colSpan={5}>
                Las inscripciones están abiertas. Los equipos aparecerán aquí en cuanto se registren.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ScoreboardTable({
  category,
  compact = false,
  showHeader = true,
}: ScoreboardTableProps) {
  const hasGroups = category.groupStandings.length > 0;

  return (
    <div className="public-scoreboard">
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <p className="text-lg font-semibold text-white">{category.category.name}</p>
            <p className="text-sm text-[#9fb3d9]">
              {category.category.sport} · {category.category.age_group} · {category.category.school}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!hasGroups ? (
              <ExportPdfButton
                categoryName={category.category.name}
                sport={category.category.sport}
                standings={category.standings}
              />
            ) : null}
            <Link
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-accent)]"
              href={`/clasificacion/${category.category.id}`}
            >
              Ver detalle
            </Link>
          </div>
        </div>
      ) : null}

      {hasGroups ? (
        <div className="grid gap-5 p-4 sm:p-5">
          {category.groupStandings.map((group) => (
            <section
              key={group.groupLabel}
              className="rounded-[1.2rem] border border-white/8 bg-white/[0.02]"
            >
              <div className="border-b border-white/8 px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--app-accent)]">
                  Grupo {group.groupLabel}
                </p>
              </div>
              <StandingsTable category={category} compact={compact} rows={group.standings} />
            </section>
          ))}
        </div>
      ) : (
        <StandingsTable category={category} compact={compact} rows={category.standings} />
      )}
    </div>
  );
}
