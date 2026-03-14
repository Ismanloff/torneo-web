import Link from "next/link";
import type { Metadata } from "next";
import { CircleCheckBig, Clock3, Home, ShieldAlert } from "lucide-react";

import { PublicPageShell } from "@/components/public-page-shell";
import { getTeamByRegistrationCode } from "@/lib/supabase/queries";
import { formatDateTime } from "@/lib/utils";

type TeamStatusPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: TeamStatusPageProps): Promise<Metadata> {
  const { code } = await params;

  return {
    title: `Estado del equipo ${code.toUpperCase()}`,
  };
}

export default async function TeamStatusPage({ params }: TeamStatusPageProps) {
  const { code } = await params;
  const team = await getTeamByRegistrationCode(code);

  if (!team) {
    return (
      <PublicPageShell
        eyebrow="Codigo no encontrado"
        title="No hay ningun equipo con ese codigo"
        description="Revisa el codigo de registro o vuelve al inicio para navegar desde el portal."
      >
        <div className="public-glass p-6">
          <Link className="public-action public-action--ghost" href="/">
            Volver al inicio
          </Link>
        </div>
      </PublicPageShell>
    );
  }

  const parentalConfirmed = Boolean(team.parental_confirmed_at);

  return (
    <PublicPageShell
      eyebrow="Codigo de seguimiento"
      title={team.registration_code}
      description="Este codigo identifica la inscripcion del equipo y sirve para consultar su estado."
      backHref="/"
      backLabel="Volver al portal"
      actions={
        <div className="grid gap-3">
          <div className="public-soft p-4">
            <p className="public-kicker">Equipo</p>
            <p className="mt-3 text-2xl font-semibold text-white">{team.team_name}</p>
            <p className="mt-2 text-sm text-[#a8b7d2]">{team.category.name}</p>
          </div>
          <div className="public-soft p-4">
            <p className="public-kicker">Contacto</p>
            <p className="mt-3 text-lg font-semibold text-white">{team.captain_name}</p>
            <p className="mt-2 text-sm text-[#a8b7d2]">{team.captain_email}</p>
          </div>
        </div>
      }
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="public-glass p-5">
          <div className="flex items-start gap-4">
            <Clock3 className="mt-1 h-5 w-5 text-[var(--app-accent)]" />
            <div>
              <p className="text-lg font-semibold text-white">Inscripcion registrada</p>
              <p className="mt-3 text-sm leading-6 text-[#a8b7d2]">
                Alta creada el {formatDateTime(team.created_at)}. Estado interno:{" "}
                <strong className="text-white">{team.status}</strong>.
              </p>
            </div>
          </div>
        </article>

        <article className="public-glass p-5">
          <div className="flex items-start gap-4">
            {team.parental_confirmation_required ? (
              parentalConfirmed ? (
                <CircleCheckBig className="mt-1 h-5 w-5 text-[var(--app-accent)]" />
              ) : (
                <ShieldAlert className="mt-1 h-5 w-5 text-[var(--app-accent)]" />
              )
            ) : (
              <CircleCheckBig className="mt-1 h-5 w-5 text-[var(--app-accent)]" />
            )}
            <div>
              <p className="text-lg font-semibold text-white">Confirmacion parental</p>
              <p className="mt-3 text-sm leading-6 text-[#a8b7d2]">
                {team.parental_confirmation_required
                  ? parentalConfirmed
                    ? `Confirmada el ${formatDateTime(team.parental_confirmed_at!)}.`
                    : "Pendiente. Hace falta completar el enlace de autorizacion enviado tras la inscripcion."
                  : "No requerida para este equipo."}
              </p>
            </div>
          </div>
        </article>

        <article className="public-glass p-5">
          <p className="public-kicker">Categoria</p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {team.category.sport} · {team.category.age_group}
          </p>
          <p className="mt-2 text-sm text-[#a8b7d2]">{team.total_players} jugadores declarados</p>
          <div className="mt-6">
            <Link className="public-action public-action--ghost" href="/">
              <Home className="h-4 w-4" />
              Volver al portal
            </Link>
          </div>
        </article>
      </section>
    </PublicPageShell>
  );
}
