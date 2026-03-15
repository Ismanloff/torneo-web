import Link from "next/link";
import { ArrowRight, CalendarClock, QrCode, Shield, Sparkles, Users } from "lucide-react";

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
  if (status === "completed") return "border-white/8 bg-white/[0.03] text-[var(--app-muted)]";
  if (status === "in_progress") return "border-[rgba(141,246,95,0.2)] bg-[var(--app-accent-soft)] text-[#d8ffc7]";
  return "border-[rgba(97,216,255,0.16)] bg-[rgba(97,216,255,0.08)] text-[#cceeff]";
}

function statusLabel(status: string) {
  if (status === "completed") return "Finalizado";
  if (status === "in_progress") return "En juego";
  if (status === "scheduled") return "Pendiente";
  return status;
}

function getRoleHomeContent(role: string, hasNextMatch: boolean) {
  if (role === "assistant") {
    return {
      eyebrow: "Mesa y llegada",
      title: hasNextMatch ? "Tu siguiente check-in" : "Sin entradas pendientes",
      copy: "Prioriza escaneo, control de llegada y acceso rápido a equipos desde pista o mesa.",
      managementCard: null,
    };
  }

  if (role === "referee") {
    return {
      eyebrow: "Arbitraje en pista",
      title: hasNextMatch ? "Tu próximo arbitraje" : "Sin arbitrajes pendientes",
      copy: "Prioriza resultado, estado del partido y ritmo de jornada con una interfaz limpia.",
      managementCard: null,
    };
  }

  return {
    eyebrow: "Vista operativa",
    title: hasNextMatch ? "Tu próximo partido" : "Jornada despejada",
    copy: "Prioriza escaneo, entrada a mesa y seguimiento de agenda sin ruido visual.",
    managementCard: "admin",
  };
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
  const liveMatches = data.assignedMatches.filter((m) => m.status === "in_progress").length;
  const roleContent = getRoleHomeContent(staff.profile.role, Boolean(nextMatch));

  return (
    <main className="grid gap-5">
      <section className="app-hero">
        <div className="app-hero__content grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div className="space-y-5">
            <div className="app-chip-row">
              <span className="app-chip app-chip--accent">
                <Sparkles className="h-4 w-4" />
                {roleContent.eyebrow}
              </span>
              <span className="app-chip">
                {todayMatches.length} partidos hoy
              </span>
              <span className="app-chip">
                {liveMatches} en juego
              </span>
            </div>

            <div>
              <p className="app-kicker">Siguiente foco</p>
              <h1 className="app-title mt-3 text-5xl text-white sm:text-6xl">
                {roleContent.title}
              </h1>
              <p className="app-copy mt-4 max-w-2xl text-sm sm:text-base">
                {roleContent.copy}
              </p>
            </div>

            {nextMatch ? (
              <Link
                className="app-panel-strong block max-w-3xl"
                href={`/app/partido/${nextMatch.matchId}?scope=${nextMatch.scope}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="app-kicker">En agenda</p>
                    <p className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.35rem]">
                      {nextMatch.homeTeam?.team_name ?? "Pendiente"} vs{" "}
                      {nextMatch.awayTeam?.team_name ?? "Pendiente"}
                    </p>
                    <p className="mt-3 text-sm text-[var(--app-muted)]">
                      {nextMatch.sport} · {nextMatch.ageGroup} · {nextMatch.location ?? "Sin pista"}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/15 px-4 py-3 text-right">
                    <p className="app-metric__label">Hora</p>
                    <p className="font-mono text-2xl font-semibold text-white">
                      {nextMatch.scheduledAt ? formatTime(nextMatch.scheduledAt) : "--:--"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-accent)]">
                  Abrir mesa del partido <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ) : (
              <div className="app-panel max-w-xl">
                <p className="text-sm text-[var(--app-muted)]">Sin partidos pendientes en tu cola actual.</p>
                <Link
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-accent)]"
                  href="/app/partidos"
                >
                  Revisar agenda completa <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="app-soft-card">
              <p className="app-metric__label">Asignados</p>
              <p className="app-metric__value mt-3 text-white">{data.assignedMatches.length}</p>
              <p className="mt-2 text-sm text-[var(--app-muted)]">Partidos visibles para tu perfil</p>
            </div>
            <div className="app-soft-card">
              <p className="app-metric__label">Equipos</p>
              <p className="app-metric__value mt-3 text-white">{data.teams.length}</p>
              <p className="mt-2 text-sm text-[var(--app-muted)]">Consultables desde pista</p>
            </div>
            <div className="app-soft-card">
              <p className="app-metric__label">Live</p>
              <p className="app-metric__value mt-3 text-white">{liveMatches}</p>
              <p className="mt-2 text-sm text-[var(--app-muted)]">Marcadores activos ahora</p>
            </div>
          </div>
        </div>
      </section>

      <PushPermissionBanner />

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className={`grid gap-3 ${staff.profile.role === "admin" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Link className="app-panel group" href="/app/scan">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="app-kicker">{staff.profile.role === "referee" ? "Acceso rápido" : "Entrada rápida"}</p>
                <p className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">
                  Escanear QR
                </p>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  {staff.profile.role === "referee"
                    ? "Abre partido o identifica equipo sin salir del flujo de arbitraje."
                    : "Abre equipo o partido desde pista en un gesto."}
                </p>
              </div>
              <QrCode className="h-6 w-6 text-[var(--app-accent)] transition group-hover:scale-105" />
            </div>
          </Link>
          <Link className="app-panel group" href="/app/equipos">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="app-kicker">{staff.profile.role === "assistant" ? "Apoyo" : "Consulta"}</p>
                <p className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">
                  Equipos
                </p>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  {staff.profile.role === "assistant"
                    ? "Fichas y codigos para control de llegada y apoyo de mesa."
                    : "Acceso manual a fichas y códigos sin depender del QR."}
                </p>
              </div>
              <Users className="h-6 w-6 text-[var(--app-info)] transition group-hover:scale-105" />
            </div>
          </Link>
          {roleContent.managementCard === "admin" ? (
            <Link className="app-panel group" href="/app/admin">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="app-kicker">Gestión</p>
                  <p className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-white">
                    Panel
                  </p>
                  <p className="mt-2 text-sm text-[var(--app-muted)]">
                    Calendario, staff, recursos y configuración fuera del flujo de pista.
                  </p>
                </div>
                <Shield className="h-6 w-6 text-[var(--app-accent)] transition group-hover:scale-105" />
              </div>
            </Link>
          ) : null}
        </section>

        <section className="app-panel">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[var(--app-muted)]" />
              <p className="app-kicker">Mis partidos de hoy</p>
            </div>
            <Link className="text-sm font-semibold text-[var(--app-accent)]" href="/app/partidos">
              Ver agenda
            </Link>
          </div>

          <div className="mt-4 grid gap-2">
            {todayMatches.length ? (
              todayMatches.map((match) => (
                <Link
                  key={`${match.scope}:${match.matchId}`}
                  className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]"
                  href={`/app/partido/${match.matchId}?scope=${match.scope}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold tabular-nums text-white">
                        {match.scheduledAt ? formatTime(match.scheduledAt) : "--:--"}
                      </span>
                      <span className="truncate text-sm font-medium text-white">
                        {match.homeTeam?.team_name ?? "Pend."} - {match.awayTeam?.team_name ?? "Pend."}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
                      {match.location ?? "Sin pista"} · {match.sport} · {match.ageGroup}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-[0.68rem] font-semibold ${statusChipClass(match.status)}`}
                  >
                    {statusLabel(match.status)}
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-[var(--app-line)] px-4 py-6 text-sm text-[var(--app-muted)]">
                No tienes partidos programados para hoy.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
