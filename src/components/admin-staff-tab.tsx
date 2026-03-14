"use client";

import { inviteStaffAction, removeStaffAction } from "@/app/admin/actions";
import { formatStaffRoleLabel } from "@/lib/utils";

import type { StaffProfileRow } from "@/lib/types";

type AdminStaffTabProps = {
  staffProfiles: StaffProfileRow[];
};

export function AdminStaffTab({ staffProfiles }: AdminStaffTabProps) {
  const activeStaff = staffProfiles.filter((profile) => profile.is_active);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* Invite staff form */}
      <div className="admin-card">
        <p className="app-kicker">Alta de staff</p>
        <form action={inviteStaffAction} className="mt-4 grid gap-3">
          <label className="field-shell">
            <span className="field-label field-label--dark">Nombre</span>
            <input className="field-input field-input--dark" name="fullName" placeholder="Nombre y apellidos" required />
          </label>
          <label className="field-shell">
            <span className="field-label field-label--dark">Correo</span>
            <input className="field-input field-input--dark" name="email" placeholder="persona@colegio.es" required type="email" />
          </label>
          <label className="field-shell">
            <span className="field-label field-label--dark">Rol</span>
            <select className="field-input field-input--dark" defaultValue="assistant" name="role">
              <option value="assistant">Organizacion</option>
              <option value="referee">Arbitro</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="admin-btn admin-btn--primary mt-2" type="submit">
            Crear y enviar acceso
          </button>
        </form>
      </div>

      {/* Staff list */}
      <div className="admin-card">
        <p className="app-kicker">Staff activo</p>
        <div className="mt-4 grid gap-3">
          {activeStaff.length ? (
            activeStaff.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-line)] bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{profile.full_name}</p>
                  <p className="mt-0.5 text-sm text-[var(--app-muted)]">
                    {profile.email} · {formatStaffRoleLabel(profile.role)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--app-muted)]">
                    {profile.auth_user_id ? "Cuenta enlazada" : "Pendiente de primer acceso"}
                  </p>
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
              Todavia no hay staff operativo cargado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
