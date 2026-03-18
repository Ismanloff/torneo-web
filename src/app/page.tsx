import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Landmark,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";

import { MatchCountdown } from "@/components/match-countdown";
import { PublicBrandLockup } from "@/components/public-brand-lockup";
import { PublicSiteNav } from "@/components/public-site-nav";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SportTabs } from "@/components/sport-tabs";
import { MetricStrip } from "@/components/surface-primitives";
import { ALLOWED_SPORT_LABELS } from "@/lib/allowed-sports";
import {
  TOURNAMENT_EDITION_LABEL,
  TOURNAMENT_EVENT_DATE_LABEL,
  TOURNAMENT_EVENT_VENUE,
  TOURNAMENT_NAME,
  TOURNAMENT_ORGANIZERS_SHORT,
  TOURNAMENT_VALUE_PROPOSITION,
} from "@/lib/branding";
import { getScoreboardHomeData } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getScoreboardHomeData();
  const isTournamentEmpty = data.totalTeams === 0 && data.totalMatches === 0;

  // Build unique sport list from the categories data, preserving ALLOWED_SPORT_LABELS order
  const sportSet = new Set(data.categories.map((c) => c.category.sport));
  const sports = ALLOWED_SPORT_LABELS.filter((label) =>
    [...sportSet].some(
      (s) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ===
        label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(),
    ),
  );

  // Serialize matches for the countdown banner
  const countdownMatches = data.categories.flatMap((c) =>
    c.matches.map((m) => ({
      id: m.id,
      scheduledAt: m.scheduled_at,
      status: m.status,
      homeTeamName: m.home_team.team_name,
      awayTeamName: m.away_team.team_name,
      location: m.location,
      sport: c.category.sport,
    })),
  );

  return (
    <main className="public-arena">
      <RealtimeRefresh
        channelName="public-scoreboard"
        tables={["category_matches", "bracket_matches", "category_brackets", "team_checkins"]}
      />

      <div className="public-shell">
        <header className="public-topbar">
          <div className="public-wrap">
            <div className="public-topbar__inner">
              <PublicBrandLockup />

              <PublicSiteNav />
            </div>
          </div>
        </header>

        {/* Compact hero */}
        <section className="public-hero">
          <div className="public-wrap mx-auto max-w-6xl py-5 sm:py-6 lg:py-8">
            <div className="public-hero-panel">
              <div className="public-hero-panel__copy">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="public-tag public-tag--accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    {TOURNAMENT_EDITION_LABEL}
                  </span>
                  <span className="public-tag public-tag--soft">
                    <Landmark className="h-3.5 w-3.5" />
                    {TOURNAMENT_EVENT_VENUE}
                  </span>
                </div>
                <h1 className="public-title text-[clamp(2.8rem,11vw,5.9rem)]">
                  {TOURNAMENT_NAME}
                </h1>
                <p className="public-hero-panel__lead mt-3">
                  {TOURNAMENT_VALUE_PROPOSITION}
                </p>
                <p className="public-hero-panel__meta mt-3 text-sm text-[#9fb3d9] sm:mt-4">
                  {TOURNAMENT_EVENT_DATE_LABEL} &middot; {ALLOWED_SPORT_LABELS.join(" · ")}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#b9c7bc]">
                  {TOURNAMENT_ORGANIZERS_SHORT}. Inscribe equipos, sigue marcadores y consulta cruces desde la misma experiencia.
                </p>

                <div className="public-inline-actions mt-5">
                  <Link
                    className="public-action public-action--primary"
                    data-pwa-value-signal="hero-primary"
                    href="/inscripcion"
                  >
                    Inscribir equipo
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <a
                    className="public-action public-action--ghost"
                    data-pwa-value-signal="hero-secondary"
                    href="#clasificacion"
                  >
                    Ver clasificación
                  </a>
                </div>
              </div>

              <div className="public-hero-panel__rail">
                <MetricStrip
                  items={[
                    { label: "Categorías", value: data.categories.length, meta: "Configuradas", tone: "accent" },
                    { label: "Equipos", value: data.totalTeams, meta: "Registrados", tone: "neutral" },
                    { label: "Partidos", value: data.totalMatches, meta: "Programados", tone: "info" },
                  ]}
                />

                <div className="public-hero-note public-hero-note--spotlight">
                  <p className="public-kicker">Hoy importa</p>
                  <p className="public-hero-note__title mt-3">Entrar rápido y seguir la jornada</p>
                  <div className="public-note-list mt-4">
                    <div className="public-note-item">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7e5b7]">Inscripción abierta</p>
                      <p className="mt-1 text-sm leading-6 text-[#d5ddd2]">
                        Si todavía no hay partidos visibles, la inscripción es el primer paso útil.
                      </p>
                    </div>
                    <div className="public-note-item">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7e5b7]">Lectura clara</p>
                      <p className="mt-1 text-sm leading-6 text-[#d5ddd2]">
                        Clasificación, próximos encuentros y cruces quedan agrupados por deporte con menos ruido móvil.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isTournamentEmpty ? (
              <div className="mt-5 public-soft public-soft--warm px-4 py-4 sm:mt-6 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">La jornada empieza por la inscripción.</p>
                    <p className="mt-1 text-sm text-[#d4decd]">
                      Registra el primer equipo y esta pantalla activará automáticamente clasificación, seguimiento y cruces del deporte correspondiente.
                    </p>
                  </div>
                  <Link
                    className="public-action public-action--primary"
                    data-pwa-value-signal="empty-state"
                    href="/inscripcion"
                  >
                    Inscribir equipo
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Countdown banner for upcoming matches */}
        <MatchCountdown matches={countdownMatches} />

        {/* Sport tabs + filtered content */}
        <SportTabs categories={data.categories} sports={[...sports]} />
      </div>
    </main>
  );
}
