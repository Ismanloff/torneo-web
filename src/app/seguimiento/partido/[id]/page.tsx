import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicPageShell } from "@/components/public-page-shell";
import { getPublicMatchByToken } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

type PublicMatchPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token?: string;
    scope?: "category_match" | "bracket_match";
  }>;
};

function checkinLabel(status: string | null | undefined) {
  if (status === "presentado") return "Presentado";
  if (status === "incidencia") return "Incidencia";
  if (status === "no_presentado") return "No presentado";
  return "Pendiente";
}

export default async function PublicMatchPage({ params, searchParams }: PublicMatchPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  if (!query.token || !query.scope) {
    notFound();
  }

  const detail = await getPublicMatchByToken({
    token: query.token,
    matchId: id,
    scope: query.scope,
  });

  if (!detail) {
    notFound();
  }

  return (
    <PublicPageShell
      eyebrow="Seguimiento publico"
      title={`${detail.match.home_team?.team_name ?? "Pendiente"} vs ${detail.match.away_team?.team_name ?? "Pendiente"}`}
      description={`${detail.category.category.name} · ${detail.match.location ?? "Sin pista"} · ${detail.match.scheduled_at ? formatDateTime(detail.match.scheduled_at) : "Sin fecha"}`}
      backHref={`/clasificacion/${detail.category.category.id}`}
      backLabel="Volver a clasificacion"
      actions={
        <div className="grid gap-3">
          <div className="public-soft p-4 text-center">
            <p className="public-kicker">Marcador</p>
            <p className="public-title mt-4 text-6xl text-[var(--app-accent)]">
              {detail.match.home_score ?? "-"}:{detail.match.away_score ?? "-"}
            </p>
            <p className="mt-3 text-sm text-[#a8b7d2]">Estado: {detail.match.status}</p>
          </div>
          <Link className="public-action public-action--ghost" href="/login">
            Acceso organizacion
          </Link>
        </div>
      }
    >
      <section className="grid gap-6 lg:grid-cols-2">
        {[detail.match.home_team, detail.match.away_team].map((team, index) => {
          const checkin = index === 0 ? detail.match.home_checkin : detail.match.away_checkin;

          return (
            <article key={team?.id ?? index} className="public-glass p-5 sm:p-6">
              <p className="public-kicker">{index === 0 ? "Equipo local" : "Equipo visitante"}</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">{team?.team_name ?? "Pendiente"}</h2>
              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-[#8fa1c2]">
                {team?.registration_code ?? "Sin codigo"}
              </p>
              <div className="public-soft mt-5 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">Check-in</p>
                <p className="mt-2 text-lg font-semibold text-white">{checkinLabel(checkin?.status)}</p>
              </div>
            </article>
          );
        })}
      </section>
    </PublicPageShell>
  );
}
