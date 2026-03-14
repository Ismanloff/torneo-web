import { QrCode } from "lucide-react";

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
      {/* ── Title ── */}
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-[var(--app-accent)]" />
        <h1 className="app-section-title text-2xl">Scan QR</h1>
      </div>

      {/* ── Scanner — protagonist ── */}
      <section className="app-panel-strong">
        <LiveQrScanner />
      </section>

      {/* ── Manual fallback ── */}
      <section className="app-panel">
        <p className="app-kicker mb-3">Codigo manual</p>
        <form action={lookupTeamByCodeAction} className="grid gap-3">
          <label className="field-shell">
            <span className="field-label field-label--dark">Codigo del equipo</span>
            <input
              required
              className="field-input field-input--dark"
              name="registrationCode"
              placeholder="LOBOS-SAN-JOSE-282"
            />
          </label>
          <button className="app-action" type="submit">
            Abrir equipo
          </button>
        </form>

        {errorLabel ? (
          <p className="mt-3 text-sm text-[var(--app-accent)]">{errorLabel}</p>
        ) : null}
      </section>
    </main>
  );
}
