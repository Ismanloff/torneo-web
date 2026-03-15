import type { ScoreboardCategory } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type BracketTreeProps = {
  category: ScoreboardCategory;
};

export function BracketTree({ category }: BracketTreeProps) {
  if (!category.bracket) {
    return (
      <div className="public-soft px-4 py-6 text-sm text-[#8fa1c2]">
        Todavía no hay cuadro eliminatorio generado para esta categoría.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-4 pb-2">
        {category.bracket.rounds.map(({ round, matches }) => (
          <section key={round.id} className="w-72 shrink-0">
            <div className="mb-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#8fa1c2]">
              {round.name}
            </div>
            <div className="grid gap-4">
              {matches.map((match) => (
                <article
                  key={match.id}
                  className="public-soft px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8fa1c2]">
                      Cruce {match.match_number}
                    </p>
                    <span className="text-xs uppercase tracking-[0.16em] text-[var(--app-accent)]">
                      {match.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                      <div>
                        <p className="font-semibold text-white">{match.home_team?.team_name ?? "Pendiente"}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                          {match.home_team?.registration_code || ""}
                        </p>
                      </div>
                      <strong className="text-[var(--app-accent)]">{match.home_score ?? "-"}</strong>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/10 px-3 py-3">
                      <div>
                        <p className="font-semibold text-white">{match.away_team?.team_name ?? "Pendiente"}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                          {match.away_team?.registration_code || ""}
                        </p>
                      </div>
                      <strong className="text-[var(--app-accent)]">{match.away_score ?? "-"}</strong>
                    </div>
                  </div>

                  {match.winner_team ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--app-accent)]">
                      Clasifica: {match.winner_team.team_name}
                    </p>
                  ) : null}

                  <p className="mt-3 text-sm text-[#9fb3d9]">
                    {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"} ·{" "}
                    {match.location || "Sin pista"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
