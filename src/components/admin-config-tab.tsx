"use client";

import Link from "next/link";

import {
  generateQrForResourceAction,
  lookupTeamByCodeAction,
  logoutAdminAction,
} from "@/app/admin/actions";

import { TOURNAMENT_NAME } from "@/lib/branding";
import { formatDateTime } from "@/lib/utils";
import type {
  AdminArrivalLogEntry,
  AdminMatchCheckinLogEntry,
  ScoreboardCategory,
} from "@/lib/types";

type AdminConfigTabProps = {
  categories: ScoreboardCategory[];
  activeStaffCount: number;
  manualLookupError?: string;
  recentArrivals: AdminArrivalLogEntry[];
  recentMatchCheckins: AdminMatchCheckinLogEntry[];
  totalTeams: number;
  totalMatches: number;
};

function checkinStatusLabel(status: AdminMatchCheckinLogEntry["status"]) {
  if (status === "presentado") return "Presentado";
  if (status === "incidencia") return "Incidencia";
  if (status === "no_presentado") return "No presentado";
  return "Pendiente";
}

export function AdminConfigTab({
  categories,
  activeStaffCount,
  manualLookupError,
  recentArrivals,
  recentMatchCheckins,
  totalTeams,
  totalMatches,
}: AdminConfigTabProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="admin-card">
          <p className="app-kicker">Recursos del torneo</p>
          <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
            QR por equipo
          </h3>
          <div className="mt-4 grid gap-3">
            {categories.map((cat) =>
              cat.teams.length ? (
                <div key={cat.category.id}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--app-muted)]">
                    {cat.category.sport} · {cat.category.name}
                  </p>
                  <div className="grid gap-2">
                    {cat.teams.map((team) => (
                      <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-line)] bg-white/[0.03] px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{team.team_name}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--app-muted)]">
                            {team.registration_code}
                          </p>
                        </div>
                        <form action={generateQrForResourceAction}>
                          <input name="resourceType" type="hidden" value="team" />
                          <input name="resourceId" type="hidden" value={team.id} />
                          <input name="categoryId" type="hidden" value={cat.category.id} />
                          <button className="admin-btn admin-btn--secondary text-xs" type="submit">
                            Regenerar QR
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
            {categories.every((cat) => cat.teams.length === 0) && (
              <div className="admin-empty-state">Sin equipos registrados.</div>
            )}
          </div>
        </div>

        <div className="grid gap-6 content-start">
          <div className="admin-card">
            <p className="app-kicker">Vista de gestión</p>
            <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
              Resumen del torneo
            </h3>
            <div className="mt-4 grid gap-2 text-sm text-[var(--app-muted)]">
              <p>
                Torneo: <strong className="text-white">{TOURNAMENT_NAME}</strong>
              </p>
              <p>
                Equipos: <strong className="text-white">{totalTeams}</strong>
              </p>
              <p>
                Partidos: <strong className="text-white">{totalMatches}</strong>
              </p>
              <p>
                Staff activo: <strong className="text-white">{activeStaffCount}</strong>
              </p>
              <p>
                Categorías: <strong className="text-white">{categories.length}</strong>
              </p>
            </div>
          </div>

          <div className="admin-card">
            <p className="app-kicker">Acceso manual</p>
            <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
              Abrir equipo por código
            </h3>
            <form action={lookupTeamByCodeAction} className="mt-4 grid gap-3">
              <input name="redirectTo" type="hidden" value="/app/admin" />
              <label className="field-shell">
                <span className="field-label field-label--dark">Código del equipo</span>
                <input
                  required
                  className="field-input field-input--dark"
                  name="registrationCode"
                  placeholder="LOBOS-SAN-JOSE-282"
                />
              </label>
              <button className="admin-btn admin-btn--secondary" type="submit">
                Abrir ficha del equipo
              </button>
              {manualLookupError === "codigo" ? (
                <p className="text-sm text-[var(--app-accent)]">Introduce un código válido.</p>
              ) : null}
              {manualLookupError === "no-team" ? (
                <p className="text-sm text-[var(--app-accent)]">No existe ningún equipo con ese código.</p>
              ) : null}
              <p className="text-sm text-[var(--app-muted)]">
                Usa este acceso solo si el equipo no trae QR o el móvil falla.
              </p>
            </form>
          </div>

          <div className="admin-card">
            <p className="app-kicker">Sesión y acceso</p>
            <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
              Control de sesión
            </h3>
            <div className="mt-4 grid gap-3">
              <p className="text-sm text-[var(--app-muted)]">
                Estás conectado como administrador del torneo. Desde aquí puedes cerrar sesión de forma segura.
              </p>
              <form action={logoutAdminAction}>
                <button className="admin-btn admin-btn--danger" type="submit">
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-card">
          <p className="app-kicker">Log operativo</p>
          <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
            Últimas llegadas
          </h3>
          <div className="mt-4 grid gap-3">
            {recentArrivals.length ? (
              recentArrivals.map((entry) => (
                <Link
                  key={`${entry.teamId}:${entry.checkedInAt}`}
                  className="rounded-xl border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 transition hover:border-[var(--app-accent-strong)] hover:bg-white/[0.05]"
                  href={`/app/equipo/${entry.teamId}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.teamName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--app-muted)]">
                        {entry.registrationCode} · {entry.sport} · {entry.categoryName}
                      </p>
                    </div>
                    <span className="app-chip app-chip--accent">Llegó</span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--app-muted)]">{formatDateTime(entry.checkedInAt)}</p>
                </Link>
              ))
            ) : (
              <div className="admin-empty-state">Todavía no hay llegadas registradas.</div>
            )}
          </div>
        </div>

        <div className="admin-card">
          <p className="app-kicker">Log operativo</p>
          <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
            Últimos check-ins de partido
          </h3>
          <div className="mt-4 grid gap-3">
            {recentMatchCheckins.length ? (
              recentMatchCheckins.map((entry) => (
                <Link
                  key={entry.key}
                  className="rounded-xl border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 transition hover:border-[var(--app-accent-strong)] hover:bg-white/[0.05]"
                  href={`/app/partido/${entry.matchId}?scope=${entry.matchScope}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.teamName}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--app-muted)]">
                        {entry.matchLabel}
                      </p>
                    </div>
                    <span className="app-chip">{checkinStatusLabel(entry.status)}</span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--app-muted)]">
                    {entry.categoryName} · {formatDateTime(entry.checkedInAt)}
                  </p>
                  {entry.recordedByName || entry.incidentLabel ? (
                    <p className="mt-2 text-sm text-[var(--app-muted)]">
                      {entry.recordedByName ? `Mesa: ${entry.recordedByName}` : null}
                      {entry.recordedByName && entry.incidentLabel ? " · " : null}
                      {entry.incidentLabel ? entry.incidentLabel : null}
                    </p>
                  ) : null}
                </Link>
              ))
            ) : (
              <div className="admin-empty-state">Todavía no hay check-ins de partido registrados.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
