import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

loadEnv({ path: process.env.TEST_ENV_FILE || ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
const hasDatabaseEnv = Boolean(supabaseUrl && supabaseSecretKey);

const supabase = hasDatabaseEnv
  ? createClient(supabaseUrl!, supabaseSecretKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

const databaseDescribe = hasDatabaseEnv ? describe : describe.skip;

databaseDescribe("database integrity", () => {
  it("has one active tournament with active categories", async () => {
    const { data: tournaments, error: tournamentError } = await supabase!
      .from("tournaments")
      .select("id")
      .eq("is_active", true);
    const { data: categories, error: categoryError } = await supabase!
      .from("categories")
      .select("id, max_teams")
      .eq("is_active", true);

    expect(tournamentError).toBeNull();
    expect(categoryError).toBeNull();
    expect(tournaments).toHaveLength(1);
    expect(categories?.length ?? 0).toBeGreaterThan(0);
    expect(categories?.every((category) => (category.max_teams ?? 0) > 0)).toBe(true);
  });

  it("keeps registration codes unique and every team linked to an active QR token", async () => {
    const { data: teams, error: teamError } = await supabase!
      .from("teams")
      .select("id, registration_code");
    const { data: teamTokens, error: tokenError } = await supabase!
      .from("match_qr_tokens")
      .select("resource_id, token")
      .eq("resource_type", "team")
      .eq("is_active", true);

    expect(teamError).toBeNull();
    expect(tokenError).toBeNull();

    const codes = new Set<string>();
    for (const team of teams ?? []) {
      expect(codes.has(team.registration_code)).toBe(false);
      codes.add(team.registration_code);
    }

    const resourceIdsWithToken = new Set((teamTokens ?? []).map((token) => token.resource_id));
    for (const team of teams ?? []) {
      expect(resourceIdsWithToken.has(team.id)).toBe(true);
    }
  });

  it("keeps operational settings and staffing relations consistent", async () => {
    const { data: categories, error: categoryError } = await supabase!
      .from("categories")
      .select("id")
      .eq("is_active", true);
    const { data: settings, error: settingsError } = await supabase!
      .from("category_operational_settings")
      .select("category_id");
    const { data: staffProfiles, error: staffError } = await supabase!
      .from("staff_profiles")
      .select("auth_user_id")
      .eq("is_active", true);
    const { data: assignments, error: assignmentError } = await supabase!
      .from("staff_assignments")
      .select("staff_user_id");
    const { data: checkins, error: checkinsError } = await supabase!
      .from("team_checkins")
      .select("team_id");
    const { data: teams, error: teamsError } = await supabase!
      .from("teams")
      .select("id");

    expect(categoryError).toBeNull();
    expect(settingsError).toBeNull();
    expect(staffError).toBeNull();
    expect(assignmentError).toBeNull();
    expect(checkinsError).toBeNull();
    expect(teamsError).toBeNull();

    const activeCategoryIds = new Set((categories ?? []).map((category) => category.id));
    const configuredCategoryIds = new Set((settings ?? []).map((setting) => setting.category_id));
    for (const categoryId of activeCategoryIds) {
      expect(configuredCategoryIds.has(categoryId)).toBe(true);
    }

    const activeStaffIds = new Set(
      (staffProfiles ?? [])
        .map((profile) => profile.auth_user_id)
        .filter((value): value is string => Boolean(value)),
    );
    for (const assignment of assignments ?? []) {
      expect(activeStaffIds.has(assignment.staff_user_id)).toBe(true);
    }

    const teamIds = new Set((teams ?? []).map((team) => team.id));
    for (const checkin of checkins ?? []) {
      expect(teamIds.has(checkin.team_id)).toBe(true);
    }
  });
});
