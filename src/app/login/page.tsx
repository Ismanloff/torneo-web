import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAdminAction } from "@/app/admin/actions";
import { StaffMagicLinkForm } from "@/components/staff-magic-link-form";
import { getAdminAccessContext } from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

function getErrorLabel(error?: string) {
  if (error === "restricted") return "Tu cuenta no tiene permisos para esta zona.";
  if (error === "legacy") return "La clave interna no es correcta.";
  if (error === "magic") return "No se ha podido validar el enlace. Pide uno nuevo.";
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

  const nextPath = params.next?.startsWith("/") ? params.next : "/app";
  const errorLabel = getErrorLabel(params.error);

  return (
    <main className="public-auth flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-[400px] px-4 py-10">
        <section className="public-glass p-6">
          <p className="public-kicker">Zona interna</p>
          <h1 className="public-title mt-3 text-3xl">Acceso staff</h1>
          <p className="public-copy mt-3 text-sm">
            Introduce tu correo para recibir un enlace de acceso seguro.
          </p>

          {errorLabel ? (
            <div className="mt-5 rounded-[1.4rem] border border-[rgba(255,107,107,0.28)] bg-[rgba(127,29,29,0.2)] px-4 py-3 text-sm text-[#fecaca]">
              {errorLabel}
            </div>
          ) : null}

          <div className="mt-6">
            <StaffMagicLinkForm nextPath={nextPath} />
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/14 to-transparent" />

          <details className="text-sm">
            <summary className="cursor-pointer text-[#a8b7d2] hover:text-[var(--app-text)]">
              Acceso con clave interna
            </summary>
            <form action={loginAdminAction} className="mt-4 grid gap-4">
              <label className="field-shell">
                <span className="field-label">Clave de acceso</span>
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
