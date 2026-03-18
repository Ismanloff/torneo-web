import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminAccessContext } from "@/lib/admin-auth";
import { validateCompletedScore } from "@/lib/sport-rules";
import { getOperationalMatchById } from "@/lib/supabase/queries";
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
    const accessContext = await getAdminAccessContext();
    let staffContext = null;

    if (accessContext?.mode === "staff") {
      staffContext = {
        authUserId: accessContext.authUserId,
        profile: accessContext.profile,
      };
    } else if (accessContext?.mode === "legacy") {
      staffContext = {
        authUserId: null,
        profile: {
          id: "legacy-admin",
          auth_user_id: null,
          email: "legacy-admin@local",
          full_name: "Superadmin temporal",
          role: "superadmin" as const,
          pin: null,
          is_active: true,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        },
      };
    } else {
      const supabase = await createSupabaseServerClient();
      const claimsResult = await supabase.auth.getClaims();
      const userId = claimsResult.data?.claims?.sub ?? null;

      if (userId) {
        const { data: profile } = await supabaseAdmin
          .from("staff_profiles")
          .select("*")
          .eq("auth_user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (profile) {
          staffContext = {
            authUserId: userId,
            profile,
          };
        }
      }
    }

    if (!staffContext) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesion primero." },
        { status: 401 },
      );
    }

    const detail = await getOperationalMatchById(staffContext, {
      matchId,
      scope: matchScope,
    });

    if (!detail || !detail.canSubmitResult) {
      return NextResponse.json(
        { error: "No tienes permiso para registrar el resultado de este partido." },
        { status: 403 },
      );
    }

    const validationError = validateCompletedScore({
      sport: detail.category.category.sport,
      homeScore,
      awayScore,
    });

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

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
      actor_user_id: staffContext.authUserId,
      actor_role: staffContext.profile.role,
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
