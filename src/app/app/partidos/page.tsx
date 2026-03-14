import { CalendarClock, ShieldCheck } from "lucide-react";

import { MatchFilters } from "@/components/match-filters";
import { requireStaffSession } from "@/lib/admin-auth";
import { getOperationalDashboardData } from "@/lib/supabase/queries";

export default async function StaffMatchesPage() {
  const staff = await requireStaffSession();
  const data = await getOperationalDashboardData(staff);

  // Serialize to plain objects the client component can consume
  const matchItems = data.assignedMatches.map((m) => ({
    scope: m.scope,
    matchId: m.matchId,
    categoryName: m.categoryName,
    location: m.location,
    scheduledAt: m.scheduledAt,
    status: m.status,
    homeTeamName: m.homeTeam?.team_name ?? "Pendiente",
    awayTeamName: m.awayTeam?.team_name ?? "Pendiente",
    duty: m.duty,
  }));

  return (
    <main className="grid gap-6">
      <section className="app-hero">
        <div className="app-hero__content">
          <div className="flex flex-wrap items-center gap-3">
            <span className="app-chip app-chip--accent">
              <CalendarClock className="h-4 w-4" />
              Partidos asignados
            </span>
            <span className="app-chip">
              <ShieldCheck className="h-4 w-4" />
              {data.assignedMatches.length} total
            </span>
          </div>
          <p className="app-kicker mt-5">Agenda personal</p>
          <h1 className="app-section-title mt-3 text-white">Mis partidos</h1>
          <p className="app-copy mt-4 max-w-2xl text-sm">
            Cambia entre hoy, próximos y todo el histórico sin perder contexto de hora, pista y estado.
          </p>
        </div>
      </section>

      <section className="app-panel">
        <div className="flex flex-wrap items-center gap-3">
          <span className="app-chip app-chip--accent">
            <CalendarClock className="h-4 w-4" />
            Partidos asignados
          </span>
          <span className="app-chip">
            <ShieldCheck className="h-4 w-4" />
            {data.assignedMatches.length} total
          </span>
        </div>
        <div className="mt-4">
          <MatchFilters matches={matchItems} />
        </div>
      </section>
    </main>
  );
}
