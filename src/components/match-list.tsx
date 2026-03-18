import { formatDateTime } from "@/lib/utils";
import { EmptyStatePanel, StatusPill } from "@/components/surface-primitives";
import type { ScoreboardCategory } from "@/lib/types";

type MatchListProps = {
  category: ScoreboardCategory;
};

function getStatusLabel(status: string) {
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  return "Programado";
}

export function MatchList({ category }: MatchListProps) {
  return (
    <div className="data-list">
      {category.matches.length ? (
        category.matches.map((match) => (
          <article
            key={match.id}
            className="row-surface public-row-link px-4 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#b8c3b2]">
                  {match.round_label || "Partido"}
                </p>
                <p className="mt-1 text-sm text-[#b7c2b0]">
                  {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"} ·{" "}
                  {match.location || "Sin pista"}
                </p>
              </div>
              <StatusPill tone={match.status === "completed" ? "success" : "muted"}>
                {getStatusLabel(match.status)}
              </StatusPill>
            </div>

            <div className="mt-4 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
              <div>
                <p className="font-semibold text-white">{match.home_team.team_name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                  {match.home_team.registration_code}
                </p>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl leading-none text-[var(--app-accent)]">
                  {match.home_score ?? "-"} : {match.away_score ?? "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">{match.away_team.team_name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                  {match.away_team.registration_code}
                </p>
              </div>
            </div>

            {match.notes ? (
              <p className="mt-3 text-sm leading-6 text-[#b7c2b0]">{match.notes}</p>
            ) : null}
          </article>
        ))
      ) : (
        <EmptyStatePanel
          compact
          eyebrow="Calendario"
          title="Todavía no hay partidos programados"
          description="La categoría aparecerá aquí en cuanto la organización publique el calendario."
        />
      )}
    </div>
  );
}
