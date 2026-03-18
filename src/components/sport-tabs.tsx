"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, Trophy } from "lucide-react";

import { BracketTree } from "@/components/bracket-tree";
import { ScoreboardTable } from "@/components/scoreboard-table";
import { EmptyStatePanel, SectionHeader, StatusPill } from "@/components/surface-primitives";
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
        className="public-ticker"
        style={{
          top: "3.9rem",
        }}
      >
        <div className="public-wrap">
          <div
            className="public-ticker__inner"
          >
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
          <SectionHeader
            eyebrow="Clasificación"
            title="Tabla pública"
            description="Una lectura más directa del deporte activo: menos cajas, más tabla, y acceso rápido a la inscripción cuando todavía hay plazas."
            action={filteredCategories.length > 0 ? (
              <div className="section-surface public-sport-cta">
                <div className="public-sport-cta__copy">
                  <p className="public-kicker">{activeSport}</p>
                  <p className="mt-3 text-lg font-semibold text-white">
                    {hasTeamsInSport
                      ? "Las inscripciones siguen abiertas."
                      : `Las inscripciones están abiertas para ${activeSport}.`}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[#b7c2b0]">
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
          />

          {!hasTeamsInSport && filteredCategories.length > 0 ? (
            <EmptyStatePanel
              eyebrow={activeSport}
              title={`Todavía no hay equipos visibles en ${activeSport}`}
              description="La primera inscripción activará la tabla pública y el seguimiento del deporte."
            />
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <ScoreboardTable key={category.category.id} category={category} compact />
              ))
            ) : (
              <div className="xl:col-span-2">
                <EmptyStatePanel
                  eyebrow="Clasificación"
                  title="No hay categorías publicadas para este deporte"
                  description="La clasificación aparecerá aquí cuando la organización configure la estructura."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Partidos section */}
      <section className="public-section" id="partidos">
        <div className="public-wrap grid gap-8">
          <SectionHeader
            align="start"
            eyebrow="Partidos"
            title="Próximos encuentros"
            description="Las jornadas ahora se leen como un calendario editorial: categoría arriba y enfrentamientos en filas compactas."
          />

          {!hasAnyMatchesInSport && filteredCategories.length > 0 ? (
            <EmptyStatePanel
              eyebrow={activeSport}
              title={`Todavía no hay partidos programados para ${activeSport}`}
              description="El calendario aparecerá aquí cuando la organización prepare los encuentros."
              action={
                <a className="public-action public-action--ghost" href="#clasificacion">
                  Ver categorías
                </a>
              }
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {categoriesWithMatches.length > 0 ? (
              categoriesWithMatches.map((category) => {
                const previewMatches = category.matches.slice(0, 3);
                const hasMore = category.matches.length > 3;

                return (
                  <div key={category.category.id} className="section-surface p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="public-kicker">{category.category.name}</p>
                        <p className="mt-2 text-sm text-[#b7c2b0]">
                          {category.category.sport} &middot; {category.category.age_group} &middot;{" "}
                          {category.category.school}
                        </p>
                      </div>
                      <StatusPill tone="accent">{category.matches.length} partidos</StatusPill>
                    </div>

                    <div className="mt-5 data-list">
                      {previewMatches.map((match) => (
                        <article key={match.id} className="row-surface px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-[#b8c3b2]">
                                {match.round_label || "Partido"}
                              </p>
                              <p className="mt-1 text-sm text-[#b7c2b0]">
                                {match.scheduled_at ? formatDateTime(match.scheduled_at) : "Sin fecha"}{" "}
                                &middot; {match.location || "Sin pista"}
                              </p>
                            </div>
                            <span className={`status-pill ${match.status === "completed" ? "status-pill--success" : match.status === "cancelled" ? "status-pill--warning" : "status-pill--muted"}`}>
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
              <EmptyStatePanel
                eyebrow="Calendario"
                title="Todavía no hay partidos programados para este deporte"
                description="El calendario aparecerá aquí cuando la organización cree los encuentros."
              />
            )}
          </div>
        </div>
      </section>

      {/* Cruces section */}
      <section className="public-section" id="cruces">
        <div className="public-wrap grid gap-8">
          <SectionHeader
            align="start"
            eyebrow="Eliminatorias"
            title="Cruces y cuadro"
            description="El cuadro ya no compite con tarjetas ajenas: se apoya en un único contenedor estructural por categoría."
          />

          {bracketCategories.length > 0 ? (
            <div className="grid gap-6">
              {bracketCategories.map((category) => (
                <div key={category.category.id} className="section-surface p-5 sm:p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="public-kicker">{category.category.name}</p>
                      <p className="mt-2 text-sm text-[#b7c2b0]">
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
            <EmptyStatePanel
              eyebrow="Cruces"
              title="Todavía no hay cuadro eliminatorio para este deporte"
              description="Aparecerá cuando la organización genere las eliminatorias."
            />
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
