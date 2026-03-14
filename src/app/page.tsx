import Link from "next/link";
import {
  CalendarDays,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";

import { MatchCountdown } from "@/components/match-countdown";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SportTabs } from "@/components/sport-tabs";
import { ALLOWED_SPORT_LABELS } from "@/lib/allowed-sports";
import { getScoreboardHomeData } from "@/lib/supabase/queries";
import { formatLongDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getScoreboardHomeData();

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
              <div className="public-brand">
                <span className="public-brand__mark">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="public-kicker text-[0.66rem]">Torneo Escolar</p>
                  <p className="text-sm font-semibold text-white">{data.tournament.name}</p>
                </div>
              </div>

              <MobileNavToggle>
                <a className="public-nav__link" href="#clasificacion">
                  Clasificacion
                </a>
                <a className="public-nav__link" href="#partidos">
                  Partidos
                </a>
                <a className="public-nav__link" href="#cruces">
                  Cruces
                </a>
                <Link className="public-nav__link" href="/inscripcion">
                  Inscripcion
                </Link>
                <Link className="public-nav__link" href="/login">
                  Staff
                </Link>
              </MobileNavToggle>
            </div>
          </div>
        </header>

        {/* Compact hero */}
        <section className="public-hero">
          <div className="public-wrap py-5 sm:py-6 lg:py-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="public-tag public-tag--accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    En directo
                  </span>
                </div>
                <h1 className="public-title text-3xl sm:text-5xl lg:text-6xl">
                  {data.tournament.name}
                </h1>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#9fb3d9]">
                  {formatLongDate(data.tournament.start_date)} &mdash;{" "}
                  {formatLongDate(data.tournament.end_date)} &middot;{" "}
                  {ALLOWED_SPORT_LABELS.join(" · ")}
                </p>
              </div>

              <div className="flex gap-5 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#8fa1c2]">Categorias</p>
                    <p className="text-base sm:text-lg font-semibold text-white">{data.categories.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#8fa1c2]">Equipos</p>
                    <p className="text-base sm:text-lg font-semibold text-white">{data.totalTeams}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Swords className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#8fa1c2]">Partidos</p>
                    <p className="text-base sm:text-lg font-semibold text-white">{data.totalMatches}</p>
                  </div>
                </div>
              </div>
            </div>
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
