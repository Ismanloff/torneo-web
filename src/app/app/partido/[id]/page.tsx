import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, Shield, TimerReset, UserRound, Users } from "lucide-react";

import { saveCheckinAction } from "@/app/admin/actions";
import { OfflineScoreForm } from "@/components/offline-score-form";
import { QrTile } from "@/components/qr-tile";
import { requireStaffSession } from "@/lib/admin-auth";
import { getOperationalMatchById } from "@/lib/supabase/queries";
import { buildQrShareUrl, formatDateTime, formatDateTimeLocalValue } from "@/lib/utils";

type MatchDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    scope?: "category_match" | "bracket_match";
  }>;
};

function checkinLabel(status: string | null | undefined) {
  if (status === "presentado") return "Presentado";
  if (status === "incidencia") return "Incidencia";
  if (status === "no_presentado") return "No presentado";
  return "Pendiente";
}

function getOperationLabel(canSubmitResult: boolean, canCheckIn: boolean) {
  if (canSubmitResult && canCheckIn) return "Control total";
  if (canSubmitResult) return "Arbitraje";
  if (canCheckIn) return "Control de llegada";
  return "Consulta";
}

export default async function MatchDetailPage({ params, searchParams }: MatchDetailPageProps) {
  const staff = await requireStaffSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const scope = query.scope;

  if (!scope) {
    notFound();
  }

  const detail = await getOperationalMatchById(staff, { matchId: id, scope });

  if (!detail) {
    notFound();
  }

  const redirectTo = `/app/partido/${id}?scope=${scope}`;
  const qrPath = detail.match.qr_token ? buildQrShareUrl(detail.match.qr_token.token) : null;
  const operationLabel = getOperationLabel(detail.canSubmitResult, detail.canCheckIn);

  return (
    <main className="grid gap-6 max-w-4xl mx-auto">
      <section className="app-hero">
        <div className="app-hero__content">
          <div className="app-chip-row">
            <span className="app-chip app-chip--accent">
              <ClipboardCheck className="h-4 w-4" />
              Ficha operativa
            </span>
            <span className="app-chip">
              <TimerReset className="h-4 w-4" />
              {operationLabel}
            </span>
          </div>

          <h1 className="app-title mt-6 text-5xl sm:text-6xl">
            {detail.match.home_team?.team_name ?? "Pendiente"} vs {detail.match.away_team?.team_name ?? "Pendiente"}
          </h1>
          <p className="app-copy mt-4 text-base">
            {detail.category.category.name} · {detail.match.location ?? "Sin pista"} ·{" "}
            {detail.match.scheduled_at ? formatDateTime(detail.match.scheduled_at) : "Sin fecha"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="app-link-pill" href="/app/partidos">
            Volver a partidos
          </Link>
          {detail.match.home_team ? (
              <Link className="app-link-pill" href={`/app/equipo/${detail.match.home_team.id}`}>
              Equipo local
            </Link>
          ) : null}
          {detail.match.away_team ? (
              <Link className="app-link-pill" href={`/app/equipo/${detail.match.away_team.id}`}>
              Equipo visitante
            </Link>
          ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {[detail.match.home_team, detail.match.away_team].map((team, index) => {
          const checkin = index === 0 ? detail.match.home_checkin : detail.match.away_checkin;

          return (
            <article key={team?.id ?? index} className="app-panel">
              <p className="app-kicker">
                {index === 0 ? "Equipo local" : "Equipo visitante"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{team?.team_name ?? "Pendiente de sorteo"}</h2>
              <p className="mt-1 text-sm uppercase tracking-[0.16em] text-[var(--app-muted)]">
                {team?.registration_code ?? "Sin codigo"}
              </p>

              <div className="app-soft-card mt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">Estado</p>
                <p className="mt-2 text-lg font-semibold">{checkinLabel(checkin?.status)}</p>
                {checkin?.checked_in_at ? (
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    {formatDateTime(checkin.checked_in_at)}
                  </p>
                ) : null}
              </div>

              {detail.canCheckIn && team ? (
                <form action={saveCheckinAction} className="mt-4 grid gap-3">
                  <input name="scope" type="hidden" value={scope} />
                  <input name="matchId" type="hidden" value={detail.match.id} />
                  <input name="teamId" type="hidden" value={team.id} />
                  <input name="redirectTo" type="hidden" value={redirectTo} />
                  <label className="field-shell">
                    <span className="field-label field-label--dark">Check-in</span>
                    <select className="field-input field-input--dark" defaultValue={checkin?.status ?? "pendiente"} name="status">
                      <option value="pendiente">Pendiente</option>
                      <option value="presentado">Presentado</option>
                      <option value="incidencia">Incidencia</option>
                      <option value="no_presentado">No presentado</option>
                    </select>
                  </label>
                  <label className="field-shell">
                    <span className="field-label field-label--dark">Incidencia corta</span>
                    <input
                      className="field-input field-input--dark"
                      defaultValue={checkin?.incident_label ?? ""}
                      name="incidentLabel"
                      placeholder="Retraso, falta un jugador..."
                    />
                  </label>
                  <label className="field-shell">
                    <span className="field-label field-label--dark">Observaciones</span>
                    <textarea
                      className="field-input field-input--dark min-h-24"
                      defaultValue={checkin?.notes ?? ""}
                      name="notes"
                    />
                  </label>
                  <button className="app-action app-action--ghost" type="submit">
                    Guardar check-in
                  </button>
                </form>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {detail.canSubmitResult ? (
          <OfflineScoreForm
            actorRole={staff.profile.role}
            bracketId={scope === "bracket_match" ? detail.category.bracket?.bracket.id : null}
            canSubmit={detail.canSubmitResult}
            categoryId={detail.category.category.id}
            currentAwayScore={detail.match.away_score ?? null}
            currentHomeScore={detail.match.home_score ?? null}
            currentLocation={detail.match.location ?? null}
            currentNotes={detail.match.notes ?? null}
            currentScheduledAt={formatDateTimeLocalValue(detail.match.scheduled_at) || null}
            currentStatus={detail.match.status}
            homeTeamName={detail.match.home_team?.team_name ?? "Local"}
            awayTeamName={detail.match.away_team?.team_name ?? "Visitante"}
            matchId={detail.match.id}
            matchScope={scope}
          />
        ) : (
          <article className="app-panel-strong">
            <p className="app-kicker">Mesa y llegada</p>
            <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.04em] text-white">
              Flujo de asistencia
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
              Tu perfil está orientado a check-in, incidencias y preparación del partido. El resultado se registra desde arbitraje o administración.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.04] p-4">
                <p className="app-metric__label">Estado</p>
                <p className="mt-3 text-xl font-semibold text-white">{detail.match.status}</p>
              </div>
              <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.04] p-4">
                <p className="app-metric__label">Marcador actual</p>
                <p className="font-mono mt-3 text-xl font-semibold text-white">
                  {detail.match.home_score ?? "-"} : {detail.match.away_score ?? "-"}
                </p>
              </div>
            </div>
          </article>
        )}

        <article className="app-panel">
          <div className="flex items-center gap-2">
            {detail.canSubmitResult ? (
              <UserRound className="h-4 w-4 text-[var(--app-accent)]" />
            ) : detail.canCheckIn ? (
              <Users className="h-4 w-4 text-[var(--app-info)]" />
            ) : (
              <Shield className="h-4 w-4 text-[var(--app-accent)]" />
            )}
            <p className="app-kicker">
              {detail.canSubmitResult ? "Arbitraje" : detail.canCheckIn ? "Mesa" : "Acceso rapido"}
            </p>
          </div>
          {qrPath ? <QrTile href={qrPath} label="QR del partido" /> : null}
          <div className="app-soft-card mt-4 text-sm text-[var(--app-muted)]">
            <p>Arbitro asignado: {detail.match.referee_assignment?.full_name ?? "Sin asignar"}</p>
            <p className="mt-2">
              Asistente asignado: {detail.match.assistant_assignment?.full_name ?? "Sin asignar"}
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
