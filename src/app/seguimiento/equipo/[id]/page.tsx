import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicPageShell } from "@/components/public-page-shell";
import { getPublicTeamByToken } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

type PublicTeamPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function PublicTeamPage({ params, searchParams }: PublicTeamPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  if (!query.token) {
    notFound();
  }

  const detail = await getPublicTeamByToken({
    token: query.token,
    teamId: id,
  });

  if (!detail) {
    notFound();
  }

  const visibleMatches = [...detail.categoryMatches, ...detail.bracketMatches].sort((left, right) => {
    const leftTime = left.scheduled_at ? new Date(left.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduled_at ? new Date(right.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });

  return (
    <PublicPageShell
      eyebrow="Equipo publico"
      title={detail.team.team_name}
      description={`${detail.category.name} · ${detail.team.registration_code}`}
      backHref="/"
      backLabel="Volver al portal"
      actions={
        <div className="grid gap-3">
          <div className="public-soft p-4">
            <p className="public-kicker">Datos</p>
            <div className="mt-3 grid gap-2 text-sm text-[#a8b7d2]">
              <p>Capitan: {detail.team.captain_name}</p>
              <p>Jugadores: {detail.team.total_players}</p>
              <p>Estado: {detail.team.status}</p>
            </div>
          </div>
          <Link className="public-action public-action--ghost" href="/login">
            Acceso organizacion
          </Link>
        </div>
      }
    >
      <section className="public-glass p-5 sm:p-6">
        <p className="public-kicker">Proximos partidos</p>
        <p className="mt-4 text-sm text-[#a8b7d2]">
          Enseña este QR en la entrada. La organizacion valida la llegada y puede abrir el partido
          correspondiente desde mesa si hace falta.
        </p>

        <div className="mt-5 grid gap-3">
          {visibleMatches.length ? (
            visibleMatches.map((match) => (
              <div key={match.id} className="public-soft p-4">
                <p className="font-semibold text-white">
                  {match.home_team?.team_name ?? "Pendiente"} vs {match.away_team?.team_name ?? "Pendiente"}
                </p>
                <p className="mt-2 text-sm text-[#a8b7d2]">
                  {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"} ·{" "}
                  {match.location ?? "Sin pista"}
                </p>
              </div>
            ))
          ) : (
            <div className="public-soft p-4 text-sm text-[#8fa1c2]">
              Todavia no hay partidos visibles para este equipo.
            </div>
          )}
        </div>
      </section>
    </PublicPageShell>
  );
}
