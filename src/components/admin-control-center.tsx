import Link from "next/link";

import { requireAdminSession } from "@/lib/admin-auth";
import { ALLOWED_SPORT_LABELS } from "@/lib/allowed-sports";
import { getAdminScoreboardData } from "@/lib/supabase/queries";

import { AdminTabs } from "@/components/admin-tabs-shell";

type AdminControlCenterProps = {
  surfacePath?: string;
};

export async function AdminControlCenter({
  surfacePath = "/app/admin",
}: AdminControlCenterProps = {}) {
  await requireAdminSession();
  const data = await getAdminScoreboardData();
  const activeStaff = data.staffProfiles.filter((profile) => profile.is_active);

  return (
    <main className="app-canvas">
      <div className="app-shell">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          {/* Hero section */}
          <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="app-panel-strong">
              <div className="app-hero__content relative z-[1]">
                <p className="app-kicker">Panel maestro</p>
                <h1 className="mt-3 app-title text-4xl lg:text-5xl text-white">
                  {data.tournament.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
                  Controla scoring, cruces, staff, QR y operativa movil para {ALLOWED_SPORT_LABELS.join(", ")}.
                </p>
              </div>
            </article>

            <article className="app-panel">
              <p className="app-kicker">Resumen</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="app-soft-card text-center">
                  <p className="app-metric__value text-2xl text-white">{data.totalTeams}</p>
                  <p className="app-metric__label mt-1">Equipos</p>
                </div>
                <div className="app-soft-card text-center">
                  <p className="app-metric__value text-2xl text-white">{data.totalMatches}</p>
                  <p className="app-metric__label mt-1">Partidos</p>
                </div>
                <div className="app-soft-card text-center">
                  <p className="app-metric__value text-2xl text-white">{activeStaff.length}</p>
                  <p className="app-metric__label mt-1">Staff</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="app-link-pill" href="/">
                  Portal publico
                </Link>
                <Link className="app-link-pill" href="/app">
                  Dashboard
                </Link>
                <Link className="app-link-pill" href="/app/scan">
                  Escanear QR
                </Link>
                <Link className="app-link-pill" href="/app/equipos">
                  Equipos
                </Link>
              </div>
            </article>
          </section>

          {/* Tabs */}
          <section className="mt-8">
            <AdminTabs
              categories={data.categories}
              staffProfiles={data.staffProfiles}
              tournament={data.tournament}
              totalTeams={data.totalTeams}
              totalMatches={data.totalMatches}
              activeStaffCount={activeStaff.length}
              surfacePath={surfacePath}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
