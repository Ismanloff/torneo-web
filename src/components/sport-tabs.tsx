"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, Trophy } from "lucide-react";

import { BracketTree } from "@/components/bracket-tree";
import { ScoreboardTable } from "@/components/scoreboard-table";
import type { ScoreboardCategory } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type SportTabsProps = {
  categories: ScoreboardCategory[];
  sports: string[];
};

function getStatusLabel(status: string) {
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  return "Programado";
}

function getStatusColor(status: string) {
  if (status === "completed") return "text-green-400";
  if (status === "cancelled") return "text-red-400";
  return "text-blue-400";
}

function SportIcon({ sport }: { sport: string }) {
  const normalized = sport
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized === "baloncesto") return <span>&#127936;</span>;
  if (normalized === "futbol") return <span>&#9917;</span>;
  if (normalized === "voleibol") return <span>&#127952;</span>;
  return <Trophy className="h-4 w-4" />;
}

export function SportTabs({ categories, sports }: SportTabsProps) {
  const [activeSport, setActiveSport] = useState(sports[0] ?? "");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let next = index;
      if (e.key === "ArrowRight") {
        next = (index + 1) % sports.length;
      } else if (e.key === "ArrowLeft") {
        next = (index - 1 + sports.length) % sports.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = sports.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      setActiveSport(sports[next]);
      tabRefs.current[next]?.focus();
    },
    [sports],
  );

  const filteredCategories = categories.filter(
    (c) =>
      c.category.sport.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ===
      activeSport.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(),
  );

  const categoriesWithMatches = filteredCategories.filter((c) => c.matches.length > 0);
  const bracketCategories = filteredCategories.filter((c) => c.bracket);
  const hasTeamsInSport = filteredCategories.some((category) => category.teams.length > 0);
  const hasAnyMatchesInSport = filteredCategories.some((category) => category.matches.length > 0);
  const totalTeamsInSport = filteredCategories.reduce((sum, category) => sum + category.teams.length, 0);
  const totalSlotsLeft = filteredCategories.reduce(
    (sum, category) => sum + Math.max(category.category.max_teams - category.teams.length, 0),
    0,
  );

  return (
    <div>
      {/* Sticky sport tabs */}
      <div
        className="sticky z-30 border-b border-white/8"
        style={{
          top: "4.5rem",
          background: "linear-gradient(180deg, rgba(3, 6, 17, 0.94), rgba(3, 6, 17, 0.78))",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="public-wrap">
          <div
            className="grid grid-cols-3 gap-2 py-3 sm:flex sm:flex-wrap"
            role="tablist"
            aria-label="Deportes"
          >
            {sports.map((sport, index) => {
              const isActive =
                sport.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ===
                activeSport.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

              const tabId = `sport-tab-${index}`;
              const panelId = `sport-tabpanel-${index}`;

              return (
                <button
                  key={sport}
                  ref={(el) => { tabRefs.current[index] = el; }}
                  id={tabId}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  onClick={() => setActiveSport(sport)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={isActive ? "sport-tab sport-tab--active" : "sport-tab"}
                >
                  <SportIcon sport={sport} />
                  <span className="sport-tab__label">{sport}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab panel content */}
      <div
        role="tabpanel"
        id={`sport-tabpanel-${sports.findIndex((s) =>
          s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ===
          activeSport.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
        )}`}
        aria-labelledby={`sport-tab-${sports.findIndex((s) =>
          s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ===
          activeSport.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
        )}`}
      >
      {/* Clasificacion section */}
      <section className="public-section" id="clasificacion">
        <div className="public-wrap grid gap-8">
          <div className="public-section-head">
            <div className="space-y-3">
              <p className="public-kicker">Clasificación</p>
              <h2 className="public-title text-[clamp(2.8rem,11vw,5.6rem)]">Tabla pública</h2>
            </div>

            {filteredCategories.length > 0 ? (
              <div className="public-sport-cta">
                <div className="public-sport-cta__copy">
                  <p className="public-kicker">{activeSport}</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {hasTeamsInSport
                      ? "Las inscripciones siguen abiertas."
                      : `Las inscripciones están abiertas para ${activeSport}.`}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#a8b7d2]">
                    {filteredCategories.length} categorías · {totalTeamsInSport} equipos registrados ·{" "}
                    {totalSlotsLeft} plazas disponibles.
                  </p>
                </div>
                <div className="public-sport-cta__actions">
                  <Link className="public-action public-action--subtle" href="/inscripcion">
                    Inscribir equipo
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <div className="public-sport-cta__meta">
                    {filteredCategories.map((category) => (
                      <span key={category.category.id} className="public-mini-chip">
                        {category.category.name} ·{" "}
                        {Math.max(category.category.max_teams - category.teams.length, 0)} libres
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!hasTeamsInSport && filteredCategories.length > 0 ? (
            <div className="public-soft flex flex-col gap-3 px-4 py-4 sm:px-5">
              <div>
                <p className="text-sm font-semibold text-white">Todavía no hay equipos visibles en {activeSport}.</p>
                <p className="mt-1 text-sm text-[#9fb3d9]">
                  La primera inscripción activará la tabla pública y el seguimiento del deporte.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <ScoreboardTable key={category.category.id} category={category} compact />
              ))
            ) : (
              <div className="public-soft flex flex-col items-center gap-3 py-10 text-center xl:col-span-2">
                <Calendar className="h-7 w-7 text-[var(--app-accent)]" aria-hidden="true" />
                <p className="text-sm font-medium text-[#8fa1c2]">
                  No hay categorías publicadas para este deporte todavía.
                </p>
                <p className="text-xs text-[#8fa1c2]/60">
                  La clasificación aparecerá aquí cuando la organización configure la estructura.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Partidos section */}
      <section className="public-section" id="partidos">
        <div className="public-wrap grid gap-8">
          <div className="space-y-3">
            <p className="public-kicker">Partidos</p>
            <h2 className="public-title text-[clamp(2.8rem,11vw,5.6rem)]">Próximos encuentros</h2>
          </div>

          {!hasAnyMatchesInSport && filteredCategories.length > 0 ? (
            <div className="public-soft flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm font-semibold text-white">Todavía no hay partidos programados para {activeSport}.</p>
                <p className="mt-1 text-sm text-[#9fb3d9]">
                  El calendario aparecerá aquí cuando la organización prepare los encuentros.
                </p>
              </div>
              <a className="public-action public-action--ghost" href="#clasificacion">
                Ver categorías
              </a>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
            {categoriesWithMatches.length > 0 ? (
              categoriesWithMatches.map((category) => {
                const previewMatches = category.matches.slice(0, 3);
                const hasMore = category.matches.length > 3;

                return (
                  <div key={category.category.id} className="public-glass p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="public-kicker">{category.category.name}</p>
                        <p className="mt-2 text-sm text-[#9fb3d9]">
                          {category.category.sport} &middot; {category.category.age_group} &middot;{" "}
                          {category.category.school}
                        </p>
                      </div>
                      <span className="public-tag">{category.matches.length} partidos</span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {previewMatches.map((match) => (
                        <article key={match.id} className="public-soft px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-[#8fa1c2]">
                                {match.round_label || "Partido"}
                              </p>
                              <p className="mt-1 text-sm text-[#9fb3d9]">
                                {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"}{" "}
                                &middot; {match.location || "Sin pista"}
                              </p>
                            </div>
                            <span className={`rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusColor(match.status)}`}>
                              {getStatusLabel(match.status)}
                            </span>
                          </div>

                          <div className="mt-4 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                            <div>
                              <p className="font-semibold text-white">{match.home_team.team_name}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                                {match.home_team.registration_code}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className={`font-display leading-none ${match.status === "completed" ? "text-5xl font-bold text-white" : "text-4xl text-[var(--app-accent)]"}`}>
                                {match.home_score ?? "-"} : {match.away_score ?? "-"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-white">{match.away_team.team_name}</p>
                              <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1c2]">
                                {match.away_team.registration_code}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    {hasMore ? (
                      <div className="mt-4 flex justify-end">
                        <Link
                          className="public-action public-action--ghost text-sm"
                          href={`/clasificacion/${category.category.id}`}
                        >
                          Ver todos los partidos
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="public-soft flex flex-col items-center gap-3 py-10 text-center lg:col-span-2 xl:col-span-3">
                <Calendar className="h-7 w-7 text-[var(--app-accent)]" aria-hidden="true" />
                <p className="text-sm font-medium text-[#8fa1c2]">
                  Todavía no hay partidos programados para este deporte.
                </p>
                <p className="text-xs text-[#8fa1c2]/60">
                  El calendario aparecerá aquí cuando la organización cree los encuentros.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Cruces section */}
      <section className="public-section" id="cruces">
        <div className="public-wrap grid gap-8">
          <div className="space-y-3">
            <p className="public-kicker">Eliminatorias</p>
            <h2 className="public-title text-[clamp(2.8rem,11vw,5.6rem)]">Cruces y cuadro</h2>
          </div>

          {bracketCategories.length > 0 ? (
            <div className="grid gap-6">
              {bracketCategories.map((category) => (
                <div key={category.category.id} className="public-glass p-5 sm:p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="public-kicker">{category.category.name}</p>
                      <p className="mt-2 text-sm text-[#9fb3d9]">
                        {category.bracket?.bracket.name || "Cuadro eliminatorio"}
                      </p>
                    </div>
                    <Link
                      className="public-action public-action--ghost"
                      href={`/cuadro/${category.category.id}`}
                    >
                      Ver cuadro
                    </Link>
                  </div>
                  <BracketTree category={category} />
                </div>
              ))}
            </div>
          ) : (
            <div className="public-soft flex flex-col items-center gap-3 py-10 text-center">
              <Calendar className="h-7 w-7 text-[var(--app-accent)]" aria-hidden="true" />
              <p className="text-sm font-medium text-[#8fa1c2]">
                Todavía no hay cuadro eliminatorio para este deporte.
              </p>
              <p className="text-xs text-[#8fa1c2]/60">
                Aparecerá cuando la organización genere las eliminatorias.
              </p>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
