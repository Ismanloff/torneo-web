import Link from "next/link";
import { ArrowUpRight, Search, Users } from "lucide-react";

import { requireStaffSession } from "@/lib/admin-auth";
import { EmptyStatePanel, MetricStrip } from "@/components/surface-primitives";
import { getOperationalDashboardData } from "@/lib/supabase/queries";

export default async function StaffTeamsPage() {
  const staff = await requireStaffSession();
  const data = await getOperationalDashboardData(staff);

  return (
    <main className="grid gap-6">
      <section className="app-hero app-hero--compact">
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
              <h1 className="app-title mt-3 text-[clamp(2.6rem,10vw,4.4rem)] text-white">Equipos</h1>
              <p className="app-copy mt-3 max-w-2xl text-sm sm:text-base">
                Acceso rápido a las fichas de equipo para validar llegada, revisar próximos partidos
                y abrir el flujo de mesa sin depender solo del escáner.
              </p>
            </div>
          </div>

          <MetricStrip
            items={[
              { label: "Equipos", value: data.teams.length, meta: "Visibles en tu rol", tone: "accent" },
              { label: "Acceso", value: "QR", meta: "Más rápido si lo tienes", tone: "neutral" },
              { label: "Fallback", value: "Búsqueda", meta: "Si no hay código", tone: "info" },
            ]}
          />
        </div>
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-kicker">Listado operativo</p>
            <h2 className="app-section-title mt-3 text-[2.2rem] text-white">Todos los equipos</h2>
          </div>
          <Link className="app-link-pill" href="/app/scan">
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Escanear QR
            </span>
          </Link>
        </div>

        <div className="mt-5 data-list">
          {data.teams.length ? (
            data.teams.map((team) => (
              <Link
                key={team.id}
                className="data-row row-surface app-row-link"
                href={`/app/equipo/${team.id}`}
              >
                <div className="data-row__main">
                  <p className="app-metric__label">{team.category.name}</p>
                  <p className="mt-2 truncate text-lg font-semibold text-white">{team.team_name}</p>
                  <p className="mt-2 font-mono text-sm text-[var(--app-muted)]">{team.registration_code}</p>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    {team.category.sport} · {team.category.age_group}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[var(--app-muted)]" />
              </Link>
            ))
          ) : (
            <EmptyStatePanel
              compact
              eyebrow="Equipos"
              title="No hay equipos visibles para esta cuenta"
              description="Cuando la organización te asigne categorías o equipos aparecerán aquí."
            />
          )}
        </div>
      </section>
    </main>
  );
}
