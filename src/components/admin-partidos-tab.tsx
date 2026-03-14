"use client";

import { useState } from "react";
import Link from "next/link";

import {
  addAdjustmentAction,
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
      {/* Category selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="field-shell flex-1">
          <span className="field-label field-label--dark">Categoria</span>
          <select
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
      </div>

      {category && (
        <>
          {/* Category header */}
          <div className="admin-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="app-kicker">
                  {category.category.sport} · {category.category.age_group}
                </p>
                <h2 className="mt-2 app-title text-2xl text-white">
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

            {/* Quick action buttons */}
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
            </div>
          </div>

          {/* Matches list */}
          <div className="grid gap-4">
            <h3 className="app-kicker">Partidos de fase de grupos</h3>
            {category.matches.length ? (
              category.matches.map((match) => (
                <div key={match.id} className="admin-card">
                  <form action={updateMatchAction} className="grid gap-4">
                    <input name="matchId" type="hidden" value={match.id} />
                    <input name="categoryId" type="hidden" value={category.category.id} />
                    <input name="redirectTo" type="hidden" value={surfacePath} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {match.home_team.team_name} vs {match.away_team.team_name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--app-muted)]">
                          {match.round_label || "Partido"} · {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"}
                        </p>
                      </div>
                      <select className="field-input field-input--dark max-w-52" defaultValue={match.status} name="status">
                        <option value="scheduled">Programado</option>
                        <option value="completed">Finalizado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Local</span>
                        <input className="field-input field-input--dark" defaultValue={match.home_score ?? ""} name="homeScore" type="number" />
                      </label>
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Visitante</span>
                        <input className="field-input field-input--dark" defaultValue={match.away_score ?? ""} name="awayScore" type="number" />
                      </label>
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Fecha y hora</span>
                        <input className="field-input field-input--dark" defaultValue={formatDateTimeLocalValue(match.scheduled_at)} name="scheduledAt" type="datetime-local" />
                      </label>
                      <label className="field-shell">
                        <span className="field-label field-label--dark">Pista o lugar</span>
                        <input className="field-input field-input--dark" defaultValue={match.location ?? ""} name="location" />
                      </label>
                    </div>

                    <label className="field-shell">
                      <span className="field-label field-label--dark">Notas</span>
                      <textarea className="field-input field-input--dark min-h-20" defaultValue={match.notes ?? ""} name="notes" />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button className="admin-btn admin-btn--primary" type="submit">
                        Guardar resultado
                      </button>
                    </div>
                  </form>

                  {/* Delete match */}
                  <form action={deleteMatchAction} className="mt-3">
                    <input name="matchId" type="hidden" value={match.id} />
                    <input name="categoryId" type="hidden" value={category.category.id} />
                    <input name="redirectTo" type="hidden" value={surfacePath} />
                    <button className="admin-btn admin-btn--danger text-xs" type="submit">
                      Eliminar partido
                    </button>
                  </form>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
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

                  <div className="mt-4">
                    <form action={generateQrForResourceAction}>
                      <input name="resourceType" type="hidden" value="category_match" />
                      <input name="resourceId" type="hidden" value={match.id} />
                      <input name="categoryId" type="hidden" value={category.category.id} />
                      <button className="admin-btn admin-btn--secondary text-xs" type="submit">
                        Regenerar QR de partido
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-empty-state">
                Aun no hay partidos creados.
              </div>
            )}
          </div>

          {/* Bracket matches */}
          {category.bracket?.rounds.length ? (
            <div className="grid gap-4">
              <h3 className="app-kicker">Cruces del cuadro</h3>
              {category.bracket.rounds.map(({ round, matches }) => (
                <div key={round.id} className="admin-card">
                  <p className="mb-3 font-semibold text-white">{round.name}</p>
                  <div className="grid gap-4">
                    {matches.map((match) => (
                      <div key={match.id} className="rounded-xl border border-[var(--app-line)] bg-white/[0.03] p-4">
                        <form action={updateBracketMatchAction} className="grid gap-4">
                          <input name="bracketId" type="hidden" value={category.bracket?.bracket.id} />
                          <input name="categoryId" type="hidden" value={category.category.id} />
                          <input name="matchId" type="hidden" value={match.id} />
                          <input name="redirectTo" type="hidden" value={surfacePath} />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-semibold text-white">
                              {match.home_team?.team_name ?? "Pendiente"} vs {match.away_team?.team_name ?? "Pendiente"}
                            </p>
                            <select className="field-input field-input--dark max-w-52" defaultValue={match.status} name="status">
                              <option value="scheduled">Programado</option>
                              <option value="completed">Finalizado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Local</span>
                              <input className="field-input field-input--dark" defaultValue={match.home_score ?? ""} name="homeScore" type="number" />
                            </label>
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Visitante</span>
                              <input className="field-input field-input--dark" defaultValue={match.away_score ?? ""} name="awayScore" type="number" />
                            </label>
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Fecha y hora</span>
                              <input className="field-input field-input--dark" defaultValue={formatDateTimeLocalValue(match.scheduled_at)} name="scheduledAt" type="datetime-local" />
                            </label>
                            <label className="field-shell">
                              <span className="field-label field-label--dark">Pista o lugar</span>
                              <input className="field-input field-input--dark" defaultValue={match.location ?? ""} name="location" />
                            </label>
                          </div>
                          <label className="field-shell">
                            <span className="field-label field-label--dark">Notas</span>
                            <textarea className="field-input field-input--dark min-h-20" defaultValue={match.notes ?? ""} name="notes" />
                          </label>
                          <button className="admin-btn admin-btn--primary" type="submit">
                            Guardar cruce
                          </button>
                        </form>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
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

                        <div className="mt-4">
                          <form action={generateQrForResourceAction}>
                            <input name="resourceType" type="hidden" value="bracket_match" />
                            <input name="resourceId" type="hidden" value={match.id} />
                            <input name="categoryId" type="hidden" value={category.category.id} />
                            <button className="admin-btn admin-btn--secondary text-xs" type="submit">
                              Regenerar QR del cruce
                            </button>
                          </form>
                        </div>
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
