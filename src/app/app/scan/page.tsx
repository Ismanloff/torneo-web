import { Keyboard, QrCode, ScanLine } from "lucide-react";

import { lookupTeamByCodeAction } from "@/app/admin/actions";
import { LiveQrScanner } from "@/components/live-qr-scanner";
import { requireStaffSession } from "@/lib/admin-auth";

type ScanPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorLabel(error?: string) {
  if (error === "codigo") return "Introduce un codigo valido.";
  if (error === "no-team") return "No existe ningun equipo con ese codigo.";
  return null;
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  await requireStaffSession();
  const params = await searchParams;
  const errorLabel = getErrorLabel(params.error);

  return (
    <main className="grid gap-5">
      <section className="app-hero app-hero--compact">
        <div className="app-hero__content grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="order-1">
            <div className="app-chip-row">
              <span className="app-chip app-chip--accent">
                <ScanLine className="h-4 w-4" />
                Acceso instantaneo
              </span>
            </div>
            <p className="app-kicker mt-4">Escaner operativo</p>
            <h1 className="app-section-title mt-3 text-white">Scan QR</h1>
            <p className="app-copy mt-4 max-w-xl text-sm">
              Usa camara para abrir equipos y flujos de mesa. Si el QR falla, entra por codigo manual sin salir de la vista.
            </p>

            <section className="app-panel mt-4 lg:hidden">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-[var(--app-info)]" />
                <p className="app-kicker">Fallback manual</p>
              </div>
              <form action={lookupTeamByCodeAction} className="mt-4 grid gap-3">
                <label className="field-shell">
                  <span className="field-label field-label--dark">Codigo del equipo</span>
                  <input
                    required
                    className="field-input field-input--dark"
                    name="registrationCode"
                    placeholder="LOBOS-SAN-JOSE-282"
                  />
                </label>
                <button className="app-action w-full sm:w-fit" type="submit">
                  <QrCode className="h-4 w-4" />
                  Abrir equipo
                </button>
                <p className="text-sm text-[var(--app-muted)]">
                  Usa esta entrada cuando la camara no lea bien o el brillo de pista moleste.
                </p>
              </form>
            </section>
          </div>

          <section className="app-panel-strong order-2" id="scanner">
            <LiveQrScanner />
          </section>
        </div>
      </section>

      <section className="app-panel hidden lg:block" id="manual">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-[var(--app-info)]" />
          <p className="app-kicker">Fallback manual</p>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <form action={lookupTeamByCodeAction} className="grid flex-1 gap-3">
            <label className="field-shell">
              <span className="field-label field-label--dark">Codigo del equipo</span>
              <input
                required
                className="field-input field-input--dark"
                name="registrationCode"
                placeholder="LOBOS-SAN-JOSE-282"
              />
            </label>
            <button className="app-action w-full sm:w-fit" type="submit">
              <QrCode className="h-4 w-4" />
              Abrir equipo
            </button>
          </form>

          <div className="rounded-[1.35rem] border border-[var(--app-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--app-muted)]">
            Entrada recomendada cuando la camara no lee o el brillo de pista molesta.
          </div>
        </div>

        {errorLabel ? (
          <p className="mt-3 text-sm text-[var(--app-accent)]">{errorLabel}</p>
        ) : null}
      </section>
    </main>
  );
}
