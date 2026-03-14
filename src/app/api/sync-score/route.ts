import { NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const syncScoreSchema = z.object({
  matchId: z.string().uuid(),
  matchScope: z.enum(["category_match", "bracket_match"]),
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});

export async function POST(request: Request) {
  try {
    // Auth check — require a valid Supabase session
    const supabase = await createSupabaseServerClient();
    const claimsResult = await supabase.auth.getClaims();
    const userId = claimsResult.data?.claims?.sub ?? null;

    // Also check legacy admin cookie as fallback
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("torneo_admin_session")?.value;
    const hasAdminSession = !!adminCookie;

    if (!userId && !hasAdminSession) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesion primero." },
        { status: 401 },
      );
    }

    // Derive actor role from session, not from request body
    let actorRole = "referee";
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("staff_profiles")
        .select("role")
        .eq("auth_user_id", userId)
        .maybeSingle<{ role: string }>();
      if (profile) actorRole = profile.role;
    } else if (hasAdminSession) {
      actorRole = "admin";
    }

    const body = await request.json();
    const parsed = syncScoreSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos de sincronizacion invalidos.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { matchId, matchScope, homeScore, awayScore } = parsed.data;
    const table = matchScope === "category_match" ? "category_matches" : "bracket_matches";

    const { data: previousMatch } = await supabaseAdmin
      .from(table)
      .select("status, home_score, away_score")
      .eq("id", matchId)
      .maybeSingle<{
        status: string | null;
        home_score: number | null;
        away_score: number | null;
      }>();

    if (!previousMatch) {
      return NextResponse.json(
        { error: "Partido no encontrado." },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from(table)
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "completed",
      })
      .eq("id", matchId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    await supabaseAdmin.from("match_result_audit").insert({
      match_scope: matchScope,
      match_id: matchId,
      actor_user_id: userId,
      actor_role: actorRole,
      previous_status: previousMatch.status,
      new_status: "completed",
      previous_home_score: previousMatch.home_score,
      previous_away_score: previousMatch.away_score,
      new_home_score: homeScore,
      new_away_score: awayScore,
      notes: "Sincronizado desde modo offline (Background Sync)",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al sincronizar resultado.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
