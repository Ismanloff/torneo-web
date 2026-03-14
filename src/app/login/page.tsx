import { KeyRound, Shield, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAdminAction } from "@/app/admin/actions";
import { PinLoginForm } from "@/components/pin-login-form";
import { getAdminAccessContext } from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorLabel(error?: string) {
  if (error === "restricted") return "Tu cuenta no tiene permisos para esta zona.";
  if (error === "legacy") return "La clave interna no es correcta.";
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [context, params] = await Promise.all([getAdminAccessContext(), searchParams]);

  if (context?.role === "admin") {
    redirect("/app/admin");
  }

  if (context?.role) {
    redirect("/app");
  }

  const errorLabel = getErrorLabel(params.error);

  return (
    <main className="public-auth flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-[430px] px-4 py-10">
        <section className="public-glass overflow-hidden p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[rgba(141,246,95,0.2)] bg-gradient-to-br from-[rgba(141,246,95,0.24)] to-[rgba(84,209,43,0.08)]">
              <Shield className="h-5 w-5 text-[var(--app-accent)]" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-[#d6e1f3]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--app-accent)]" />
              PWA staff
            </span>
          </div>

          <p className="public-kicker">Torneo Escolar</p>
          <h1 className="public-title mt-3 text-4xl text-white sm:text-[2.8rem]">
            Acceso Staff
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#a8b7d2]">
            Entra con PIN para abrir la operativa movil. La experiencia esta optimizada para uso en pista como app instalada.
          </p>

          {errorLabel ? (
            <div className="mt-5 rounded-[1.4rem] border border-[rgba(255,107,107,0.28)] bg-[rgba(127,29,29,0.2)] px-4 py-3 text-sm text-[#fecaca]">
              {errorLabel}
            </div>
          ) : null}

          <div className="mt-8">
            <PinLoginForm error={params.error === "pin" ? params.error : null} />
          </div>

          <div className="my-7 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />

          <details className="text-sm">
            <summary className="cursor-pointer text-center text-[#a8b7d2] hover:text-[var(--app-text)]">
              Acceso super admin
            </summary>
            <form action={loginAdminAction} className="mt-4 grid gap-4">
              <label className="field-shell">
                <span className="field-label" style={{ color: "#93a7cb" }}>
                  Clave de acceso
                </span>
                <input
                  required
                  className="field-input"
                  name="accessKey"
                  placeholder="Introduce la clave interna"
                  type="password"
                />
              </label>

              <button className="public-action" type="submit">
                <KeyRound className="h-4 w-4" />
                Entrar como admin
              </button>
            </form>
          </details>
        </section>
      </div>
    </main>
  );
}
