import Link from "next/link";
import { ArrowRight, CalendarClock, QrCode, Users } from "lucide-react";

import { requireStaffSession } from "@/lib/admin-auth";
import { getOperationalDashboardData } from "@/lib/supabase/queries";
import { PushPermissionBanner } from "@/components/push-permission-banner";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusChipClass(status: string) {
  if (status === "completed") return "app-chip app-chip--muted";
  if (status === "in_progress") return "app-chip app-chip--accent";
  return "app-chip";
}

function statusLabel(status: string) {
  if (status === "completed") return "Finalizado";
  if (status === "in_progress") return "En juego";
  if (status === "scheduled") return "Pendiente";
  return status;
}

export default async function StaffAppHomePage() {
  const staff = await requireStaffSession();
  const data = await getOperationalDashboardData(staff);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  // Next match: first non-completed match closest in time
  const nextMatch =
    data.assignedMatches.find((m) => m.status !== "completed") ?? null;

  // Today's matches
  const todayMatches = data.assignedMatches.filter((m) => {
    if (!m.scheduledAt) return false;
    const d = new Date(m.scheduledAt);
    return d >= todayStart && d < todayEnd;
  });

  return (
    <main className="grid gap-5">
      {/* ── Push notification permission banner ── */}
      <PushPermissionBanner />

      {/* ── Desktop two-column layout ── */}
      <div className="lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6">
        {/* Left column: Next match card */}
        <section>
          <p className="app-kicker mb-3">Siguiente partido</p>
          {nextMatch ? (
            <Link
              className="app-panel-strong block"
              href={`/app/partido/${nextMatch.matchId}?scope=${nextMatch.scope}`}
            >
              <p className="text-xl font-semibold">
                {nextMatch.homeTeam?.team_name ?? "Pendiente"} vs{" "}
                {nextMatch.awayTeam?.team_name ?? "Pendiente"}
              </p>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {nextMatch.scheduledAt ? formatTime(nextMatch.scheduledAt) : "Sin hora"} ·{" "}
                {nextMatch.location ?? "Sin pista"}
              </p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                {nextMatch.sport} · {nextMatch.ageGroup}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--app-accent)]">
                Ir al partido <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ) : (
            <div className="app-panel">
              <p className="text-sm text-[var(--app-muted)]">Sin partidos asignados</p>
              <Link
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--app-accent)]"
                href="/app/partidos"
              >
                Ver agenda <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        {/* Right column: Quick actions + Today's matches */}
        <div className="mt-5 lg:mt-0 grid gap-5">
          {/* ── Quick actions ── */}
          <section className="grid grid-cols-2 gap-3 lg:flex lg:gap-4">
            <Link className="app-panel flex flex-col items-center gap-2 py-5 text-center lg:flex-1" href="/app/scan">
              <QrCode className="h-6 w-6 text-[var(--app-accent)]" />
              <span className="text-sm font-semibold">Scan QR</span>
            </Link>
            <Link className="app-panel flex flex-col items-center gap-2 py-5 text-center lg:flex-1" href="/app/equipos">
              <Users className="h-6 w-6 text-[var(--app-accent)]" />
              <span className="text-sm font-semibold">Equipos</span>
            </Link>
          </section>

          {/* ── Today's matches ── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[var(--app-muted)]" />
              <p className="app-kicker">
                Mis partidos hoy{" "}
                <span className="text-[var(--app-muted)]">({todayMatches.length})</span>
              </p>
            </div>

            {todayMatches.length ? (
              <div className="grid gap-2">
                {todayMatches.map((match) => (
                  <Link
                    key={`${match.scope}:${match.matchId}`}
                    className="app-soft-card flex items-center justify-between gap-3"
                    href={`/app/partido/${match.matchId}?scope=${match.scope}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--app-text)]">
                        {match.scheduledAt ? formatTime(match.scheduledAt) : "--:--"}
                      </span>
                      <span className="truncate text-sm">
                        {match.homeTeam?.team_name ?? "Pend."} – {match.awayTeam?.team_name ?? "Pend."}
                      </span>
                    </div>
                    <span className={`${statusChipClass(match.status)} shrink-0 px-2 py-0.5 text-[0.65rem]`}>
                      {statusLabel(match.status)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="app-soft-card text-sm text-[var(--app-muted)]">
                No tienes partidos programados para hoy.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
