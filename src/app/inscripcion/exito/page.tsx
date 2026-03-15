import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle, Home, MailCheck, QrCode, UserCheck } from "lucide-react";

import { PublicBrandLockup } from "@/components/public-brand-lockup";
import { PublicSiteNav } from "@/components/public-site-nav";
import { QrTile } from "@/components/qr-tile";
import { getTeamByRegistrationCode } from "@/lib/supabase/queries";
import { buildQrShareUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inscripción completada",
};

type ExitoPageProps = {
  searchParams: Promise<{
    code?: string;
    email?: string;
  }>;
};

export default async function ExitoPage({ searchParams }: ExitoPageProps) {
  const params = await searchParams;
  const code = params.code ?? "";
  const emailStatus = params.email === "sent" ? "sent" : params.email === "failed" ? "failed" : "skipped";
  const team = code ? await getTeamByRegistrationCode(code) : null;
  const teamQrPath = team?.qr_token ? buildQrShareUrl(team.qr_token.token) : null;
  const emailDelivered = emailStatus === "sent";
  const emailBlocked = emailStatus === "skipped";

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

        {/* Content */}
        <section className="public-section pt-10 pb-20">
          <div className="public-wrap mx-auto grid max-w-4xl gap-8">
            {/* Success header */}
            <div className="public-glass p-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(141,246,95,0.2)] bg-gradient-to-br from-[rgba(141,246,95,0.18)] to-[rgba(84,209,43,0.06)]">
                <CheckCircle className="h-8 w-8 text-[var(--app-accent)]" />
              </div>

              <p className="public-kicker">Inscripción completada</p>

              <h1 className="public-title mt-4 text-4xl sm:text-5xl">
                {team ? team.team_name : "Equipo registrado"}
              </h1>

              {team ? (
                <p className="mt-3 text-sm text-[#a8b7d2]">
                  {team.category.sport} &middot; {team.category.name} &middot; {team.category.age_group}
                </p>
              ) : null}

              <p className="public-copy mt-6 mx-auto max-w-md text-base">
                {emailDelivered
                  ? "Tu equipo ya tiene su QR de acceso y hemos enviado una copia al correo del responsable."
                  : emailBlocked
                    ? "La inscripción se ha guardado y el QR único del equipo ya está listo en esta pantalla."
                    : "La inscripción se ha completado, pero el correo no ha podido salir. Usa este QR y este código como referencia."}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              {code ? (
                <div className="public-glass p-8 text-center lg:text-left">
                  <p className="public-kicker mb-4">Código de registro</p>
                  <p
                    className="text-4xl font-bold tracking-[0.08em] text-[var(--app-accent)] sm:text-5xl"
                    style={{ fontFamily: "monospace" }}
                  >
                    {code.toUpperCase()}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#a8b7d2]">
                    Guárdalo. Lo necesitarás para consultar el estado del equipo y localizar la inscripción.
                  </p>

                  <div className="public-soft mt-6 p-5 text-left">
                    <div className="flex items-start gap-4">
                      {emailDelivered ? (
                        <MailCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--app-accent)]" />
                      ) : (
                        <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[var(--app-accent)]" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {emailDelivered ? "Correo enviado" : "Correo no disponible"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#a8b7d2]">
                          {emailDelivered
                            ? `Se ha enviado una copia a ${team?.captain_email ?? "la dirección indicada"}.`
                            : "El registro está correcto, pero este entorno no ha podido enviar el correo automático. El QR sigue disponible aquí."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="public-glass p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(141,246,95,0.18)] bg-[rgba(84,209,43,0.08)]">
                  <QrCode className="h-6 w-6 text-[var(--app-accent)]" />
                </div>
                <p className="public-kicker mt-5">QR único del equipo</p>
                {teamQrPath ? (
                  <QrTile
                    href={teamQrPath}
                    label="QR de acceso"
                    note="Escanéalo en la entrada o guárdalo en el móvil del responsable."
                    variant="public"
                  />
                ) : (
                  <div className="public-soft mt-4 p-5 text-sm leading-6 text-[#a8b7d2]">
                    El QR todavía no está disponible. Si acabas de terminar la inscripción, recarga esta pantalla en unos segundos.
                  </div>
                )}
              </div>
            </div>

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
                  Ver estado del equipo
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
