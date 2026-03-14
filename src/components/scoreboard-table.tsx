import Link from "next/link";

import { ExportPdfButton } from "@/components/export-pdf-button";
import type { ScoreboardCategory } from "@/lib/types";

type ScoreboardTableProps = {
  category: ScoreboardCategory;
  compact?: boolean;
  showHeader?: boolean;
};

export function ScoreboardTable({ category, compact = false, showHeader = true }: ScoreboardTableProps) {
  const rows = compact ? category.standings.slice(0, 5) : category.standings;

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
            <ExportPdfButton
              categoryName={category.category.name}
              sport={category.category.sport}
              standings={category.standings}
            />
            <Link
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--app-accent)]"
              href={`/clasificacion/${category.category.id}`}
            >
              Ver detalle
            </Link>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[0.72rem] uppercase tracking-[0.18em] text-[#8fa1c2]">
            <tr>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-4 py-3 text-center">Pts</th>
              <th className="px-4 py-3 text-center">PJ</th>
              <th className="px-4 py-3 text-center">G</th>
              <th className="px-4 py-3 text-center">E</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">DG</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.team_id} className="border-t border-white/8">
                  <td className="px-4 py-3 font-semibold text-white">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{row.team_name}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                      {row.registration_code}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-[var(--app-accent)]">{row.total_points}</td>
                  <td className="px-4 py-3 text-center text-[#d6e1f3]">{row.played}</td>
                  <td className="px-4 py-3 text-center text-[#d6e1f3]">{row.wins}</td>
                  <td className="px-4 py-3 text-center text-[#d6e1f3]">{row.draws}</td>
                  <td className="px-4 py-3 text-center text-[#d6e1f3]">{row.losses}</td>
                  <td className="px-4 py-3 text-center text-[#d6e1f3]">{row.goal_difference}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-[#8fa1c2]" colSpan={8}>
                  Las inscripciones estan abiertas. Los equipos apareceran aqui en cuanto se registren.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
