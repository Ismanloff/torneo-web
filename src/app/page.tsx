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
import { ALLOWED_SPORT_LABELS } from "@/lib/allowed-sports";
import {
  TOURNAMENT_EDITION_LABEL,
  TOURNAMENT_EVENT_DATE_LABEL,
  TOURNAMENT_NAME,
  TOURNAMENT_ORGANIZERS_SHORT,
  TOURNAMENT_ORGANIZERS_LABEL,
  TOURNAMENT_PARTICIPATION_LABEL,
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
                    Sporti y parroquias
                  </span>
                </div>
                <h1 className="public-title text-[clamp(2.8rem,11vw,5.9rem)]">
                  {TOURNAMENT_NAME}
                </h1>
                <p className="public-hero-panel__meta mt-3 text-sm text-[#9fb3d9] sm:mt-4">
                  {TOURNAMENT_EVENT_DATE_LABEL} &middot; {ALLOWED_SPORT_LABELS.join(" · ")}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c2cfdf]">
                  {TOURNAMENT_ORGANIZERS_LABEL}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[#c2cfdf]">
                  {TOURNAMENT_PARTICIPATION_LABEL}
                </p>

                <div className="public-inline-actions mt-5">
                  <a className="public-action public-action--ghost" href="#clasificacion">
                    Ver clasificación
                  </a>
                  <Link className="public-action public-action--subtle" href="/inscripcion">
                    Inscribir equipo
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="public-hero-panel__rail">
                <div className="public-hero-stats">
                  <div className="public-hero-stat">
                    <div className="public-hero-stat__icon">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="public-hero-stat__label">Categorías</p>
                      <p className="public-hero-stat__value">{data.categories.length}</p>
                    </div>
                  </div>
                  <div className="public-hero-stat">
                    <div className="public-hero-stat__icon">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="public-hero-stat__label">Equipos</p>
                      <p className="public-hero-stat__value">{data.totalTeams}</p>
                    </div>
                  </div>
                  <div className="public-hero-stat">
                    <div className="public-hero-stat__icon">
                      <Swords className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="public-hero-stat__label">Partidos</p>
                      <p className="public-hero-stat__value">{data.totalMatches}</p>
                    </div>
                  </div>
                </div>

                <div className="public-hero-note">
                  <p className="public-kicker">Organización</p>
                  <p className="public-hero-note__title mt-3">{TOURNAMENT_ORGANIZERS_SHORT}</p>
                  <p className="mt-3 text-sm leading-7 text-[#c2cfdf]">
                    Cuarta edición del torneo. Sigue resultados, consulta cruces y mantén la inscripción abierta sin perder el pulso de la jornada.
                  </p>
                </div>
              </div>
            </div>

            {isTournamentEmpty ? (
              <div className="mt-5 public-soft px-4 py-4 sm:mt-6 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Las inscripciones ya están abiertas.</p>
                    <p className="mt-1 text-sm text-[#9fb3d9]">
                      Los equipos y partidos aparecerán aquí en cuanto la organización reciba las primeras altas.
                    </p>
                  </div>
                  <Link className="public-action public-action--primary" href="/inscripcion">
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
