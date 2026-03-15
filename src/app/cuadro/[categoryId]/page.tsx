import Link from "next/link";
import type { Metadata } from "next";

import { BracketTree } from "@/components/bracket-tree";
import { PublicPageShell } from "@/components/public-page-shell";
import { getScoreboardHomeData } from "@/lib/supabase/queries";

type BracketPageProps = {
  params: Promise<{ categoryId: string }>;
};

export async function generateMetadata({ params }: BracketPageProps): Promise<Metadata> {
  const { categoryId } = await params;
  const data = await getScoreboardHomeData();
  const category = data.categories.find((item) => item.category.id === categoryId);

  return {
    title: category ? `Cuadro ${category.category.name}` : "Cuadro eliminatorio",
  };
}

export default async function BracketPage({ params }: BracketPageProps) {
  const { categoryId } = await params;
  const data = await getScoreboardHomeData();
  const category = data.categories.find((item) => item.category.id === categoryId);

  if (!category) {
    return (
      <PublicPageShell
        eyebrow="Cuadro no encontrado"
        title="No existe esa fase eliminatoria"
        description="Puede que la categoría no exista o que el cuadro aún no se haya generado."
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
      eyebrow="Cuadro eliminatorio"
      title={category.category.name}
      description="Vista completa del cuadro de eliminación para esta categoría."
      backHref={`/clasificacion/${category.category.id}`}
      backLabel="Volver a clasificación"
      actions={
        <div className="grid gap-3">
          <div className="public-soft p-4">
            <p className="public-kicker">Fase</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {category.bracket?.bracket.name || "Eliminatoria"}
            </p>
          </div>
          <Link className="public-action public-action--ghost" href="/">
            Ir al portal
          </Link>
        </div>
      }
    >
      <section className="public-glass p-5 sm:p-6">
        <BracketTree category={category} />
      </section>
    </PublicPageShell>
  );
}
