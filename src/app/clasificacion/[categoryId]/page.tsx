import Link from "next/link";
import type { Metadata } from "next";

import { BracketTree } from "@/components/bracket-tree";
import { MatchList } from "@/components/match-list";
import { PublicPageShell } from "@/components/public-page-shell";
import { ScoreboardTable } from "@/components/scoreboard-table";
import { getScoreboardHomeData } from "@/lib/supabase/queries";

type CategoryPageProps = {
  params: Promise<{ categoryId: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const data = await getScoreboardHomeData();
  const category = data.categories.find((item) => item.category.id === categoryId);

  return {
    title: category ? `Clasificacion ${category.category.name}` : "Clasificacion",
  };
}

export default async function CategoryScoreboardPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const data = await getScoreboardHomeData();
  const category = data.categories.find((item) => item.category.id === categoryId);

  if (!category) {
    return (
      <PublicPageShell
        eyebrow="Categoria no encontrada"
        title="No existe esa clasificacion"
        description="Revisa el enlace o vuelve al portal principal para navegar desde la tabla pública."
      >
        <div className="public-glass p-6">
          <Link className="public-action public-action--ghost" href="/">
            Volver al portal
          </Link>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      eyebrow="Clasificacion completa"
      title={category.category.name}
      description={`${category.category.sport} · ${category.category.age_group} · ${category.category.school}`}
      backHref="/#clasificacion"
      backLabel="Volver a clasificacion"
      compactHero
      actions={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="public-soft p-4">
            <p className="public-kicker">Equipos</p>
            <p className="public-stat-value mt-3 text-[2.5rem]">{category.teams.length}</p>
          </div>
          <div className="public-soft p-4">
            <p className="public-kicker">Partidos</p>
            <p className="mt-3 text-2xl font-semibold text-white">{category.matches.length}</p>
            <p className="mt-2 text-sm text-[#a8b7d2]">
              Regla actual {category.scoringRule?.points_win ?? 3}/{category.scoringRule?.points_draw ?? 1}/
              {category.scoringRule?.points_loss ?? 0}
            </p>
          </div>
          {category.bracket ? (
            <Link className="public-action public-action--ghost" href={`/cuadro/${category.category.id}`}>
              Ver cuadro eliminatorio
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="public-glass p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <p className="public-kicker">Tabla oficial</p>
            <p className="mt-2 text-sm text-[#a8b7d2]">
              Clasificacion general y diferencia de goles de la categoria.
            </p>
          </div>
          {category.bracket ? (
            <div className="flex items-center gap-3">
              <Link className="public-action public-action--ghost" href={`/cuadro/${category.category.id}`}>
                Cuadro
              </Link>
            </div>
          ) : null}
        </div>
        <ScoreboardTable category={category} showHeader={false} />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="public-glass p-5 sm:p-6">
          <p className="public-kicker">Partidos</p>
          <div className="mt-5">
            <MatchList category={category} />
          </div>
        </article>

        <article className="public-glass p-5 sm:p-6">
          <p className="public-kicker">Ajustes manuales</p>
          <div className="mt-5 grid gap-3">
            {category.adjustments.length ? (
              category.adjustments.map((adjustment) => (
                <div key={adjustment.id} className="public-soft p-4">
                  <p className="font-semibold text-white">{adjustment.team.team_name}</p>
                  <p className="mt-2 text-sm text-[#a8b7d2]">{adjustment.note}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--app-accent)]">
                    {adjustment.points_delta >= 0 ? "+" : ""}
                    {adjustment.points_delta} puntos
                  </p>
                </div>
              ))
            ) : (
              <div className="public-soft p-4 text-sm text-[#8fa1c2]">Sin ajustes registrados.</div>
            )}
          </div>
        </article>
      </section>

      <section className="public-glass p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="public-kicker">Cuadro eliminatorio</p>
            <p className="mt-3 text-sm text-[#a8b7d2]">
              Vista del cuadro para esta categoria. Si todavia no existe, aparecera en cuanto se
              genere desde el panel interno.
            </p>
          </div>
          {category.bracket ? (
            <Link className="public-action public-action--ghost" href={`/cuadro/${category.category.id}`}>
              Abrir vista completa
            </Link>
          ) : null}
        </div>

        <div className="mt-6">
          <BracketTree category={category} />
        </div>
      </section>
    </PublicPageShell>
  );
}
