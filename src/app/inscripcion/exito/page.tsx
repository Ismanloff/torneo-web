import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle, Home, MailCheck, QrCode, UserCheck } from "lucide-react";

import { PublicBrandLockup } from "@/components/public-brand-lockup";
import { PublicSiteNav } from "@/components/public-site-nav";
import { QrTile } from "@/components/qr-tile";
import { getRegistrationSuccessFlash } from "@/lib/flash-state";
import { getPublicTeamByToken } from "@/lib/supabase/queries";
import { maskEmailAddress } from "@/lib/security";
import { buildPublicQrTargetPath, buildQrShareUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inscripción completada",
};

export const dynamic = "force-dynamic";

type ExitoPageProps = {
  searchParams: Promise<{
    team?: string;
    token?: string;
    email?: string;
  }>;
};

export default async function ExitoPage({ searchParams }: ExitoPageProps) {
  const [params, registrationState] = await Promise.all([
    searchParams,
    getRegistrationSuccessFlash(),
  ]);
  const teamId = registrationState?.teamId ?? params.team ?? "";
  const token = registrationState?.token ?? params.token ?? "";
  const emailStatus =
    registrationState?.emailStatus ??
    (params.email === "sent"
      ? "sent"
      : params.email === "failed"
        ? "failed"
        : "skipped");
  const detail =
    teamId && token
      ? await getPublicTeamByToken({
          token,
          teamId,
        })
      : null;
  const team = detail?.team ?? null;
  const privateTeamPath =
    team && detail
      ? buildPublicQrTargetPath({
          resource_id: team.id,
          resource_type: "team",
        })
      : null;
  const teamQrPath = team && detail ? buildQrShareUrl(token) : null;
  const emailDelivered = emailStatus === "sent";
  const emailBlocked = emailStatus === "skipped";
  const maskedCaptainEmail = maskEmailAddress(team?.captain_email);

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
                  {detail?.category.sport} &middot; {detail?.category.name} &middot; {detail?.category.age_group}
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
              {team ? (
                <div className="public-glass p-8 text-center lg:text-left">
                  <p className="public-kicker mb-4">Código de registro</p>
                  <p
                    className="text-4xl font-bold tracking-[0.08em] text-[var(--app-accent)] sm:text-5xl"
                    style={{ fontFamily: "monospace" }}
                  >
                    {team.registration_code}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#a8b7d2]">
                    Guárdalo como referencia de inscripción. El acceso privado del equipo queda protegido por el enlace y el QR de esta pantalla.
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
                            ? `Se ha enviado una copia a ${maskedCaptainEmail}.`
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
                      {team.captain_name} &middot; {maskedCaptainEmail}
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
              {privateTeamPath ? (
                <Link className="public-action" href={privateTeamPath}>
                  <UserCheck className="h-4 w-4" />
                  Abrir panel privado del equipo
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
