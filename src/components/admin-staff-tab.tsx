"use client";

import { createStaffAction, removeStaffAction } from "@/app/admin/actions";
import { formatStaffRoleLabel } from "@/lib/utils";

import type { StaffProfileRow } from "@/lib/types";

type AdminStaffTabProps = {
  staffProfiles: StaffProfileRow[];
};

export function AdminStaffTab({ staffProfiles }: AdminStaffTabProps) {
  const activeStaff = staffProfiles.filter((profile) => profile.is_active);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="admin-card">
        <p className="app-kicker">Alta de staff</p>
        <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
          Nuevo perfil operativo
        </h3>
        <form action={createStaffAction} className="mt-4 grid gap-3">
          <label className="field-shell">
            <span className="field-label field-label--dark">Nombre</span>
            <input className="field-input field-input--dark" name="fullName" placeholder="Nombre y apellidos" required />
          </label>
          <label className="field-shell">
            <span className="field-label field-label--dark">Rol</span>
            <select className="field-input field-input--dark" defaultValue="referee" name="role">
              <option value="referee">Árbitro</option>
              <option value="assistant">Organización</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="admin-btn admin-btn--primary mt-2" type="submit">
            Crear staff (genera PIN)
          </button>
        </form>
      </div>

      <div className="admin-card">
        <p className="app-kicker">Staff activo</p>
        <h3 className="mt-3 font-display text-[1.9rem] font-semibold tracking-[-0.04em] text-white">
          Equipo en pista
        </h3>
        <div className="mt-4 grid gap-3">
          {activeStaff.length ? (
            activeStaff.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3.5">
                <div>
                  <p className="font-semibold text-white">{profile.full_name}</p>
                  <p className="mt-0.5 text-sm text-[var(--app-muted)]">
                    {formatStaffRoleLabel(profile.role)}
                  </p>
                  {profile.pin ? (
                    <p className="font-mono mt-1.5 text-lg font-bold tracking-[0.3em] text-[var(--app-accent)]">
                      {profile.pin}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--app-muted)]">
                      Sin PIN asignado
                    </p>
                  )}
                </div>
                <form action={removeStaffAction}>
                  <input name="staffId" type="hidden" value={profile.id} />
                  <input name="redirectTo" type="hidden" value="/app/admin" />
                  <button className="admin-btn admin-btn--danger text-xs" type="submit">
                    Desactivar
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="admin-empty-state">
              Todavía no hay staff operativo cargado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
