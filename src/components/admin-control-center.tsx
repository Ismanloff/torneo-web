import { ClipboardList, Settings2, Users } from "lucide-react";

import { requireAdminSession } from "@/lib/admin-auth";
import { TOURNAMENT_NAME } from "@/lib/branding";
import { getAdminScoreboardData } from "@/lib/supabase/queries";

import { AdminTabs } from "@/components/admin-tabs-shell";
import { MetricStrip } from "@/components/surface-primitives";

type AdminControlCenterProps = {
  createdPin?: string;
  createdStaffName?: string;
  manualLookupError?: string;
  surfacePath?: string;
};

export async function AdminControlCenter({
  createdPin,
  createdStaffName,
  manualLookupError,
  surfacePath = "/app/admin",
}: AdminControlCenterProps = {}) {
  const access = await requireAdminSession();
  const data = await getAdminScoreboardData();
  const activeStaff = data.staffProfiles.filter((profile) => profile.is_active);

  return (
    <main className="grid gap-6">
      <section className="app-hero">
        <div className="app-hero__content grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <article>
            <p className="app-kicker">Gestión del torneo</p>
            <h1 className="app-title mt-3 text-5xl text-white lg:text-6xl">
              Panel de gestión
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
              Configura calendario, estructura competitiva, staff y recursos del torneo {TOURNAMENT_NAME}. La operativa en vivo se ejecuta desde Partidos, Equipos y Escáner.
            </p>
          </article>

          <MetricStrip
            items={[
              { label: "Equipos", value: data.totalTeams, meta: "Registrados", tone: "accent" },
              { label: "Partidos", value: data.totalMatches, meta: "Calendario activo", tone: "neutral" },
              { label: "Staff", value: activeStaff.length, meta: "Perfiles activos", tone: "info" },
            ]}
          />
        </div>
      </section>

      <section className="app-panel">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="row-surface p-4">
            <div className="flex items-center gap-2 text-[var(--app-accent)]">
              <ClipboardList className="h-4 w-4" />
              <p className="app-kicker text-[var(--app-accent)]">Calendario</p>
            </div>
            <p className="mt-3 text-sm text-[var(--app-muted)]">Altas de partidos, reglas, ajustes y cuadro.</p>
          </div>
          <div className="row-surface p-4">
            <div className="flex items-center gap-2 text-[var(--app-info)]">
              <Users className="h-4 w-4" />
              <p className="app-kicker text-[var(--app-info)]">Staff</p>
            </div>
            <p className="mt-3 text-sm text-[var(--app-muted)]">Altas, desactivaciones y reparto de roles operativos.</p>
          </div>
          <div className="row-surface p-4">
            <div className="flex items-center gap-2 text-[var(--app-accent)]">
              <Settings2 className="h-4 w-4" />
              <p className="app-kicker text-[var(--app-accent)]">Recursos</p>
            </div>
            <p className="mt-3 text-sm text-[var(--app-muted)]">QR por equipo, resumen del torneo y cierre de sesión.</p>
          </div>
        </div>
      </section>

      <section>
        <AdminTabs
          categories={data.categories}
          createdPin={createdPin}
          createdStaffName={createdStaffName}
          staffProfiles={data.staffProfiles}
          manualLookupError={manualLookupError}
          recentArrivals={data.recentArrivals}
          recentMatchCheckins={data.recentMatchCheckins}
          tournament={data.tournament}
          viewerRole={access.role}
          totalTeams={data.totalTeams}
          totalMatches={data.totalMatches}
          activeStaffCount={activeStaff.length}
          surfacePath={surfacePath}
        />
      </section>
    </main>
  );
}
