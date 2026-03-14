import { NextResponse } from "next/server";

import { setPostLoginTarget } from "@/lib/admin-auth";
import { getQrTargetByToken, touchQrToken } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase = await createSupabaseServerClient();
  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;

  if (!claims?.sub) {
    return NextResponse.redirect(`${origin}${publicDestination}`);
  }

  await setPostLoginTarget(appDestination);
  return NextResponse.redirect(`${origin}${appDestination}`);
}
