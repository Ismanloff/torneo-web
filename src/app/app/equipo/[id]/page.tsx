import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, QrCode, Users } from "lucide-react";

import { checkInTeamAction, saveCheckinAction } from "@/app/admin/actions";
import { QrTile } from "@/components/qr-tile";
import { requireStaffSession } from "@/lib/admin-auth";
import { getOperationalTeamById } from "@/lib/supabase/queries";
import type { EnrichedBracketMatch, EnrichedCategoryMatch, StaffContext } from "@/lib/types";
import { buildQrShareUrl, formatDateTime } from "@/lib/utils";

type TeamDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    entry?: string;
  }>;
};

type TeamRelatedMatch =
  | ({ scope: "category_match" } & EnrichedCategoryMatch)
  | ({ scope: "bracket_match" } & EnrichedBracketMatch);

function checkinLabel(status: string | null | undefined) {
  if (status === "presentado") return "Presentado";
  if (status === "incidencia") return "Incidencia";
  if (status === "no_presentado") return "No presentado";
  return "Pendiente";
}

function sortRelatedMatches(matches: TeamRelatedMatch[]) {
  return [...matches].sort((left, right) => {
    const leftTime = left.scheduled_at ? new Date(left.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduled_at ? new Date(right.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}

function getTeamCheckin(match: TeamRelatedMatch, teamId: string) {
  if (match.home_team?.id === teamId) {
    return match.home_checkin;
  }

  if (match.away_team?.id === teamId) {
    return match.away_checkin;
  }

  return null;
}

function canQuickCheckIn(staff: StaffContext, match: TeamRelatedMatch) {
  return (
    staff.profile.role === "admin" ||
    (staff.profile.role === "assistant" &&
      match.assistant_assignment?.auth_user_id === staff.authUserId)
  );
}

function canManageArrival(staff: StaffContext) {
  return staff.profile.role === "admin" || staff.profile.role === "assistant";
}

function isOpenMatch(match: TeamRelatedMatch) {
  return match.status !== "completed" && match.status !== "cancelled";
}

export default async function TeamDetailPage({ params, searchParams }: TeamDetailPageProps) {
  const staff = await requireStaffSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getOperationalTeamById(staff, id);

  if (!detail) {
    notFound();
  }

  const teamQrPath = detail.team.qr_token ? buildQrShareUrl(detail.team.qr_token.token) : null;
  const relatedMatches = sortRelatedMatches([
    ...detail.categoryMatches.map((match) => ({
      ...match,
      scope: "category_match" as const,
    })),
    ...detail.bracketMatches.map((match) => ({
      ...match,
      scope: "bracket_match" as const,
    })),
  ]);
  const nextOpenMatch = relatedMatches.find((match) => isOpenMatch(match)) ?? null;
  const nextCheckin = nextOpenMatch ? getTeamCheckin(nextOpenMatch, detail.team.id) : null;
  const nextCheckinAllowed = nextOpenMatch ? canQuickCheckIn(staff, nextOpenMatch) : false;
  const entryMode = query.entry === "1";
  const canSeeContacts = staff.profile.role === "admin" || staff.profile.role === "assistant";
  const canHandleArrival = canManageArrival(staff);

  return (
    <main className="grid gap-6">
      <section className="app-hero">
        <div className="app-hero__content">
          <div className="app-chip-row">
            <span className="app-chip app-chip--accent">
              <Users className="h-4 w-4" />
              Ficha de equipo
            </span>
            <span className="app-chip">{detail.category.name}</span>
          </div>
          <h1 className="app-title mt-6 text-5xl sm:text-6xl">{detail.team.team_name}</h1>
          <p className="app-copy mt-4 text-base">
            {detail.team.registration_code} · {detail.team.total_players} jugadores
          </p>
        </div>
      </section>

      {entryMode && canHandleArrival ? (
        <section className="app-panel border-[var(--app-accent-strong)] bg-[rgba(141,246,95,0.09)]">
          <p className="app-kicker">
            Acceso por QR
          </p>
          <h2 className="app-section-title mt-3 text-[2.4rem]">Control de llegada</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
            Estás en el flujo rápido de entrada. Valida si el equipo está presente y, si hace falta,
            abre directamente su próximo partido.
          </p>

          <div className="mt-5">
            {detail.team.checked_in_at ? (
              <div className="app-chip app-chip--accent">
                Llegada registrada · {formatDateTime(detail.team.checked_in_at)}
              </div>
            ) : (
              <form action={checkInTeamAction}>
                <input name="teamId" type="hidden" value={detail.team.id} />
                <input name="redirectTo" type="hidden" value={`/app/equipo/${detail.team.id}?entry=1`} />
                <button className="app-action w-full" type="submit">
                  Marcar llegada al torneo
                </button>
              </form>
            )}
          </div>
        </section>
      ) : entryMode ? (
        <section className="app-panel">
          <p className="app-kicker">Acceso por QR</p>
          <p className="mt-3 text-sm text-[var(--app-muted)]">
            Este modo de llegada está reservado a mesa y administración.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="app-panel">
          <p className="app-kicker">
            Datos rapidos
          </p>
          <div className="mt-4 grid gap-3 text-sm text-[var(--app-muted)]">
            <p>Capitan: {detail.team.captain_name}</p>
            {canSeeContacts ? <p>Email: {detail.team.captain_email}</p> : null}
            {canSeeContacts ? <p>Telefono: {detail.team.captain_phone}</p> : null}
            {!canSeeContacts ? <p>Contacto directo reservado a mesa y administración.</p> : null}
            <p>Estado: {detail.team.status}</p>
            <p>
              Autorizacion parental:{" "}
              {detail.team.parental_confirmation_required
                ? detail.team.parental_confirmed_at
                  ? "Confirmada"
                  : "Pendiente"
                : "No requerida"}
            </p>
            <p>
              Llegada al torneo:{" "}
              {detail.team.checked_in_at
                ? formatDateTime(detail.team.checked_in_at)
                : "Sin registrar"}
            </p>
          </div>
        </article>

        <article className="app-panel">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="app-kicker">
            QR del equipo
            </p>
          </div>
          {teamQrPath ? (
            <div className="mt-4">
              <QrTile href={teamQrPath} label="QR del equipo" />
            </div>
          ) : (
            <div className="app-soft-card mt-4 text-sm text-[var(--app-muted)]">
              Genera el QR desde el panel admin para acceso rapido desde mesa o pista.
            </div>
          )}
        </article>
      </section>

      <section className="app-panel-strong">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="app-kicker">
              Entrada rapida
            </p>
            <h2 className="app-section-title mt-3 text-[2.4rem]">Siguiente paso</h2>
          </div>
          {nextOpenMatch ? (
            <Link className="app-link-pill" href={`/app/partido/${nextOpenMatch.id}?scope=${nextOpenMatch.scope}`}>
              Abrir partido
            </Link>
          ) : null}
        </div>

        {nextOpenMatch ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="app-soft-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">Proximo partido</p>
              <p className="mt-2 text-xl font-semibold">
                {nextOpenMatch.home_team?.team_name ?? "Pendiente"} vs {nextOpenMatch.away_team?.team_name ?? "Pendiente"}
              </p>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {nextOpenMatch.scheduled_at ? formatDateTime(nextOpenMatch.scheduled_at) : "Sin fecha"} ·{" "}
                {nextOpenMatch.location ?? "Sin pista"} · {nextOpenMatch.scope === "category_match" ? "Fase regular" : "Eliminatoria"}
              </p>
              <p className="mt-3 text-sm text-[var(--app-muted)]">
                Estado actual de llegada:{" "}
                <strong className="text-[var(--app-text)]">{checkinLabel(nextCheckin?.status)}</strong>
              </p>
            </div>

            <div className="app-soft-card">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">Acciones de mesa</p>
              {nextCheckinAllowed ? (
                <div className="mt-3 grid gap-3">
                  <form action={saveCheckinAction}>
                    <input name="scope" type="hidden" value={nextOpenMatch.scope} />
                    <input name="matchId" type="hidden" value={nextOpenMatch.id} />
                    <input name="teamId" type="hidden" value={detail.team.id} />
                    <input name="status" type="hidden" value="presentado" />
                    <input name="incidentLabel" type="hidden" value="" />
                    <input name="notes" type="hidden" value="" />
                    <input name="redirectTo" type="hidden" value={`/app/equipo/${detail.team.id}?entry=1`} />
                    <button className="app-action w-full" type="submit">
                      Marcar presentado
                    </button>
                  </form>

                  <form action={saveCheckinAction}>
                    <input name="scope" type="hidden" value={nextOpenMatch.scope} />
                    <input name="matchId" type="hidden" value={nextOpenMatch.id} />
                    <input name="teamId" type="hidden" value={detail.team.id} />
                    <input name="status" type="hidden" value="incidencia" />
                    <input name="incidentLabel" type="hidden" value="Revisar en mesa" />
                    <input name="notes" type="hidden" value="" />
                    <input name="redirectTo" type="hidden" value={`/app/equipo/${detail.team.id}?entry=1`} />
                    <button className="app-action app-action--ghost w-full" type="submit">
                      Marcar incidencia
                    </button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--app-muted)]">
                  Puedes revisar la ficha, pero el check-in de este partido no está asignado a tu usuario.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="app-soft-card mt-5 text-sm text-[var(--app-muted)]">
            Este equipo no tiene partidos abiertos ahora mismo. El QR sigue sirviendo para identificarlo en entrada.
          </div>
        )}
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-kicker">
              Partidos de categoria
            </p>
            <h2 className="app-section-title mt-3 text-[2.4rem]">Fase regular</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {detail.categoryMatches.length ? (
            detail.categoryMatches.map((match) => (
              <div key={match.id} className="app-soft-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {match.home_team.team_name} vs {match.away_team.team_name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--app-muted)]">
                      {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"} ·{" "}
                      {match.location ?? "Sin pista"} · {checkinLabel(getTeamCheckin({ ...match, scope: "category_match" }, detail.team.id)?.status)}
                    </p>
                  </div>
                  <Link className="app-link-pill" href={`/app/partido/${match.id}?scope=category_match`}>
                    <span className="inline-flex items-center gap-2">
                      Abrir
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="app-soft-card text-sm text-[var(--app-muted)]">
              Este equipo todavia no tiene partidos de categoria cargados.
            </div>
          )}
        </div>
      </section>

      <section className="app-panel">
        <div>
          <p className="app-kicker">
            Eliminatoria
          </p>
          <h2 className="app-section-title mt-3 text-[2.4rem]">Cruces</h2>
        </div>

        <div className="mt-5 grid gap-3">
          {detail.bracketMatches.length ? (
            detail.bracketMatches.map((match) => (
              <div key={match.id} className="app-soft-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {match.home_team?.team_name ?? "Pendiente"} vs {match.away_team?.team_name ?? "Pendiente"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--app-muted)]">
                      {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"} ·{" "}
                      {match.location ?? "Sin pista"} · {checkinLabel(getTeamCheckin({ ...match, scope: "bracket_match" }, detail.team.id)?.status)}
                    </p>
                  </div>
                  <Link className="app-link-pill" href={`/app/partido/${match.id}?scope=bracket_match`}>
                    <span className="inline-flex items-center gap-2">
                      Abrir
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="app-soft-card text-sm text-[var(--app-muted)]">
              No hay cruces de eliminatoria asignados a este equipo todavia.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
