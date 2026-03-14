import Link from "next/link";
import { Search, Users } from "lucide-react";

import { requireStaffSession } from "@/lib/admin-auth";
import { getOperationalDashboardData } from "@/lib/supabase/queries";

export default async function StaffTeamsPage() {
  const staff = await requireStaffSession();
  const data = await getOperationalDashboardData(staff);

  return (
    <main className="grid gap-6">
      <section className="app-hero">
        <div className="app-hero__content grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <div className="app-chip-row">
              <span className="app-chip app-chip--accent">
                <Users className="h-4 w-4" />
                Equipos visibles
              </span>
              <span className="app-chip">
                {data.teams.length} equipos
              </span>
            </div>

            <div>
              <p className="app-kicker">Consulta operativa</p>
              <h1 className="app-title mt-3 text-6xl sm:text-7xl">Equipos</h1>
              <p className="app-copy mt-4 max-w-2xl">
                Acceso rápido a las fichas de equipo para validar llegada, revisar próximos partidos
                y abrir el flujo de mesa sin depender solo del escáner.
              </p>
            </div>
          </div>

          <article className="app-soft-card">
            <p className="app-metric__label">Atajo recomendado</p>
            <p className="mt-3 text-xl font-semibold">Escanear si tienes el QR, buscar si no</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="app-action" href="/app/scan">
                Abrir escaner
              </Link>
              <Link className="app-link-pill" href="/app/scan">
                Buscar por codigo
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-kicker">Listado operativo</p>
            <h2 className="app-section-title mt-3 text-[2.4rem]">Todos los equipos</h2>
          </div>
          <Link className="app-link-pill" href="/app/scan">
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Escanear QR
            </span>
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.teams.length ? (
            data.teams.map((team) => (
              <Link key={team.id} className="app-soft-card" href={`/app/equipo/${team.id}`}>
                <p className="app-metric__label">{team.category.name}</p>
                <p className="mt-2 text-xl font-semibold">{team.team_name}</p>
                <p className="mt-3 text-sm text-[var(--app-muted)]">{team.registration_code}</p>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  {team.category.sport} · {team.category.age_group}
                </p>
              </Link>
            ))
          ) : (
            <div className="app-soft-card text-sm text-[var(--app-muted)]">
              No hay equipos visibles para esta cuenta.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
