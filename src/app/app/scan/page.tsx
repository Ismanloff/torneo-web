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
      <section className="app-hero">
        <div className="app-hero__content grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="app-chip-row">
              <span className="app-chip app-chip--accent">
                <ScanLine className="h-4 w-4" />
                Acceso instantaneo
              </span>
            </div>
            <p className="app-kicker mt-5">Escaner operativo</p>
            <h1 className="app-section-title mt-3 text-white">Scan QR</h1>
            <p className="app-copy mt-4 max-w-xl text-sm">
              Usa camara para abrir equipos y flujos de mesa. Si el QR falla, entra por codigo manual sin salir de la vista.
            </p>
          </div>

          <section className="app-panel-strong">
            <LiveQrScanner />
          </section>
        </div>
      </section>

      <section className="app-panel">
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
