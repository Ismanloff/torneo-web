import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { sanitizeRelativePath } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectNoStore(target: string) {
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin, searchParams } = url;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const nextPath = searchParams.get("next");
  const redirectTo = sanitizeRelativePath(nextPath, "/app");
  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectNoStore(`${origin}${redirectTo}`);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (!error) {
      return redirectNoStore(`${origin}${redirectTo}`);
    }
  }

  return redirectNoStore(`${origin}/login?error=restricted`);
}
