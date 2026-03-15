"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, PencilLine, QrCode, Save, Sparkles, Trash2, UserRound, Users } from "lucide-react";

import {
  assignStaffToCategoryAction,
  assignStaffToMatchAction,
  createMatchAction,
  deleteMatchAction,
  generateOperationalFinalStageAction,
  generateOperationalScheduleAction,
  generateThirdPlaceMatchAction,
  generateBracketAction,
  generateQrForResourceAction,
  saveOperationalSettingsAction,
  updateBracketMatchAction,
  updateMatchAction,
} from "@/app/admin/actions";
import { AdminModal } from "@/components/admin-modal";
import { buildInitialOperationalPlan, getDefaultOperationalSettings } from "@/lib/operational-scheduling";
import { getScoreMetricLabelLower } from "@/lib/score-metric";
import { formatDateTime, formatDateTimeLocalValue, formatStaffRoleLabel } from "@/lib/utils";

import type { ScoreboardCategory, StaffProfileRow } from "@/lib/types";

function getStatusLabel(status: string) {
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  if (status === "in_progress") return "En juego";
  return "Programado";
}

function getStatusClass(status: string) {
  if (status === "completed") {
    return "border-[rgba(141,246,95,0.18)] bg-[rgba(141,246,95,0.12)] text-[#d8ffc7]";
  }
  if (status === "cancelled") {
    return "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.12)] text-[#fecaca]";
  }
  if (status === "in_progress") {
    return "border-[rgba(97,216,255,0.18)] bg-[rgba(97,216,255,0.12)] text-[#d2f4ff]";
  }
  return "border-white/10 bg-white/[0.05] text-[var(--app-muted)]";
}

function renderAssignmentLabel(staff: { full_name: string } | null | undefined) {
  return staff?.full_name ?? "Sin asignar";
}

function formatTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 5);
}

function getPresentTeams(category: ScoreboardCategory) {
  return category.teams.filter((team) => Boolean(team.checked_in_at));
}

function getLatestRun(category: ScoreboardCategory, stage: "initial" | "final") {
  return category.scheduleRuns.find((run) => run.stage === stage && run.status === "generated") ?? null;
}

function getPhaseLabel(phase: string) {
  if (phase === "group") return "Grupos";
  if (phase === "placement") return "Colocación";
  if (phase === "friendly") return "Amistoso";
  return "Liga";
}

/* ------------------------------------------------------------------ */
/* Staff select (inline)                                               */
/* ------------------------------------------------------------------ */

function StaffSelect({
  categoryId,
  duty,
  matchId,
  scope,
  staffProfiles,
  tournamentId,
  value,
}: {
  categoryId: string;
  duty: "referee" | "assistant";
  matchId: string;
  scope: "category_match" | "bracket_match";
  staffProfiles: StaffProfileRow[];
  tournamentId: string;
  value?: string | null;
}) {
  const availableStaff = staffProfiles.filter(
    (profile) =>
      profile.is_active &&
      profile.auth_user_id &&
      (duty === "referee"
        ? profile.role === "admin" || profile.role === "referee"
        : profile.role === "admin" || profile.role === "assistant" || profile.role === "referee"),
  );

  return (
    <form action={assignStaffToMatchAction} className="grid gap-2 rounded-xl border border-[var(--app-line)] bg-white/[0.03] p-3">
      <input name="tournamentId" type="hidden" value={tournamentId} />
      <input name="categoryId" type="hidden" value={categoryId} />
      <input name="duty" type="hidden" value={duty} />
      <input name="scope" type="hidden" value={scope} />
      <input name="matchId" type="hidden" value={matchId} />
      <label className="field-shell">
        <span className="field-label field-label--dark">{duty === "referee" ? "Árbitro" : "Organización"}</span>
        <select className="field-input field-input--dark" defaultValue={value ?? ""} name="staffUserId">
          <option value="">Sin asignar</option>
          {availableStaff.map((profile) => (
            <option key={profile.id} value={profile.auth_user_id ?? ""}>
              {profile.full_name} · {formatStaffRoleLabel(profile.role)}
            </option>
          ))}
        </select>
      </label>
      <button className="admin-btn admin-btn--secondary" type="submit">
        Guardar
      </button>
    </form>
  );
}

