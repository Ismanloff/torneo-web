import { NextResponse } from "next/server";

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
    return NextResponse.redirect(`${origin}/login?error=restricted`);
  }

  await touchQrToken(token);

  const appDestination =
    qrTarget.resource_type === "team"
      ? `${buildQrTargetPath(qrTarget)}?entry=1`
      : buildQrTargetPath(qrTarget);
  const publicDestination = buildPublicQrTargetPath({
    ...qrTarget,
    token,
  });

  const context = await getAdminAccessContext();

  if (!context) {
    return NextResponse.redirect(`${origin}${publicDestination}`);
  }

  return NextResponse.redirect(`${origin}${appDestination}`);
}
