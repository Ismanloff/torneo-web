import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { consumePostLoginTarget } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const supabase = await createSupabaseServerClient();

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=magic`);
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=magic`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.redirect(`${origin}/login?error=restricted`);
  }

  const email = user.email.toLowerCase();
  const { data: currentProfile } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{
      id: string;
      role: string;
    }>();

  let profile = currentProfile;

  if (!profile) {
    const { data: byEmail } = await supabaseAdmin
      .from("staff_profiles")
      .select("*")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle<{
        id: string;
        role: string;
        auth_user_id: string | null;
      }>();

    if (!byEmail) {
      return NextResponse.redirect(`${origin}/login?error=restricted`);
    }

    const { data: linkedProfile } = await supabaseAdmin
      .from("staff_profiles")
      .update({
        auth_user_id: user.id,
      })
      .eq("id", byEmail.id)
      .select("*")
      .single<{
        id: string;
        role: string;
      }>();

    profile = linkedProfile;
  }

  if (!profile) {
    return NextResponse.redirect(`${origin}/login?error=restricted`);
  }

  const cookieTarget = await consumePostLoginTarget();
  const nextTarget = cookieTarget ?? (next?.startsWith("/") ? next : "/app");
  const finalTarget = profile.role === "admin" && nextTarget === "/app" ? "/app/admin" : nextTarget;

  return NextResponse.redirect(`${origin}${finalTarget}`);
}
