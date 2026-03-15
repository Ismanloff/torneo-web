"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, PencilLine, QrCode, Trash2, UserRound, Users } from "lucide-react";

import {
  addAdjustmentAction,
  assignStaffToCategoryAction,
  assignStaffToMatchAction,
  createMatchAction,
  deleteAdjustmentAction,
  deleteMatchAction,
  generateBracketAction,
  generateQrForResourceAction,
  saveScoringRuleAction,
  updateBracketMatchAction,
  updateMatchAction,
} from "@/app/admin/actions";
import { AdminModal } from "@/components/admin-modal";
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
        <span className="field-label field-label--dark">{duty === "referee" ? "Arbitro" : "Organizacion"}</span>
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
          {duty === "referee" ? "Arbitraje de categoria" : "Organizacion de categoria"}
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
        Se aplicara a todos los partidos y cruces de esta categoria salvo que un partido tenga una asignacion propia.
      </p>
      <button className="admin-btn admin-btn--secondary" type="submit">
        Guardar categoria
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
  surfacePath: string;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AdminPartidosTab({
  categories,
  staffProfiles,
  tournamentId,
  surfacePath,
}: AdminPartidosTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.category.id ?? "",
  );
  const [modalScoringRule, setModalScoringRule] = useState(false);
  const [modalCreateMatch, setModalCreateMatch] = useState(false);
  const [modalAdjustment, setModalAdjustment] = useState(false);
  const [modalBracket, setModalBracket] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editingBracketMatchId, setEditingBracketMatchId] = useState<string | null>(null);

  const category = categories.find((c) => c.category.id === selectedCategoryId);

  if (!categories.length) {
    return (
      <div className="admin-empty-state">
        No hay categorias creadas todavia.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="admin-card">
        <label className="field-shell flex-1" htmlFor="admin-category-selector">
          <span className="field-label field-label--dark">Categoria</span>
          <select
            id="admin-category-selector"
            className="field-input field-input--dark"
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            value={selectedCategoryId}
          >
            {categories.map((cat) => (
              <option key={cat.category.id} value={cat.category.id}>
                {cat.category.sport} · {cat.category.age_group} — {cat.category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 rounded-[1.25rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-muted)]">
          Esta seccion organiza calendario y estructura competitiva. Para scoring en vivo y check-in, abre la operativa de cada partido.
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
                  {category.category.school} · {category.teams.length} equipos · {category.matches.length} partidos
                </p>
              </div>
              <Link className="app-link-pill" href={`/clasificacion/${category.category.id}`}>
                Clasificacion
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="admin-btn admin-btn--primary"
                onClick={() => setModalCreateMatch(true)}
                type="button"
              >
                Crear partido
              </button>
              <button
                className="admin-btn admin-btn--secondary"
                onClick={() => setModalScoringRule(true)}
                type="button"
              >
                Reglas puntos
              </button>
              <button
                className="admin-btn admin-btn--secondary"
                onClick={() => setModalAdjustment(true)}
                type="button"
              >
                Ajuste manual
              </button>
              <button
                className="admin-btn admin-btn--secondary"
                onClick={() => setModalBracket(true)}
                type="button"
              >
                Cuadro eliminacion
              </button>
              <Link className="admin-btn admin-btn--secondary" href="/app/partidos">
                Ir a operativa
              </Link>
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

          <div className="grid gap-4">
            <h3 className="app-kicker">Partidos de fase de grupos</h3>
            {category.matches.length ? (
              category.matches.map((match) => (
                <div key={match.id} className="admin-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="app-metric__label">{match.round_label || "Partido"}</p>
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
                        Organizacion: {renderAssignmentLabel(match.assistant_assignment)}
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
                Aun no hay partidos creados.
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
                              Organizacion: {renderAssignmentLabel(match.assistant_assignment)}
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
              Todavia no hay cuadro generado para esta categoria.
            </div>
          )}

          {/* Adjustments list */}
          {category.adjustments.length > 0 && (
            <div className="grid gap-3">
              <h3 className="app-kicker">Ajustes de puntos</h3>
              {category.adjustments.map((adj) => (
                <div key={adj.id} className="admin-card flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {adj.team.team_name}: {adj.points_delta > 0 ? "+" : ""}{adj.points_delta} pts
                    </p>
                    <p className="text-xs text-[var(--app-muted)]">{adj.note}</p>
                  </div>
                  <form action={deleteAdjustmentAction}>
                    <input name="adjustmentId" type="hidden" value={adj.id} />
                    <input name="categoryId" type="hidden" value={category.category.id} />
                    <input name="redirectTo" type="hidden" value={surfacePath} />
                    <button className="admin-btn admin-btn--danger text-xs" type="submit">
                      Eliminar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          {/* ---- MODALS ---- */}

          {/* Scoring Rule Modal */}
          <AdminModal isOpen={modalScoringRule} onClose={() => setModalScoringRule(false)} title="Regla de puntos">
            <form action={saveScoringRuleAction} className="grid gap-3">
              <input name="categoryId" type="hidden" value={category.category.id} />
              <label className="field-shell">
                <span className="field-label field-label--dark">Victoria</span>
                <input className="field-input field-input--dark" defaultValue={category.scoringRule?.points_win ?? 3} name="pointsWin" type="number" />
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Empate</span>
                <input className="field-input field-input--dark" defaultValue={category.scoringRule?.points_draw ?? 1} name="pointsDraw" type="number" />
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Derrota</span>
                <input className="field-input field-input--dark" defaultValue={category.scoringRule?.points_loss ?? 0} name="pointsLoss" type="number" />
              </label>
              <button className="admin-btn admin-btn--primary mt-2" type="submit">
                Guardar regla
              </button>
            </form>
          </AdminModal>

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

          {/* Adjustment Modal */}
          <AdminModal isOpen={modalAdjustment} onClose={() => setModalAdjustment(false)} title="Ajuste manual de puntos">
            <form action={addAdjustmentAction} className="grid gap-3">
              <input name="categoryId" type="hidden" value={category.category.id} />
              <label className="field-shell">
                <span className="field-label field-label--dark">Equipo</span>
                <select className="field-input field-input--dark" defaultValue="" name="teamId" required>
                  <option disabled value="">Selecciona equipo</option>
                  {category.teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.team_name}</option>
                  ))}
                </select>
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Puntos</span>
                <input className="field-input field-input--dark" defaultValue="0" name="pointsDelta" type="number" />
              </label>
              <label className="field-shell">
                <span className="field-label field-label--dark">Motivo</span>
                <textarea className="field-input field-input--dark min-h-20" name="note" required />
              </label>
              <button className="admin-btn admin-btn--primary mt-2" type="submit">
                Guardar ajuste
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
