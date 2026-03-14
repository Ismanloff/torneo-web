import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, Trophy, Users } from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { ALLOWED_SPORT_LABELS, isAllowedSport, normalizeSportName } from "@/lib/allowed-sports";
import type { CategoryRow, TournamentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscripcion de equipos",
};

function getSportLabel(sport: string): string {
  const normalized = normalizeSportName(sport);
  if (normalized === "baloncesto") return "Baloncesto";
  if (normalized === "futbol") return "Futbol";
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
              <div className="public-brand">
                <span className="public-brand__mark">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="public-kicker text-[0.66rem]">Torneo Escolar</p>
                  <p className="text-sm font-semibold text-white">{tournament.name}</p>
                </div>
              </div>

              <nav className="public-nav">
                <Link className="public-nav__link" href="/">
                  Inicio
                </Link>
                <Link className="public-nav__link" href="/login">
                  Staff
                </Link>
              </nav>
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
              <p className="public-kicker mt-8">Inscripcion de equipos</p>
              <h1 className="public-title mt-4 text-5xl sm:text-6xl">
                Registro
              </h1>
              <p className="public-copy mt-5 max-w-xl text-base">
                Selecciona la categoria en la que quieres inscribir tu equipo. Una vez registrado,
                recibiras un codigo de seguimiento y un QR de acceso al torneo.
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
                      <Link key={cat.id} href={`/registro/${cat.id}`}>
                        {cardContent}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {sportGroups.length === 0 ? (
              <div className="public-glass p-8 text-center">
                <p className="text-[#a8b7d2]">No hay categorias disponibles para inscripcion.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