function CategoryStaffSelect({
  categoryId,
  duty,
  staffProfiles,
  tournamentId,
  value,
}: {
  categoryId: string;
  duty: "referee" | "assistant";
  staffProfiles: StaffProfileRow[];
  tournamentId: string;
  value?: string | null;
}) {
  const availableStaff = staffProfiles.filter(
    (profile) =>
      profile.is_active &&
      profile.auth_user_id &&
      (duty === "referee"
        ? profile.role === "admin" || profile.role === "referee"
        : profile.role === "admin" || profile.role === "assistant" || profile.role === "referee"),
  );

  return (
    <form action={assignStaffToCategoryAction} className="grid gap-2 rounded-xl border border-[var(--app-line)] bg-white/[0.03] p-3">
      <input name="tournamentId" type="hidden" value={tournamentId} />
      <input name="categoryId" type="hidden" value={categoryId} />
      <input name="duty" type="hidden" value={duty} />
      <label className="field-shell">
        <span className="field-label field-label--dark">
          {duty === "referee" ? "Arbitraje de categoría" : "Organización de categoría"}
        </span>
        <select className="field-input field-input--dark" defaultValue={value ?? ""} name="staffUserId">
          <option value="">Sin asignar</option>
          {availableStaff.map((profile) => (
            <option key={profile.id} value={profile.auth_user_id ?? ""}>
              {profile.full_name} · {formatStaffRoleLabel(profile.role)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Se aplicará a todos los partidos y cruces de esta categoría salvo que un partido tenga una asignación propia.
      </p>
      <button className="admin-btn admin-btn--secondary" type="submit">
        Guardar categoría
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

type AdminPartidosTabProps = {
  categories: ScoreboardCategory[];
  staffProfiles: StaffProfileRow[];
  tournamentId: string;
  tournamentStartDate: string;
  surfacePath: string;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AdminPartidosTab({
  categories,
  staffProfiles,
  tournamentId,
  tournamentStartDate,
  surfacePath,
}: AdminPartidosTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.category.id ?? "",
  );
  const [modalCreateMatch, setModalCreateMatch] = useState(false);
  const [modalBracket, setModalBracket] = useState(false);
  const [modalPreview, setModalPreview] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editingBracketMatchId, setEditingBracketMatchId] = useState<string | null>(null);

  const category = categories.find((c) => c.category.id === selectedCategoryId);
  const scoreMetricLower = category
    ? getScoreMetricLabelLower(category.category.sport)
    : "goles";
  const presentTeams = category ? getPresentTeams(category) : [];
  const operationalSettings = category?.operationalSettings ?? (category ? getDefaultOperationalSettings(category.category) : null);
  const previewPlan =
    category && operationalSettings && presentTeams.length >= 4
      ? (() => {
          try {
            return buildInitialOperationalPlan({
              category: category.category,
              eventDate: tournamentStartDate.slice(0, 10),
              presentTeams,
              settings: operationalSettings,
            });
          } catch {
            return null;
          }
        })()
      : null;
  const latestInitialRun = category ? getLatestRun(category, "initial") : null;
  const latestFinalRun = category ? getLatestRun(category, "final") : null;
  const canGenerateFinalStage =
    Boolean(category && latestInitialRun && !latestFinalRun) &&
    category!.matches.filter(
      (match) =>
        match.schedule_run_id === latestInitialRun!.id &&
        match.counts_for_standings &&
        match.status !== "completed",
    ).length === 0;
  const canGenerateThirdPlace = Boolean(
    category &&
      category.bracket &&
      latestFinalRun &&
      category.bracket.rounds.find((round) => round.round.round_number === 1)?.matches.length === 2 &&
      !category.matches.some((match) => match.phase === "placement" && match.round_label === "3º/4º"),
  );

  if (!categories.length) {
    return (
      <div className="admin-empty-state">
        No hay categorías creadas todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="admin-card">
        <label className="field-shell flex-1" htmlFor="admin-category-selector">
          <span className="field-label field-label--dark">Categoría</span>
          <select
            id="admin-category-selector"
            className="field-input field-input--dark"
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            value={selectedCategoryId}
          >
            {categories.map((cat) => (
              <option key={cat.category.id} value={cat.category.id}>
                {cat.category.name} · {cat.category.age_group}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 rounded-[1.25rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-muted)]">
          Esta sección organiza calendario y estructura competitiva. La clasificación pública y los cruces se resuelven por {scoreMetricLower} marcados.
        </div>
      </div>

      {category && (
        <>
          <div className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="app-kicker">
                  {category.category.sport} · {category.category.age_group}
                </p>
                <h2 className="mt-3 font-display text-[2.2rem] font-semibold tracking-[-0.05em] text-white">
                  {category.category.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {category.category.school} · {category.teams.length} equipos · {presentTeams.length} llegadas confirmadas
                </p>
              </div>
              <Link className="app-link-pill" href={`/clasificacion/${category.category.id}`}>
                Clasificación
              </Link>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="app-kicker">Jornada automática</p>
                    <p className="mt-2 text-sm text-[var(--app-muted)]">
                      Se genera solo con los equipos ya llegados por QR. Los equipos que lleguen después quedan fuera de este lote.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">
                    {previewPlan ? previewPlan.formatLabel : "Esperando llegadas"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-black/20 p-4">
                    <p className="app-metric__label">Llegadas</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{presentTeams.length}</p>
                    <p className="mt-2 text-xs text-[var(--app-muted)]">Mínimo 4 para generar</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-black/20 p-4">
                    <p className="app-metric__label">Capacidad</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {previewPlan ? previewPlan.capacity.maxMatches : operationalSettings?.venue_count ?? 0}
                    </p>
                    <p className="mt-2 text-xs text-[var(--app-muted)]">
                      {operationalSettings?.venue_count ?? 0} pistas · {operationalSettings?.match_minutes ?? 0} min
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-black/20 p-4">
                    <p className="app-metric__label">Fase final</p>
                    <p className="mt-3 text-base font-semibold text-white">
                      {previewPlan?.finalStage === "top4_bracket"
                        ? "Semis + final"
                        : previewPlan?.finalStage === "top2_final"
                          ? "Final directa"
                          : latestFinalRun
                            ? "Ya generada"
                            : "Sin fase extra"}
                    </p>
                    <p className="mt-2 text-xs text-[var(--app-muted)]">
                      {latestInitialRun ? `Lote inicial ${formatDateTime(latestInitialRun.snapshot_at)}` : "Sin lote generado"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="admin-btn admin-btn--secondary"
                    disabled={!previewPlan}
                    onClick={() => setModalPreview(true)}
                    type="button"
                  >
                    <Sparkles className="h-4 w-4" />
                    Cerrar presentes y previsualizar
                  </button>
                  <form action={generateOperationalScheduleAction}>
                    <input name="categoryId" type="hidden" value={category.category.id} />
                    <input name="redirectTo" type="hidden" value={surfacePath} />
                    <button
                      className="admin-btn admin-btn--primary"
                      disabled={!previewPlan || Boolean(latestInitialRun)}
                      type="submit"
                    >
                      Generar jornada
                    </button>
                  </form>
                  <form action={generateOperationalFinalStageAction}>
                    <input name="categoryId" type="hidden" value={category.category.id} />
                    <input name="runId" type="hidden" value={latestInitialRun?.id ?? ""} />
                    <input name="redirectTo" type="hidden" value={surfacePath} />
                    <button
                      className="admin-btn admin-btn--secondary"
                      disabled={!canGenerateFinalStage}
                      type="submit"
                    >
                      Generar fase final
                    </button>
                  </form>
                  {category.bracket ? (
                    <form action={generateThirdPlaceMatchAction}>
                      <input name="categoryId" type="hidden" value={category.category.id} />
                      <input name="bracketId" type="hidden" value={category.bracket.bracket.id} />
                      <input name="redirectTo" type="hidden" value={surfacePath} />
                      <button
                        className="admin-btn admin-btn--secondary"
                        disabled={!canGenerateThirdPlace}
                        type="submit"
                      >
                        Generar 3º/4º
                      </button>
                    </form>
                  ) : null}
                  <Link className="admin-btn admin-btn--secondary" href="/app/partidos">
                    Ir a operativa
                  </Link>
                </div>

                {previewPlan?.warnings.length ? (
                  <div className="mt-4 grid gap-2 rounded-[1.15rem] border border-[rgba(245,205,118,0.16)] bg-[rgba(245,205,118,0.08)] p-4 text-sm text-[#f6e7b0]">
                    {previewPlan.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                {latestFinalRun ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--app-accent)]">
                    Fase final generada el {formatDateTime(latestFinalRun.snapshot_at)}
                  </p>
                ) : latestInitialRun ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--app-accent)]">
                    Jornada inicial generada el {formatDateTime(latestInitialRun.snapshot_at)}
                  </p>
                ) : null}
              </div>

              <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                <p className="app-kicker">Ajustes de jornada</p>
                <form action={saveOperationalSettingsAction} className="mt-4 grid gap-3">
                  <input name="categoryId" type="hidden" value={category.category.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field-shell">
                      <span className="field-label field-label--dark">Minutos de juego</span>
                      <input className="field-input field-input--dark" defaultValue={operationalSettings?.match_minutes ?? 20} min={5} max={120} name="matchMinutes" type="number" />
                    </label>
                    <label className="field-shell">
                      <span className="field-label field-label--dark">Cambio / descanso</span>
                      <input className="field-input field-input--dark" defaultValue={operationalSettings?.turnover_minutes ?? 5} min={0} max={60} name="turnoverMinutes" type="number" />
                    </label>
                    <label className="field-shell">
                      <span className="field-label field-label--dark">Pistas activas</span>
                      <input className="field-input field-input--dark" defaultValue={operationalSettings?.venue_count ?? 1} min={1} max={8} name="venueCount" type="number" />
                    </label>
                    <label className="field-shell">
                      <span className="field-label field-label--dark">Inicio / cierre</span>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="field-input field-input--dark" defaultValue={formatTimeInputValue(operationalSettings?.window_start)} name="windowStart" type="time" />
                        <input className="field-input field-input--dark" defaultValue={formatTimeInputValue(operationalSettings?.window_end)} name="windowEnd" type="time" />
                      </div>
                    </label>
                  </div>
                  <button className="admin-btn admin-btn--secondary" type="submit">
                    <Save className="h-4 w-4" />
                    Guardar ajustes
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <CategoryStaffSelect
                categoryId={category.category.id}
                duty="referee"
                staffProfiles={staffProfiles}
                tournamentId={tournamentId}
                value={category.category_referee_assignment?.auth_user_id ?? ""}
              />
              <CategoryStaffSelect
                categoryId={category.category.id}
                duty="assistant"
                staffProfiles={staffProfiles}
                tournamentId={tournamentId}
                value={category.category_assistant_assignment?.auth_user_id ?? ""}
              />
            </div>
          </div>

          <AdminModal
            isOpen={modalPreview}
            onClose={() => setModalPreview(false)}
            title="Previsualización de jornada"
          >
            {previewPlan ? (
              <div className="grid gap-4">
                <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-white/[0.03] p-4 text-sm text-[var(--app-muted)]">
                  <p className="font-semibold text-white">{previewPlan.formatLabel}</p>
                  <p className="mt-2">
                    {presentTeams.length} equipos presentes · {previewPlan.totalMatchesPlanned} partidos previstos · mínimo {previewPlan.minimumMatchesPerTeam} por equipo.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                    <p className="app-metric__label">Capacidad estimada</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{previewPlan.capacity.maxMatches} partidos</p>
                    <p className="mt-2 text-sm text-[var(--app-muted)]">
                      {previewPlan.capacity.venueCount} pistas · {previewPlan.capacity.slotsPerVenue} turnos
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                    <p className="app-metric__label">Fase inicial</p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {previewPlan.initialStage === "group"
                        ? "Grupos"
                        : previewPlan.initialStage === "league"
                          ? "Liga"
                          : "Eliminatoria"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--app-muted)]">
                      {previewPlan.officialPlacement ? "Incluye colocación oficial" : "Sin colocación completa"}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                  <p className="app-metric__label">Equipos incluidos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {presentTeams.map((team) => (
                      <span key={team.id} className="inline-flex rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1.5 text-xs text-white">
                        {team.team_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                  <p className="app-metric__label">Partidos a crear</p>
                  <div className="mt-3 grid gap-2">
                    {previewPlan.generatedMatches.slice(0, 10).map((match) => (
                      <p key={`${match.phase}:${match.matchOrder}:${match.homeTeamId}`} className="text-sm text-[var(--app-muted)]">
                        <span className="font-semibold text-white">{match.roundLabel ?? getPhaseLabel(match.phase)}</span>
                        {" · "}
                        {category.teams.find((team) => team.id === match.homeTeamId)?.team_name ?? "Pendiente"}
                        {" vs "}
                        {category.teams.find((team) => team.id === match.awayTeamId)?.team_name ?? "Pendiente"}
                      </p>
                    ))}
                    {previewPlan.generatedMatches.length > 10 ? (
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--app-muted)]">
                        + {previewPlan.generatedMatches.length - 10} partidos más
                      </p>
                    ) : null}
                  </div>
                </div>

                {previewPlan.warnings.length ? (
                  <div className="grid gap-2 rounded-[1.1rem] border border-[rgba(245,205,118,0.16)] bg-[rgba(245,205,118,0.08)] p-4 text-sm text-[#f6e7b0]">
                    {previewPlan.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[1.1rem] border border-[var(--app-line)] bg-white/[0.03] p-4 text-sm text-[var(--app-muted)]">
                Necesitas al menos 4 equipos presentes para calcular la jornada.
              </div>
            )}
          </AdminModal>

          <div className="grid gap-4">
            <h3 className="app-kicker">Partidos oficiales</h3>
            {category.matches.length ? (
              category.matches.map((match) => (
                <div key={match.id} className="admin-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="app-metric__label">
                        {match.round_label || "Partido"} · {getPhaseLabel(match.phase)}
                      </p>
                      <p className="mt-2 font-display text-[1.7rem] font-semibold tracking-[-0.04em] text-white">
                        {match.home_team.team_name} <span className="text-[var(--app-muted)]">vs</span> {match.away_team.team_name}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--app-muted)]">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--app-muted)]">
                          <MapPin className="h-3.5 w-3.5" />
                          {match.location ?? "Sin pista"}
                        </span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(match.status)}`}>
                      {getStatusLabel(match.status)}
                    </span>
                  </div>

                  <form action={updateMatchAction} className="mt-5 grid gap-4">
                    <input name="matchId" type="hidden" value={match.id} />
                    <input name="categoryId" type="hidden" value={category.category.id} />
                    <input name="redirectTo" type="hidden" value={surfacePath} />
                    <input name="scheduledAt" type="hidden" value={formatDateTimeLocalValue(match.scheduled_at)} />
                    <input name="location" type="hidden" value={match.location ?? ""} />
                    <input name="notes" type="hidden" value={match.notes ?? ""} />

                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Local</span>
                        <input className="field-input field-input--dark font-mono" defaultValue={match.home_score ?? ""} name="homeScore" type="number" />
                      </label>
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Visitante</span>
                        <input className="field-input field-input--dark font-mono" defaultValue={match.away_score ?? ""} name="awayScore" type="number" />
                      </label>
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Estado</span>
                        <select className="field-input field-input--dark min-w-[10rem]" defaultValue={match.status} name="status">
                          <option value="scheduled">Programado</option>
                          <option value="completed">Finalizado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-2 rounded-[1.25rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-muted)] sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-[var(--app-accent)]" />
                        Arbitro: {renderAssignmentLabel(match.referee_assignment)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[var(--app-info)]" />
                        Organización: {renderAssignmentLabel(match.assistant_assignment)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className="admin-btn admin-btn--primary" type="submit">
                        Guardar marcador
                      </button>
                      <Link
                        className="admin-btn admin-btn--secondary"
                        href={`/app/partido/${match.id}?scope=category_match`}
                      >
                        Abrir operativa
                      </Link>
                      <button
                        className="admin-btn admin-btn--secondary"
                        onClick={() => setEditingMatchId(match.id)}
                        type="button"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edicion avanzada
                      </button>
                    </div>
                  </form>

                  <AdminModal
                    isOpen={editingMatchId === match.id}
                    onClose={() => setEditingMatchId(null)}
                    title={`${match.home_team.team_name} vs ${match.away_team.team_name}`}
                  >
                    <form action={updateMatchAction} className="grid gap-4">
                      <input name="matchId" type="hidden" value={match.id} />
                      <input name="categoryId" type="hidden" value={category.category.id} />
                      <input name="redirectTo" type="hidden" value={surfacePath} />

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="field-shell">
                          <span className="field-label field-label--dark">Estado</span>
                          <select className="field-input field-input--dark" defaultValue={match.status} name="status">
                            <option value="scheduled">Programado</option>
                            <option value="completed">Finalizado</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </label>
                        <label className="field-shell">
                          <span className="field-label field-label--dark">Fecha y hora</span>
                          <input className="field-input field-input--dark" defaultValue={formatDateTimeLocalValue(match.scheduled_at)} name="scheduledAt" type="datetime-local" />
                        </label>
                        <label className="field-shell">
                          <span className="field-label field-label--dark">Local</span>
                          <input className="field-input field-input--dark font-mono" defaultValue={match.home_score ?? ""} name="homeScore" type="number" />
                        </label>
                        <label className="field-shell">
                          <span className="field-label field-label--dark">Visitante</span>
                          <input className="field-input field-input--dark font-mono" defaultValue={match.away_score ?? ""} name="awayScore" type="number" />
                        </label>
                        <label className="field-shell md:col-span-2">
                          <span className="field-label field-label--dark">Pista o lugar</span>
                          <input className="field-input field-input--dark" defaultValue={match.location ?? ""} name="location" />
                        </label>
                      </div>

                      <label className="field-shell">
                        <span className="field-label field-label--dark">Notas</span>
                        <textarea className="field-input field-input--dark min-h-20" defaultValue={match.notes ?? ""} name="notes" />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <StaffSelect
                          categoryId={category.category.id}
                          duty="referee"
                          matchId={match.id}
                          scope="category_match"
                          staffProfiles={staffProfiles}
                          tournamentId={tournamentId}
                          value={match.referee_assignment?.auth_user_id ?? ""}
                        />
                        <StaffSelect
                          categoryId={category.category.id}
                          duty="assistant"
                          matchId={match.id}
                          scope="category_match"
                          staffProfiles={staffProfiles}
                          tournamentId={tournamentId}
                          value={match.assistant_assignment?.auth_user_id ?? ""}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="admin-btn admin-btn--primary" type="submit">
                          Guardar cambios
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action={generateQrForResourceAction}>
                        <input name="resourceType" type="hidden" value="category_match" />
                        <input name="resourceId" type="hidden" value={match.id} />
                        <input name="categoryId" type="hidden" value={category.category.id} />
                        <button className="admin-btn admin-btn--secondary" type="submit">
                          <QrCode className="h-4 w-4" />
                          Regenerar QR
                        </button>
                      </form>
                      <form action={deleteMatchAction}>
                        <input name="matchId" type="hidden" value={match.id} />
                        <input name="categoryId" type="hidden" value={category.category.id} />
                        <input name="redirectTo" type="hidden" value={surfacePath} />
                        <button className="admin-btn admin-btn--danger" type="submit">
                          <Trash2 className="h-4 w-4" />
                          Eliminar partido
                        </button>
                      </form>
                    </div>
                  </AdminModal>
                </div>
              ))
            ) : (
              <div className="admin-empty-state">
                Aún no hay partidos creados.
              </div>
            )}
          </div>

          {category.bracket?.rounds.length ? (
            <div className="grid gap-4">
              <h3 className="app-kicker">Cruces del cuadro</h3>
              {category.bracket.rounds.map(({ round, matches }) => (
                <div key={round.id} className="admin-card">
                  <p className="mb-3 font-semibold text-white">{round.name}</p>
                  <div className="grid gap-4">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="app-metric__label">Cruce {match.match_number}</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {match.home_team?.team_name ?? "Pendiente"} vs {match.away_team?.team_name ?? "Pendiente"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--app-muted)]">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"}
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1.5 text-xs text-[var(--app-muted)]">
                                <MapPin className="h-3.5 w-3.5" />
                                {match.location ?? "Sin pista"}
                              </span>
                            </div>
                          </div>
                          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(match.status)}`}>
                            {getStatusLabel(match.status)}
                          </span>
                        </div>

                        <form action={updateBracketMatchAction} className="mt-4 grid gap-4">
                          <input name="bracketId" type="hidden" value={category.bracket?.bracket.id} />
                          <input name="categoryId" type="hidden" value={category.category.id} />
                          <input name="matchId" type="hidden" value={match.id} />
                          <input name="redirectTo" type="hidden" value={surfacePath} />
                          <input name="scheduledAt" type="hidden" value={formatDateTimeLocalValue(match.scheduled_at)} />
                          <input name="location" type="hidden" value={match.location ?? ""} />
                          <input name="notes" type="hidden" value={match.notes ?? ""} />

                          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Local</span>
                              <input className="field-input field-input--dark font-mono" defaultValue={match.home_score ?? ""} name="homeScore" type="number" />
                            </label>
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Visitante</span>
                              <input className="field-input field-input--dark font-mono" defaultValue={match.away_score ?? ""} name="awayScore" type="number" />
                            </label>
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Estado</span>
                              <select className="field-input field-input--dark min-w-[10rem]" defaultValue={match.status} name="status">
                                <option value="scheduled">Programado</option>
                                <option value="completed">Finalizado</option>
                                <option value="cancelled">Cancelado</option>
                              </select>
                            </label>
                          </div>

                          <div className="grid gap-2 rounded-[1.25rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-muted)] sm:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <UserRound className="h-4 w-4 text-[var(--app-accent)]" />
                              Arbitro: {renderAssignmentLabel(match.referee_assignment)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-[var(--app-info)]" />
                              Organización: {renderAssignmentLabel(match.assistant_assignment)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button className="admin-btn admin-btn--primary" type="submit">
                              Guardar cruce
                            </button>
                            <Link
                              className="admin-btn admin-btn--secondary"
                              href={`/app/partido/${match.id}?scope=bracket_match`}
                            >
                              Abrir operativa
                            </Link>
                            <button
                              className="admin-btn admin-btn--secondary"
                              onClick={() => setEditingBracketMatchId(match.id)}
                              type="button"
                            >
                              <PencilLine className="h-4 w-4" />
                              Edicion avanzada
                            </button>
                          </div>
                        </form>

                        <AdminModal
                          isOpen={editingBracketMatchId === match.id}
                          onClose={() => setEditingBracketMatchId(null)}
                          title={`${match.home_team?.team_name ?? "Pendiente"} vs ${match.away_team?.team_name ?? "Pendiente"}`}
                        >
                          <form action={updateBracketMatchAction} className="grid gap-4">
                            <input name="bracketId" type="hidden" value={category.bracket?.bracket.id} />
                            <input name="categoryId" type="hidden" value={category.category.id} />
                            <input name="matchId" type="hidden" value={match.id} />
                            <input name="redirectTo" type="hidden" value={surfacePath} />

                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="field-shell">
                                <span className="field-label field-label--dark">Estado</span>
                                <select className="field-input field-input--dark" defaultValue={match.status} name="status">
                                  <option value="scheduled">Programado</option>
                                  <option value="completed">Finalizado</option>
                                  <option value="cancelled">Cancelado</option>
                                </select>
                              </label>
                              <label className="field-shell">
                                <span className="field-label field-label--dark">Fecha y hora</span>
                                <input className="field-input field-input--dark" defaultValue={formatDateTimeLocalValue(match.scheduled_at)} name="scheduledAt" type="datetime-local" />
                              </label>
                              <label className="field-shell">
                                <span className="field-label field-label--dark">Local</span>
                                <input className="field-input field-input--dark font-mono" defaultValue={match.home_score ?? ""} name="homeScore" type="number" />
                              </label>
                              <label className="field-shell">
                                <span className="field-label field-label--dark">Visitante</span>
                                <input className="field-input field-input--dark font-mono" defaultValue={match.away_score ?? ""} name="awayScore" type="number" />
                              </label>
                              <label className="field-shell md:col-span-2">
                                <span className="field-label field-label--dark">Pista o lugar</span>
                                <input className="field-input field-input--dark" defaultValue={match.location ?? ""} name="location" />
                              </label>
                            </div>

                            <label className="field-shell">
                              <span className="field-label field-label--dark">Notas</span>
                              <textarea className="field-input field-input--dark min-h-20" defaultValue={match.notes ?? ""} name="notes" />
                            </label>

                            <div className="grid gap-3 md:grid-cols-2">
                              <StaffSelect
                                categoryId={category.category.id}
                                duty="referee"
                                matchId={match.id}
                                scope="bracket_match"
                                staffProfiles={staffProfiles}
                                tournamentId={tournamentId}
                                value={match.referee_assignment?.auth_user_id ?? ""}
                              />
                              <StaffSelect
                                categoryId={category.category.id}
                                duty="assistant"
                                matchId={match.id}
                                scope="bracket_match"
                                staffProfiles={staffProfiles}
                                tournamentId={tournamentId}
                                value={match.assistant_assignment?.auth_user_id ?? ""}
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button className="admin-btn admin-btn--primary" type="submit">
                                Guardar cambios
                              </button>
                            </div>
                          </form>

                          <div className="mt-4">
                            <form action={generateQrForResourceAction}>
                              <input name="resourceType" type="hidden" value="bracket_match" />
                              <input name="resourceId" type="hidden" value={match.id} />
                              <input name="categoryId" type="hidden" value={category.category.id} />
                              <button className="admin-btn admin-btn--secondary" type="submit">
                                <QrCode className="h-4 w-4" />
                                Regenerar QR del cruce
                              </button>
                            </form>
                          </div>
                        </AdminModal>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              Todavía no hay cuadro generado para esta categoría.
            </div>
          )}

          <div className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="app-kicker">Herramientas manuales</p>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  Úsalas solo como respaldo. El flujo principal de esta pantalla es llegadas QR → jornada → fase final.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setModalCreateMatch(true)}
                  type="button"
                >
                  Crear partido manual
                </button>
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setModalBracket(true)}
                  type="button"
                >
                  Generar cuadro manual
                </button>
              </div>
            </div>
          </div>

          {/* ---- MODALS ---- */}

          {/* Create Match Modal */}
          <AdminModal isOpen={modalCreateMatch} onClose={() => setModalCreateMatch(false)} title="Crear partido">
            <form action={createMatchAction} className="grid gap-3">
              <input name="categoryId" type="hidden" value={category.category.id} />
              <label className="field-shell">
                <span className="field-label field-label--dark">Equipo local</span>
                <select className="field-input field-input--dark" defaultValue="" name="homeTeamId" required>
                  <option disabled value="">Selecciona equipo</option>
                  {category.teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.team_name}</option>
                  ))}
                </select>
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Equipo visitante</span>
                <select className="field-input field-input--dark" defaultValue="" name="awayTeamId" required>
                  <option disabled value="">Selecciona equipo</option>
                  {category.teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.team_name}</option>
                  ))}
                </select>
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Jornada o fase</span>
                <input className="field-input field-input--dark" name="roundLabel" placeholder="Jornada 1" />
              </label>
              <button className="admin-btn admin-btn--primary mt-2" type="submit">
                Crear partido
              </button>
            </form>
          </AdminModal>

          {/* Bracket Modal */}
          <AdminModal isOpen={modalBracket} onClose={() => setModalBracket(false)} title="Generar cuadro eliminatorio">
            <form action={generateBracketAction} className="grid gap-3">
              <input name="categoryId" type="hidden" value={category.category.id} />
              <label className="field-shell">
                <span className="field-label field-label--dark">Nombre del cuadro</span>
                <input className="field-input field-input--dark" defaultValue={`${category.category.name} · Eliminatoria`} name="bracketName" />
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Clasificados</span>
                <select
                  className="field-input field-input--dark"
                  defaultValue={[8, 4, 2].find((size) => size <= Math.max(category.standings.length, category.teams.length)) || 2}
                  name="qualifiedTeamCount"
                >
                  {[2, 4, 8, 16].map((size) => (
                    <option key={size} disabled={size > Math.max(category.standings.length, category.teams.length)} value={size}>
                      Top {size}
                    </option>
                  ))}
                </select>
              </label>
              <button className="admin-btn admin-btn--primary mt-2" type="submit">
                Generar cuadro
              </button>
            </form>
          </AdminModal>
        </>
      )}
    </div>
  );
}
