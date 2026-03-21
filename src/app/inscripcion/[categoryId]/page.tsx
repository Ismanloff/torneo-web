import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, CircleAlert } from "lucide-react";

import { PublicBrandLockup } from "@/components/public-brand-lockup";
import { PublicSiteNav } from "@/components/public-site-nav";
import { REGISTRATION_PAYMENT_BASE_COPY, TEAM_REGISTRATION_FEE_EUR } from "@/lib/registration-payment";
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
    title: category ? `Inscripción - ${category.name}` : "Inscripción",
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
    redirect("/inscripcion?error=categoria");
  }

  // Check capacity
  const { count } = await supabaseAdmin
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .neq("status", "cancelled");

  const currentTeams = count ?? category.current_teams;

  if (currentTeams >= category.max_teams) {
    redirect("/inscripcion?error=categoria");
  }

  const remaining = category.max_teams - currentTeams;

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
              <Link className="public-tag" href="/inscripcion">
                <ChevronLeft className="h-4 w-4" />
                Volver a categorías
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
              <div className="public-payment-banner public-payment-banner--tight mb-6">
                <div className="public-payment-banner__badge">
                  <CircleAlert className="h-4 w-4" />
                  Importe de participación
                </div>
                <div className="public-payment-banner__content">
                  <p className="public-payment-banner__amount">{TEAM_REGISTRATION_FEE_EUR} € en efectivo</p>
                  <p className="public-payment-banner__title">Pago obligatorio el día del torneo</p>
                  <p className="public-payment-banner__copy">{REGISTRATION_PAYMENT_BASE_COPY}</p>
                </div>
              </div>
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
