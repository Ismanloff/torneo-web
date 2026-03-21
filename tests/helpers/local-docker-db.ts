import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: process.env.TEST_ENV_FILE || ".env.local" });

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
export const adminAccessKey = process.env.ADMIN_ACCESS_KEY?.trim() ?? "";
export const hasLocalDockerDb =
  /^http:\/\/127\.0\.0\.1:55321$/.test(supabaseUrl) ||
  /^http:\/\/localhost:55321$/.test(supabaseUrl);

export const localSupabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

type TournamentRow = {
  id: string;
  start_date: string;
};

type SchoolRow = {
  id: string;
  name: string;
};

type CategoryFixture = {
  id: string;
  name: string;
  sport: string;
};

type TeamFixture = {
  id: string;
  team_name: string;
  registration_code: string;
  qrToken: string;
};

type StaffFixture = {
  id: string;
  authUserId: string;
  pin: string;
  fullName: string;
  role: "assistant" | "referee";
};

export type OperationalScenario = {
  category: CategoryFixture;
  teams: TeamFixture[];
  assistant: StaffFixture;
  referee: StaffFixture;
};

async function createLocalAuthUser(params: {
  prefix: string;
  role: "assistant" | "referee";
  fullName: string;
}) {
  const supabase = requireLocalSupabase();
  const email = `${params.prefix.toLowerCase().replace(/\s+/g, "-")}-${params.role}-${randomUUID().slice(0, 8)}@torneo.test`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      role: params.role,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? `Could not create local auth user for ${params.role}.`);
  }

  return {
    id: data.user.id,
    email,
  };
}

function requireLocalSupabase() {
  if (!localSupabase || !hasLocalDockerDb) {
    throw new Error("This test requires the local Docker Supabase replica.");
  }

  return localSupabase;
}

function requireAdminAccessKey() {
  if (!adminAccessKey) {
    throw new Error("Missing ADMIN_ACCESS_KEY for local Docker tests.");
  }

  return adminAccessKey;
}

export function buildLegacyAdminSessionValue() {
  return createHash("sha256").update(requireAdminAccessKey()).digest("hex");
}

export function hashStaffPin(pin: string) {
  return createHmac("sha256", requireAdminAccessKey())
    .update(`staff-pin:${pin}`)
    .digest("hex");
}

