import { ScanLine } from "lucide-react";

import { LiveQrScanner } from "@/components/live-qr-scanner";
import { requireStaffSession } from "@/lib/admin-auth";

export default async function ScanPage() {
  await requireStaffSession();

  return (
    <main className="grid gap-5">
      <section className="app-hero app-hero--compact">
        <div className="app-hero__content grid gap-5">
          <div>
            <div className="app-chip-row">
              <span className="app-chip app-chip--accent">
                <ScanLine className="h-4 w-4" />
                Scan operativo
              </span>
            </div>
            <p className="app-kicker mt-4">Llegada por QR</p>
            <h1 className="app-section-title mt-3 text-white">Escáner QR</h1>
            <p className="app-copy mt-4 max-w-xl text-sm">
              Escanea el QR del equipo para validar su llegada. Si falla, abre la ficha manualmente desde Gestión.
            </p>
          </div>

          <section className="app-panel-strong" id="scanner">
            <LiveQrScanner />
          </section>
        </div>
      </section>
    </main>
  );
}
