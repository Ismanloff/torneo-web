import { NextResponse } from "next/server";

import { setPublicAccessState } from "@/lib/flash-state";
import { getAdminAccessContext } from "@/lib/admin-auth";
import { getQrTargetByToken, touchQrToken } from "@/lib/supabase/queries";
import { buildPublicQrTargetPath, buildQrTargetPath } from "@/lib/utils";

type QrRouteProps = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(request: Request, { params }: QrRouteProps) {
  const { origin } = new URL(request.url);
  const { token } = await params;
  const qrTarget = await getQrTargetByToken(token);

  if (!qrTarget) {
    const response = NextResponse.redirect(`${origin}/login?error=restricted`);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  await touchQrToken(token);

  const appTargetUrl = new URL(buildQrTargetPath(qrTarget), origin);

  if (qrTarget.resource_type === "team") {
    appTargetUrl.searchParams.set("entry", "1");
  }

  appTargetUrl.searchParams.set("from", "scan");
  const publicDestination = buildPublicQrTargetPath(qrTarget);

  const context = await getAdminAccessContext();

  if (!context) {
    await setPublicAccessState({
      resourceId: qrTarget.resource_id,
      resourceType: qrTarget.resource_type,
      token,
    });

    const response = NextResponse.redirect(`${origin}${publicDestination}`);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const response = NextResponse.redirect(appTargetUrl);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
