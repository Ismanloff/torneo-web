import Link from "next/link";
import type { Metadata } from "next";

import { BracketTree } from "@/components/bracket-tree";
import { MatchList } from "@/components/match-list";
import { PublicPageShell } from "@/components/public-page-shell";
import { ScoreboardTable } from "@/components/scoreboard-table";
import { EmptyStatePanel, StatusPill } from "@/components/surface-primitives";
import { getScoreboardHomeData } from "@/lib/supabase/queries";

type CategoryPageProps = {
  params: Promise<{ categoryId: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const data = await getScoreboardHomeData();
  const category = data.categories.find((item) => item.category.id === categoryId);

  return {
    title: category ? `Clasificación · ${category.category.name}` : "Clasificación",
  };
}

export default async function CategoryScoreboardPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const data = await getScoreboardHomeData();
  const category = data.categories.find((item) => item.category.id === categoryId);
  const totalPoints = category?.standings.reduce((sum, row) => sum + row.total_points, 0) ?? 0;
  const leadTeam = category?.standings[0] ?? null;

  if (!category) {
    return (
      <PublicPageShell
        eyebrow="Categoría no encontrada"
        title="Esa clasificación no está disponible"
        description="Revisa el enlace o vuelve al portal principal para entrar desde la clasificación."
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
      eyebrow="Clasificación"
      title={category.category.name}
      description={`${category.category.sport} · ${category.category.age_group} · ${category.category.school}`}
      backHref="/#clasificacion"
      backLabel="Volver a clasificación"
      compactHero
      actions={
        <div className="row-surface p-4">
          <p className="text-sm leading-7 text-[#b7c2b0]">
            Consulta la clasificación, los partidos y el cuadro de esta categoría.
          </p>
          {category.bracket ? (
            <div className="mt-4">
              <Link className="public-action public-action--ghost" href={`/cuadro/${category.category.id}`}>
                Ver cuadro eliminatorio
              </Link>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="section-surface overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <p className="public-kicker">Clasificación</p>
            <p className="mt-2 text-sm text-[#b7c2b0]">
              Se ordena por puntos, diferencia y tantos a favor. Si hay grupos, cada uno se muestra por separado.
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
        <article className="section-surface p-5 sm:p-6">
          <p className="public-kicker">Partidos</p>
          <div className="mt-5">
            <MatchList category={category} />
          </div>
        </article>

        <article className="section-surface p-5 sm:p-6">
          <p className="public-kicker">Desempate</p>
          <div className="mt-5 grid gap-3">
            <div className="row-surface p-4">
              <p className="font-semibold text-white">Puntos primero, luego desempates</p>
              <p className="mt-2 text-sm text-[#b7c2b0]">
                La clasificación se resuelve por puntos, después por diferencia y, si sigue el empate, por tantos a favor y orden alfabético.
              </p>
            </div>
            <div className="row-surface p-4">
              <p className="font-semibold text-white">Puntos repartidos en la categoría</p>
              <div className="mt-3">
                <StatusPill tone="accent">{totalPoints} puntos</StatusPill>
              </div>
              {leadTeam ? (
                <p className="mt-3 text-sm text-[#b7c2b0]">
                  Líder actual: <strong className="text-white">{leadTeam.team_name}</strong> con{" "}
                  {leadTeam.total_points} puntos.
                </p>
              ) : (
                <p className="mt-3 text-sm text-[#b7c2b0]">
                  Esta categoría todavía no tiene equipos inscritos.
                </p>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="section-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="public-kicker">Cuadro eliminatorio</p>
            <p className="mt-3 text-sm text-[#b7c2b0]">
              Consulta aquí el cuadro eliminatorio de la categoría. Si todavía no existe, aparecerá
              en cuanto la organización lo publique.
            </p>
          </div>
          {category.bracket ? (
            <Link className="public-action public-action--ghost" href={`/cuadro/${category.category.id}`}>
              Abrir vista completa
            </Link>
          ) : null}
        </div>

        <div className="mt-6">
          {category.bracket ? (
            <BracketTree category={category} />
          ) : (
            <EmptyStatePanel
              compact
              eyebrow="Cuadro eliminatorio"
              title="Todavía no hay cuadro generado para esta categoría"
              description="Aparecerá aquí en cuanto la organización publique la eliminatoria."
            />
          )}
        </div>
      </section>
    </PublicPageShell>
  );
}
