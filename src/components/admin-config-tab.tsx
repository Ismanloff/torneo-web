"use client";

import { generateQrForResourceAction, logoutAdminAction } from "@/app/admin/actions";

import type { ScoreboardCategory, TournamentRow } from "@/lib/types";

type AdminConfigTabProps = {
  categories: ScoreboardCategory[];
  tournament: TournamentRow;
  activeStaffCount: number;
  totalTeams: number;
  totalMatches: number;
};

export function AdminConfigTab({
  categories,
  tournament,
  activeStaffCount,
  totalTeams,
  totalMatches,
}: AdminConfigTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
          <p className="app-kicker">Vista de gestion</p>
          <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
            Resumen del torneo
          </h3>
          <div className="mt-4 grid gap-2 text-sm text-[var(--app-muted)]">
            <p>
              Torneo: <strong className="text-white">{tournament.name}</strong>
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
              Categorias: <strong className="text-white">{categories.length}</strong>
            </p>
          </div>
        </div>

        <div className="admin-card">
          <p className="app-kicker">Sesion y acceso</p>
          <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
            Control de sesion
          </h3>
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-[var(--app-muted)]">
              Estas conectado como administrador del torneo. Desde aqui puedes cerrar sesion de forma segura.
            </p>
            <form action={logoutAdminAction}>
              <button className="admin-btn admin-btn--danger" type="submit">
                Cerrar sesion
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
