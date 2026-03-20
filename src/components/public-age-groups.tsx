import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck, Users } from "lucide-react";

import { SectionHeader } from "@/components/surface-primitives";

const TOURNAMENT_AGE_GROUPS = [
  {
    key: "cadete",
    label: "Cadete",
    ageRange: "14 a 17 años",
    sportsLabel: "Baloncesto, fútbol y voleibol",
    note: "Grupo pensado para la competición de categoría superior.",
  },
  {
    key: "infantil",
    label: "Infantil",
    ageRange: "11 a 13 años",
    sportsLabel: "Voleibol, fútbol y baloncesto",
    note: "Grupo de acceso para equipos en etapa formativa.",
  },
] as const;

export function PublicAgeGroupsSection() {
  return (
    <section className="public-section" id="edades-grupos">
      <div className="public-wrap grid gap-8">
        <SectionHeader
          eyebrow="Edades y grupos"
          title="Antes de inscribir, ubica tu equipo"
          description="La inscripción se organiza por grupo de edad. Revisa el tramo que corresponde a tu equipo y entra después al formulario del torneo."
          action={(
            <div className="section-surface public-groups-summary">
              <div className="public-groups-summary__icon">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="public-groups-summary__copy">
                <p className="public-kicker">Referencia rápida</p>
                <p className="public-groups-summary__title">2 grupos activos · 3 deportes</p>
                <p className="public-groups-summary__text">
                  El criterio principal es la edad del equipo. Después eliges el deporte dentro del grupo correcto.
                </p>
              </div>
            </div>
          )}
        />

        <div className="public-groups-grid">
          {TOURNAMENT_AGE_GROUPS.map((group, index) => (
            <article
              key={group.key}
              className={`public-group-card ${index === 0 ? "public-group-card--accent" : "public-group-card--soft"}`}
            >
              <div className="public-group-card__topline">
                <span className="public-tag public-tag--soft">Grupo {group.label}</span>
                <span className="public-group-card__age">{group.ageRange}</span>
              </div>

              <h3 className="public-group-card__title">{group.sportsLabel}</h3>
              <p className="public-group-card__subtitle">{group.label}</p>
              <p className="public-group-card__note">{group.note}</p>

              <div className="public-group-card__footer">
                <div className="public-group-card__meta">
                  <Users className="h-4 w-4" />
                  <span>Inscripción por edad y deporte</span>
                </div>
                <Link className="public-action public-action--subtle" href="/inscripcion">
                  Ir a inscripción
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicAgeGroupsSidebarCard() {
  return (
    <div className="public-nav-groups">
      <div className="public-nav-groups__head">
        <p className="public-nav__eyebrow">Edades y grupos</p>
        <p className="public-nav-groups__title">Consulta rápida</p>
      </div>

      <div className="public-nav-groups__list">
        {TOURNAMENT_AGE_GROUPS.map((group) => (
          <div key={group.key} className="public-nav-groups__item">
            <div className="public-nav-groups__item-row">
              <span className="public-nav-groups__badge">{group.label}</span>
              <span className="public-nav-groups__age">{group.ageRange}</span>
            </div>
            <p className="public-nav-groups__sports">{group.sportsLabel}</p>
          </div>
        ))}
      </div>

      <Link className="public-nav-groups__cta" href="/#edades-grupos">
        Ver detalle completo
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
