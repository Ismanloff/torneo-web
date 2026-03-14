import Link from "next/link";
import type { Metadata } from "next";

import { ParentalConfirmationForm } from "@/components/parental-confirmation-form";
import { getParentalConfirmationByToken } from "@/lib/supabase/queries";

type ConfirmationPageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: ConfirmationPageProps): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Confirmacion parental ${token.slice(0, 8)}`,
  };
}

export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const { token } = await params;
  const confirmation = await getParentalConfirmationByToken(token);

  if (!confirmation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
        <section className="panel-strong w-full text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--signal)]">
            Enlace no valido
          </p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-none">
            No se ha encontrado la autorizacion
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Puede que el enlace haya caducado o ya no exista en la base de datos.
          </p>
          <div className="mt-8">
            <Link className="link-pill" href="/">
              Volver al portal
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="panel-strong">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--signal)]">
            Autorizacion parental
          </p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-none">
            Confirmacion del menor
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Este formulario deja constancia de la autorizacion asociada al equipo inscrito.
          </p>

          <div className="signal-divider my-6" />

          <dl className="grid gap-4">
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/80 p-4">
              <dt className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Equipo</dt>
              <dd className="mt-2 text-lg font-semibold">{confirmation.team.team_name}</dd>
            </div>
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/80 p-4">
              <dt className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Categoria
              </dt>
              <dd className="mt-2 text-lg font-semibold">{confirmation.team.category.name}</dd>
            </div>
            <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/80 p-4">
              <dt className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Jugador o responsable deportivo
              </dt>
              <dd className="mt-2 text-lg font-semibold">{confirmation.child_name}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <ParentalConfirmationForm
            expiresAt={confirmation.expires_at}
            status={confirmation.status}
            token={confirmation.token}
          />
        </article>
      </section>
    </main>
  );
}
