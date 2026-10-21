import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";
import { isTournamentCancelledMode, TOURNAMENT_CANCELLED_ROUTE } from "@/lib/tournament-status";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    isTournamentCancelledMode() &&
    !pathname.startsWith(TOURNAMENT_CANCELLED_ROUTE) &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !/\.[^/]+$/.test(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = TOURNAMENT_CANCELLED_ROUTE;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
