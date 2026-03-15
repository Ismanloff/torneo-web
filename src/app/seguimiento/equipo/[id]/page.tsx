import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, QrCode, ShieldCheck } from "lucide-react";

import { PublicPageShell } from "@/components/public-page-shell";
import { QrTile } from "@/components/qr-tile";
import {
  TOURNAMENT_EVENT_DATE_LABEL,
  TOURNAMENT_EVENT_START_LABEL,
  TOURNAMENT_EVENT_VENUE,
  TOURNAMENT_EVENT_WINDOW_LABEL,
} from "@/lib/branding";
import { getPublicTeamByToken } from "@/lib/supabase/queries";
import { buildQrShareUrl, formatDateTime } from "@/lib/utils";

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
  const teamQrUrl = buildQrShareUrl(detail.qrTarget.token);

  return (
    <PublicPageShell
      eyebrow="Panel privado del equipo"
      title={detail.team.team_name}
      description={`${detail.category.name} · ${detail.team.registration_code}`}
      backHref="/"
      backLabel="Volver al portal"
      actions={
        <div className="grid gap-3">
          <div className="public-soft p-4">
            <p className="public-kicker">Acceso reservado</p>
            <p className="mt-3 text-lg font-semibold text-white">Enlace único del equipo</p>
            <p className="mt-2 text-sm leading-6 text-[#a8b7d2]">
              Este panel está vinculado al token enviado por correo y solo sirve para esta
              inscripción.
            </p>
          </div>

          <div className="public-soft p-4">
            <p className="public-kicker">Responsable</p>
            <p className="mt-3 text-lg font-semibold text-white">{detail.team.captain_name}</p>
            <p className="mt-2 text-sm text-[#a8b7d2]">{detail.team.captain_email}</p>
          </div>
        </div>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="public-glass p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="public-kicker">Resumen de acceso</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="public-soft p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">Colegio asignado</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {detail.category.school ?? "Por confirmar"}
              </p>
              <p className="mt-2 text-sm text-[#a8b7d2]">{detail.category.age_group}</p>
            </div>

            <div className="public-soft p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">Estado interno</p>
              <p className="mt-3 text-2xl font-semibold text-white">{detail.team.status}</p>
              <p className="mt-2 text-sm text-[#a8b7d2]">
                {detail.team.total_players} jugadores declarados
              </p>
            </div>

            <div className="public-soft p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--app-accent)]" />
                <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">Horario del torneo</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">
                {TOURNAMENT_EVENT_DATE_LABEL} · {TOURNAMENT_EVENT_START_LABEL}
              </p>
              <p className="mt-2 text-sm text-[#a8b7d2]">{TOURNAMENT_EVENT_WINDOW_LABEL}</p>
            </div>

            <div className="public-soft p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--app-accent)]" />
                <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">Lugar</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{TOURNAMENT_EVENT_VENUE}</p>
              <p className="mt-2 text-sm text-[#a8b7d2]">
                Presenta el equipo completo en acreditación.
              </p>
            </div>
          </div>
        </article>

        <article className="public-glass p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="public-kicker">QR de validación</p>
          </div>
          <QrTile
            href={teamQrUrl}
            label="QR oficial del equipo"
            note="La mesa lo escaneará el día del torneo para validar la llegada y habilitar el acceso a juego."
            variant="public"
          />
        </article>
      </section>

      <section className="public-glass p-5 sm:p-6">
        <p className="public-kicker">Próximos partidos</p>
        <p className="mt-4 text-sm text-[#a8b7d2]">
          Aquí aparecerán los encuentros asignados a tu equipo. Si todavía no hay cruces, mantén
          este enlace y el QR a mano para el día del torneo.
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
            <div className="public-soft p-4 text-sm leading-6 text-[#8fa1c2]">
              Todavía no hay partidos visibles para este equipo. La organización los publicará en
              cuanto el cuadro esté listo.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="public-action public-action--ghost" href="/">
            Volver al portal
          </Link>
        </div>
      </section>
    </PublicPageShell>
  );
}
