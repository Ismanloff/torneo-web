import Link from "next/link";
import type { Metadata } from "next";
import { Clock3, Home, LockKeyhole, Sparkles } from "lucide-react";

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
        eyebrow="Código no encontrado"
        title="No hay ningún equipo con ese código"
        description="Revisa el código de registro o vuelve al inicio para navegar desde el portal."
      >
        <div className="public-glass p-6">
          <Link className="public-action public-action--ghost" href="/">
            Volver al inicio
          </Link>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell
      eyebrow="Código de seguimiento"
      title={team.registration_code}
      description="Este código identifica la inscripción del equipo, pero ya no da acceso al panel privado ni al QR del equipo."
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
            <p className="public-kicker">Acceso privado</p>
            <p className="mt-3 text-lg font-semibold text-white">Protegido por enlace único</p>
            <p className="mt-2 text-sm text-[#a8b7d2]">
              Para abrir el panel del equipo y recuperar el QR usa el enlace privado enviado al responsable.
            </p>
          </div>
        </div>
      }
    >
      <section className="grid gap-4 lg:grid-cols-3">
        <article className="public-glass p-5">
          <div className="flex items-start gap-4">
            <Clock3 className="mt-1 h-5 w-5 text-[var(--app-accent)]" />
            <div>
              <p className="text-lg font-semibold text-white">Inscripción registrada</p>
              <p className="mt-3 text-sm leading-6 text-[#a8b7d2]">
                Alta creada el {formatDateTime(team.created_at)}. Estado interno:{" "}
                <strong className="text-white">{team.status}</strong>.
              </p>
            </div>
          </div>
        </article>

        <article className="public-glass p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="public-kicker">Panel privado</p>
          </div>
          <div className="public-soft mt-4 p-5 text-sm leading-6 text-[#a8b7d2]">
            El QR y los datos del responsable ya no se exponen desde esta ruta pública. Usa el enlace privado enviado al responsable del equipo.
          </div>
        </article>

        <article className="public-glass p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--app-accent)]" />
            <p className="public-kicker">Categoría</p>
          </div>
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
