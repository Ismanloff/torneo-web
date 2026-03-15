import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, Landmark, Users } from "lucide-react";

import { PublicBrandLockup } from "@/components/public-brand-lockup";
import { PublicSiteNav } from "@/components/public-site-nav";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ALLOWED_SPORT_LABELS, isAllowedSport, normalizeSportName } from "@/lib/allowed-sports";
import {
  TOURNAMENT_EDITION_LABEL,
  TOURNAMENT_NAME,
  TOURNAMENT_ORGANIZERS_LABEL,
} from "@/lib/branding";
import type { CategoryRow, TournamentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscripción de equipos",
};

function getSportLabel(sport: string): string {
  const normalized = normalizeSportName(sport);
  if (normalized === "baloncesto") return "Baloncesto";
  if (normalized === "futbol") return "Fútbol";
  if (normalized === "voleibol") return "Voleibol";
  return sport;
}

export default async function RegistroPage() {
  const [{ data: tournament }, { data: categories }, { data: teams }] = await Promise.all([
    supabaseAdmin
      .from("tournaments")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<TournamentRow>(),
    supabaseAdmin
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sport", { ascending: true })
      .order("name", { ascending: true })
      .returns<CategoryRow[]>(),
    supabaseAdmin
      .from("teams")
      .select("id, category_id")
      .neq("status", "cancelled"),
  ]);

  if (!tournament) {
    return (
      <main className="public-arena">
        <div className="public-shell">
          <div className="public-wrap py-20 text-center">
            <p className="public-kicker">Sin torneo activo</p>
            <h1 className="public-title mt-4 text-4xl">No hay inscripciones abiertas</h1>
            <div className="mt-8">
              <Link className="public-action public-action--ghost" href="/">
                Volver al portal
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const activeCategories = (categories ?? []).filter(
    (c) => c.tournament_id === tournament.id && isAllowedSport(c.sport),
  );

  // Count teams per category from the teams table
  const teamCountByCategory = new Map<string, number>();
  for (const team of teams ?? []) {
    const count = teamCountByCategory.get(team.category_id) ?? 0;
    teamCountByCategory.set(team.category_id, count + 1);
  }

  // Build category data with remaining slots
  const categoryData = activeCategories.map((c) => {
    const currentTeams = teamCountByCategory.get(c.id) ?? c.current_teams;
    const remaining = Math.max(0, c.max_teams - currentTeams);
    return { ...c, currentTeams, remaining };
  });

  // Group by sport, preserving ALLOWED_SPORT_LABELS order
  const sportGroups: { sport: string; items: typeof categoryData }[] = [];
  for (const label of ALLOWED_SPORT_LABELS) {
    const items = categoryData.filter(
      (c) => normalizeSportName(c.sport) === normalizeSportName(label),
    );
    if (items.length > 0) {
      sportGroups.push({ sport: label, items });
    }
  }

  return (
    <main className="public-arena">
      <div className="public-shell">
        {/* Topbar */}
        <header className="public-topbar">
          <div className="public-wrap">
            <div className="public-topbar__inner">
              <PublicBrandLockup />

              <PublicSiteNav />
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="public-hero">
          <div className="public-wrap py-10 lg:py-14">
            <article className="public-glass p-6 lg:p-8 max-w-2xl mx-auto">
              <Link className="public-tag" href="/">
                <ChevronLeft className="h-4 w-4" />
                Volver al portal
              </Link>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="public-tag public-tag--accent">{TOURNAMENT_EDITION_LABEL}</span>
                <span className="public-tag public-tag--soft">
                  <Landmark className="h-3.5 w-3.5" />
                  Inscripción oficial
                </span>
              </div>
              <h1 className="public-title mt-4 text-5xl sm:text-6xl">
                Equipos al torneo
              </h1>
              <p className="public-copy mt-5 max-w-xl text-base">
                Selecciona la categoría en la que quieres inscribir tu equipo. Una vez registrado,
                recibirás un código de seguimiento y un QR de acceso al torneo.
              </p>
              <p className="public-hero-panel__lead mt-4">
                {TOURNAMENT_ORGANIZERS_LABEL}
              </p>
              <p className="public-hero-panel__meta mt-4 text-sm text-[#c2cfdf]">
                {TOURNAMENT_NAME} celebra su cuarta edición con inscripciones por categoría y seguimiento en tiempo real durante toda la jornada.
              </p>
            </article>
          </div>
        </section>

        {/* Category list */}
        <section className="public-section pt-8 pb-20">
          <div className="public-wrap max-w-2xl mx-auto grid gap-10">
            {sportGroups.map((group) => (
              <div key={group.sport}>
                <h2 className="public-kicker mb-4">{group.sport}</h2>
                <div className="grid gap-3">
                  {group.items.map((cat) => {
                    const isFull = cat.remaining === 0;

                    const cardContent = (
                      <div
                        className={`public-glass p-5 transition-all ${
                          isFull
                            ? "opacity-60"
                            : "hover:border-[rgba(141,246,95,0.22)] hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-white">{cat.name}</p>
                            <p className="mt-1 text-sm text-[#a8b7d2]">
                              {getSportLabel(cat.sport)} &middot; {cat.age_group}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Users className="h-4 w-4 text-[var(--app-muted)]" />
                            {isFull ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#fca5a5]">
                                Completo
                              </span>
                            ) : (
                              <span className="text-sm font-semibold text-[var(--app-accent)]">
                                {cat.remaining} {cat.remaining === 1 ? "plaza" : "plazas"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    if (isFull) {
                      return (
                        <div key={cat.id} aria-disabled="true">
                          {cardContent}
                        </div>
                      );
                    }

                    return (
                      <Link key={cat.id} href={`/inscripcion/${cat.id}`}>
                        {cardContent}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {sportGroups.length === 0 ? (
              <div className="public-glass p-8 text-center">
                <p className="text-[#a8b7d2]">No hay categorías disponibles para inscripción.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
