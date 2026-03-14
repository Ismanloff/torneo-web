import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

import { logoutAdminAction } from "@/app/admin/actions";
import { AppShellNav } from "@/components/app-shell-nav";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SyncIndicator } from "@/components/sync-indicator";
import { requireStaffSession } from "@/lib/admin-auth";
import { formatStaffRoleLabel } from "@/lib/utils";

export default async function StaffAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await requireStaffSession();

  return (
    <div className="app-canvas">
      <RealtimeRefresh
        channelName={`staff-app-${staff.authUserId ?? "legacy-admin"}`}
        tables={["category_matches", "bracket_matches", "category_brackets", "team_checkins", "staff_assignments"]}
      />
      <div className="app-shell">
        <header className="app-topbar">
          <div className="app-topbar__inner">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="app-status-dot shrink-0" />
                <p className="app-kicker">Operativa en pista</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="font-display text-[1.65rem] font-semibold tracking-[-0.04em] text-white">
                  Operativa
                </p>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-line)] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[var(--app-muted)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                  {staff.profile.full_name} · {formatStaffRoleLabel(staff.profile.role)}
                </span>
              </div>
              <p className="mt-2 max-w-xl text-sm text-[var(--app-muted)]">
                Marcadores, validaciones QR y agenda en vivo con navegación de app instalada.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <Link className="app-link-pill" href="/">
                Portal publico
                <ChevronRight className="h-4 w-4" />
              </Link>
              <form action={logoutAdminAction}>
                <button className="app-action app-action--ghost" type="submit">
                  Salir
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="app-shell-content">{children}</div>
        <AppShellNav role={staff.profile.role} />
        <SyncIndicator />
      </div>
    </div>
  );
}
