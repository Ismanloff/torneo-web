import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle, Home, Trophy, UserCheck } from "lucide-react";

import { getTeamByRegistrationCode } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Inscripcion completada",
};

type ExitoPageProps = {
  searchParams: Promise<{
    code?: string;
  }>;
};

export default async function ExitoPage({ searchParams }: ExitoPageProps) {
  const params = await searchParams;
  const code = params.code ?? "";
  const team = code ? await getTeamByRegistrationCode(code) : null;

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
                  <p className="text-sm font-semibold text-white">Inscripcion completada</p>
                </div>
              </div>

              <nav className="public-nav">
                <Link className="public-nav__link" href="/">
                  Inicio
                </Link>
                <Link className="public-nav__link" href="/registro">
                  Inscripcion
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Content */}
        <section className="public-section pt-10 pb-20">
          <div className="public-wrap max-w-2xl mx-auto grid gap-8">
            {/* Success header */}
            <div className="public-glass p-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(141,246,95,0.2)] bg-gradient-to-br from-[rgba(141,246,95,0.18)] to-[rgba(84,209,43,0.06)]">
                <CheckCircle className="h-8 w-8 text-[var(--app-accent)]" />
              </div>

              <p className="public-kicker">Inscripcion completada</p>

              <h1 className="public-title mt-4 text-4xl sm:text-5xl">
                {team ? team.team_name : "Equipo registrado"}
              </h1>

              {team ? (
                <p className="mt-3 text-sm text-[#a8b7d2]">
                  {team.category.sport} &middot; {team.category.name} &middot; {team.category.age_group}
                </p>
              ) : null}

              <p className="public-copy mt-6 mx-auto max-w-md text-base">
                Hemos enviado un email con tu QR de acceso al torneo. Guarda este codigo como referencia.
              </p>
            </div>

            {/* Registration code */}
            {code ? (
              <div className="public-glass p-8 text-center">
                <p className="public-kicker mb-4">Codigo de registro</p>
                <p
                  className="text-4xl sm:text-5xl font-bold tracking-[0.08em] text-[var(--app-accent)]"
                  style={{ fontFamily: "monospace" }}
                >
                  {code.toUpperCase()}
                </p>
                <p className="mt-4 text-sm text-[#a8b7d2]">
                  Guarda este codigo. Lo necesitaras para consultar el estado de tu equipo.
                </p>
              </div>
            ) : null}

            {/* Info card */}
            {team ? (
              <div className="public-glass p-6">
                <div className="flex items-start gap-4">
                  <UserCheck className="mt-0.5 h-5 w-5 text-[var(--app-accent)] shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Datos del responsable</p>
                    <p className="mt-2 text-sm text-[#a8b7d2]">
                      {team.captain_name} &middot; {team.captain_email}
                    </p>
                    <p className="mt-1 text-sm text-[#a8b7d2]">
                      {team.total_players} {team.total_players === 1 ? "jugador" : "jugadores"} declarados
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              {code ? (
                <Link className="public-action" href={`/equipo/${code}`}>
                  <UserCheck className="h-4 w-4" />
                  Ver estado de tu equipo
                </Link>
              ) : null}

              <Link className="public-action public-action--ghost" href="/">
                <Home className="h-4 w-4" />
                Volver al portal
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
