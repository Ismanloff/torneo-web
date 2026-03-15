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
    title: category ? `Clasificación ${category.category.name}` : "Clasificación",
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
        eyebrow="Categoria no encontrada"
        title="No existe esa clasificación"
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
      eyebrow="Clasificación completa"
      title={category.category.name}
      description={`${category.category.sport} · ${category.category.age_group} · ${category.category.school}`}
      backHref="/#clasificacion"
      backLabel="Volver a clasificación"
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
              Clasificación ordenada por puntos, diferencia y tantos a favor.
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
              Se ordena por puntos, diferencia y tantos a favor. Si hay grupos, cada grupo se muestra por separado.
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
          <p className="public-kicker">Criterio</p>
          <div className="mt-5 grid gap-3">
            <div className="public-soft p-4">
              <p className="font-semibold text-white">Puntos primero, luego desempates</p>
              <p className="mt-2 text-sm text-[#a8b7d2]">
                La clasificación se resuelve por puntos, después por diferencia y, si sigue el empate, por tantos a favor y orden alfabético.
              </p>
            </div>
            <div className="public-soft p-4">
              <p className="font-semibold text-white">Puntos totales de la categoría</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--app-accent)]">{totalPoints}</p>
              {leadTeam ? (
                <p className="mt-2 text-sm text-[#a8b7d2]">
                  Registro líder: <strong className="text-white">{leadTeam.team_name}</strong> con{" "}
                  {leadTeam.total_points} puntos.
                </p>
              ) : null}
            </div>
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
