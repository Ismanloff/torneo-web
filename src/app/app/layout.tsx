import Link from "next/link";

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
            <div>
              <div className="flex items-center gap-3">
                <span className="app-status-dot" />
                <p className="app-kicker">
                  Operativa en pista
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {staff.profile.full_name} · {formatStaffRoleLabel(staff.profile.role)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link className="app-link-pill" href="/">
                Portal publico
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
