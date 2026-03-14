import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { TeamRegistrationForm } from "@/components/team-registration-form";
import type { CategoryRow } from "@/lib/types";

type CategoryRegistrationPageProps = {
  params: Promise<{ categoryId: string }>;
};

export async function generateMetadata({ params }: CategoryRegistrationPageProps): Promise<Metadata> {
  const { categoryId } = await params;

  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("name, sport")
    .eq("id", categoryId)
    .eq("is_active", true)
    .maybeSingle<Pick<CategoryRow, "name" | "sport">>();

  return {
    title: category ? `Inscripcion - ${category.name}` : "Inscripcion",
  };
}

export default async function CategoryRegistrationPage({ params }: CategoryRegistrationPageProps) {
  const { categoryId } = await params;

  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .eq("is_active", true)
    .maybeSingle<CategoryRow>();

  if (!category) {
    redirect("/registro?error=categoria");
  }

  // Check capacity
  const { count } = await supabaseAdmin
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .neq("status", "cancelled");

  const currentTeams = count ?? category.current_teams;

  if (currentTeams >= category.max_teams) {
    redirect("/registro?error=categoria");
  }

  const remaining = category.max_teams - currentTeams;

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
                  <p className="text-sm font-semibold text-white">Inscripcion</p>
                </div>
              </div>

              <nav className="public-nav">
                <Link className="public-nav__link" href="/">
                  Inicio
                </Link>
                <Link className="public-nav__link" href="/registro">
                  Categorias
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="public-hero">
          <div className="public-wrap py-10 lg:py-14">
            <article className="public-glass p-6 lg:p-8 max-w-2xl mx-auto">
              <Link className="public-tag" href="/registro">
                <ChevronLeft className="h-4 w-4" />
                Volver a categorias
              </Link>
              <p className="public-kicker mt-8">{category.sport} &middot; {category.age_group}</p>
              <h1 className="public-title mt-4 text-4xl sm:text-5xl">
                {category.name}
              </h1>
              <p className="public-copy mt-4 text-base">
                Quedan{" "}
                <strong className="text-[var(--app-accent)]">
                  {remaining} {remaining === 1 ? "plaza" : "plazas"}
                </strong>{" "}
                disponibles. Rellena el formulario para inscribir tu equipo.
              </p>
            </article>
          </div>
        </section>

        {/* Registration form */}
        <section className="public-section pt-8 pb-20">
          <div className="public-wrap max-w-2xl mx-auto">
            <div className="public-glass p-6 lg:p-8">
              <TeamRegistrationForm
                categoryId={category.id}
                categoryName={category.name}
                sport={category.sport}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