function createRegistrationCode(prefix: string) {
  return `${prefix}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function createQrToken() {
  return randomBytes(18).toString("base64url");
}

async function createUniqueStaffPin() {
  const supabase = requireLocalSupabase();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pin = `${Math.floor(100000 + Math.random() * 900000)}`;
    const pinHash = hashStaffPin(pin);
    const { data, error } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("pin_hash", pinHash)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return pin;
    }
  }

  throw new Error("Could not generate a unique staff PIN for the local fixture.");
}

async function getActiveTournamentContext() {
  const supabase = requireLocalSupabase();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id, start_date")
    .eq("is_active", true)
    .limit(1)
    .single<TournamentRow>();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message ?? "No active tournament found.");
  }

  const { data: school } = await supabase
    .from("schools")
    .select("id, name")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<SchoolRow>();

  return {
    tournament,
    school: school ?? null,
  };
}

export async function createRegistrationCategoryFixture(prefix: string) {
  const supabase = requireLocalSupabase();
  const context = await getActiveTournamentContext();
  const categoryName = `${prefix} Registro`;
  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      tournament_id: context.tournament.id,
      school_id: context.school?.id ?? null,
      name: categoryName,
      sport: "Fútbol",
      school: context.school?.name ?? "Colegio Mater",
      age_group: "14-17 años",
      age_min: 14,
      age_max: 17,
      max_teams: 8,
      current_teams: 0,
      is_active: true,
    })
    .select("id, name, sport")
    .single<CategoryFixture>();

  if (error || !category) {
    throw new Error(error?.message ?? "Could not create registration category fixture.");
  }

  const { error: settingsError } = await supabase.from("category_operational_settings").insert({
    category_id: category.id,
    match_minutes: 10,
    turnover_minutes: 5,
    venue_count: 1,
    window_start: "09:00:00",
    window_end: "13:00:00",
  });

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  return {
    tournamentId: context.tournament.id,
    category,
  };
}

export async function createOperationalScenario(prefix: string): Promise<OperationalScenario> {
  const supabase = requireLocalSupabase();
  const context = await getActiveTournamentContext();
  const categoryName = `${prefix} Operativa`;
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .insert({
      tournament_id: context.tournament.id,
      school_id: context.school?.id ?? null,
      name: categoryName,
      sport: "Fútbol",
      school: context.school?.name ?? "Colegio Mater",
      age_group: "14-17 años",
      age_min: 14,
      age_max: 17,
      max_teams: 8,
      current_teams: 4,
      is_active: true,
    })
    .select("id, name, sport")
    .single<CategoryFixture>();

  if (categoryError || !category) {
    throw new Error(categoryError?.message ?? "Could not create operational category.");
  }

  const { error: settingsError } = await supabase.from("category_operational_settings").insert({
    category_id: category.id,
    match_minutes: 10,
    turnover_minutes: 5,
    venue_count: 1,
    window_start: "09:00:00",
    window_end: "13:00:00",
  });

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  const teamRows = Array.from({ length: 4 }, (_, index) => {
    const label = `${prefix} Equipo ${index + 1}`;
    return {
      category_id: category.id,
      team_name: label,
      captain_name: `Responsable ${index + 1}`,
      captain_phone: `6000000${index + 1}`,
      captain_email: `${prefix.toLowerCase().replace(/\s+/g, "-")}-captain-${index + 1}@torneo.test`,
      total_players: 8,
      registration_code: createRegistrationCode(`T${index + 1}`),
      status: "pending",
      gdpr_consent: true,
      regulation_accepted: true,
      parental_confirmation_required: false,
      checked_in_at: new Date().toISOString(),
    };
  });

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .insert(teamRows)
    .select("id, team_name, registration_code");

  if (teamsError || !teams) {
    throw new Error(teamsError?.message ?? "Could not create operational teams.");
  }

  const teamFixtures: TeamFixture[] = [];

  for (const team of teams) {
    const qrToken = createQrToken();
    const { error: qrError } = await supabase.from("match_qr_tokens").insert({
      token: qrToken,
      resource_type: "team",
      resource_id: team.id,
      is_active: true,
    });

    if (qrError) {
      throw new Error(qrError.message);
    }

    teamFixtures.push({
      id: team.id,
      team_name: team.team_name,
      registration_code: team.registration_code,
      qrToken,
    });
  }

  const assistantPin = await createUniqueStaffPin();
  const refereePin = await createUniqueStaffPin();
  const assistantId = randomUUID();
  const refereeId = randomUUID();
  const assistantFullName = `${prefix} Asistente`;
  const refereeFullName = `${prefix} Árbitro`;
  const assistantAuthUser = await createLocalAuthUser({
    prefix,
    role: "assistant",
    fullName: assistantFullName,
  });
  const refereeAuthUser = await createLocalAuthUser({
    prefix,
    role: "referee",
    fullName: refereeFullName,
  });

  const staffRows = [
    {
      id: assistantId,
      auth_user_id: assistantAuthUser.id,
      email: assistantAuthUser.email,
      full_name: assistantFullName,
      role: "assistant",
      pin: null,
      pin_hash: hashStaffPin(assistantPin),
      pin_last_four: assistantPin.slice(-4),
      is_active: true,
    },
    {
      id: refereeId,
      auth_user_id: refereeAuthUser.id,
      email: refereeAuthUser.email,
      full_name: refereeFullName,
      role: "referee",
      pin: null,
      pin_hash: hashStaffPin(refereePin),
      pin_last_four: refereePin.slice(-4),
      is_active: true,
    },
  ];

  const { error: staffError } = await supabase.from("staff_profiles").insert(staffRows);

  if (staffError) {
    throw new Error(staffError.message);
  }

  const { error: assignmentError } = await supabase.from("staff_assignments").insert([
    {
      staff_user_id: assistantAuthUser.id,
      tournament_id: context.tournament.id,
      duty: "assistant",
      category_id: category.id,
      category_match_id: null,
      bracket_match_id: null,
    },
    {
      staff_user_id: refereeAuthUser.id,
      tournament_id: context.tournament.id,
      duty: "referee",
      category_id: category.id,
      category_match_id: null,
      bracket_match_id: null,
    },
  ]);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  return {
    category,
    teams: teamFixtures,
    assistant: {
      id: assistantId,
      authUserId: assistantAuthUser.id,
      pin: assistantPin,
      fullName: assistantFullName,
      role: "assistant",
    },
    referee: {
      id: refereeId,
      authUserId: refereeAuthUser.id,
      pin: refereePin,
      fullName: refereeFullName,
      role: "referee",
    },
  };
}

export async function getCategoryMatches(categoryId: string) {
  const supabase = requireLocalSupabase();
  const { data, error } = await supabase
    .from("category_matches")
    .select("*")
    .eq("category_id", categoryId)
    .order("match_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getTeamQrToken(teamId: string) {
  const supabase = requireLocalSupabase();
  const { data, error } = await supabase
    .from("match_qr_tokens")
    .select("*")
    .eq("resource_type", "team")
    .eq("resource_id", teamId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load team QR token.");
  }

  return data;
}

export async function getTeamCheckin(scope: "category_match" | "bracket_match", matchId: string, teamId: string) {
  const supabase = requireLocalSupabase();
  const { data, error } = await supabase
    .from("team_checkins")
    .select("*")
    .eq("match_scope", scope)
    .eq("match_id", matchId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getTeamByCaptainEmail(email: string) {
  const supabase = requireLocalSupabase();
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("captain_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load team by email.");
  }

  return data;
}

export async function getActiveQrTokenForResource(resourceType: "team" | "category_match" | "bracket_match", resourceId: string) {
  const supabase = requireLocalSupabase();
  const { data, error } = await supabase
    .from("match_qr_tokens")
    .select("*")
    .eq("resource_type", resourceType)
    .eq("resource_id", resourceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not load QR token for resource.");
  }

  return data;
}
