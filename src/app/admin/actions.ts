"use server";

import { randomBytes, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { setStaffCreationFlash } from "@/lib/flash-state";
import {
  getAdminAccessContext,
  isValidAdminAccessKey,
  requireAdminSession,
  requireStaffSession,
  requireSuperadminSession,
  setLegacyAdminSession,
  setPinSession,
  signOutStaffSession,
} from "@/lib/admin-auth";
import {
  assertPinLoginAllowed,
  clearFailedPinAttempts,
  clearRateLimitAttempts,
  hashStaffPin,
  assertRateLimitAllowed,
  registerRateLimitAttempt,
  registerFailedPinAttempt,
  verifyStaffPin,
} from "@/lib/staff-auth";
import { sanitizeRelativePath } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildFinalStagePlan,
  buildInitialMetaFromPlan,
  buildInitialOperationalPlan,
  getDefaultOperationalSettings,
} from "@/lib/operational-scheduling";
import { sendPushToStaff } from "@/lib/push-notify";
import { validateCompletedScore } from "@/lib/sport-rules";
import {
  getAdminScoreboardData,
  getOperationalMatchById,
  getTeamByRegistrationCode,
} from "@/lib/supabase/queries";
import type {
  CategoryScheduleRunRow,
  GroupLabel,
  MatchScope,
  ScoreboardCategory,
  StaffProfileRow,
  StaffRole,
  TeamCheckinRow,
} from "@/lib/types";

const loginSchema = z.object({
  accessKey: z.string().trim().min(6),
});

const scoringRuleSchema = z.object({
  categoryId: z.uuid(),
  pointsWin: z.coerce.number().int().min(0).max(20),
  pointsDraw: z.coerce.number().int().min(0).max(20),
  pointsLoss: z.coerce.number().int().min(0).max(20),
});

const createMatchSchema = z.object({
  categoryId: z.uuid(),
  homeTeamId: z.uuid(),
  awayTeamId: z.uuid(),
  roundLabel: z.string().trim().max(80).optional().or(z.literal("")),
  matchOrder: z.coerce.number().int().min(0).max(999).default(0),
  scheduledAt: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
});

const updateCategoryMatchSchema = z.object({
  matchId: z.uuid(),
  categoryId: z.uuid(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  homeScore: z.string().trim().optional().or(z.literal("")),
  awayScore: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const adjustmentSchema = z.object({
  categoryId: z.uuid(),
  teamId: z.uuid(),
  pointsDelta: z.coerce.number().int().min(-20).max(20),
  note: z.string().trim().min(3).max(240),
});

const bracketSchema = z.object({
  categoryId: z.uuid(),
  qualifiedTeamCount: z.coerce.number().int().refine((value) => [2, 4, 8, 16, 32].includes(value)),
  bracketName: z.string().trim().min(3).max(120),
});

const operationalSettingsSchema = z.object({
  categoryId: z.uuid(),
  matchMinutes: z.coerce.number().int().min(5).max(120),
  turnoverMinutes: z.coerce.number().int().min(0).max(60),
  venueCount: z.coerce.number().int().min(1).max(8),
  windowStart: z.string().trim().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  windowEnd: z.string().trim().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
});

const generateOperationalScheduleSchema = z.object({
  categoryId: z.uuid(),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const generateFinalStageSchema = z.object({
  categoryId: z.uuid(),
  runId: z.uuid().optional().or(z.literal("")),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const generateThirdPlaceSchema = z.object({
  categoryId: z.uuid(),
  bracketId: z.uuid(),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const updateBracketMatchSchema = z.object({
  bracketId: z.uuid(),
  categoryId: z.uuid(),
  matchId: z.uuid(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  homeScore: z.string().trim().optional().or(z.literal("")),
  awayScore: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "referee", "assistant"]),
});

const pinLoginSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
});

const assignStaffSchema = z.object({
  tournamentId: z.uuid(),
  categoryId: z.uuid().optional().or(z.literal("")),
  duty: z.enum(["referee", "assistant"]),
  scope: z.enum(["category_match", "bracket_match"]),
  matchId: z.uuid(),
  staffUserId: z.string().trim().optional().or(z.literal("")),
});

const assignCategoryStaffSchema = z.object({
  tournamentId: z.uuid(),
  categoryId: z.uuid(),
  duty: z.enum(["referee", "assistant"]),
  staffUserId: z.string().trim().optional().or(z.literal("")),
});

const qrSchema = z.object({
  resourceType: z.enum(["category_match", "bracket_match", "team"]),
  resourceId: z.uuid(),
  categoryId: z.uuid().optional().or(z.literal("")),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const checkinSchema = z.object({
  scope: z.enum(["category_match", "bracket_match"]),
  matchId: z.uuid(),
  teamId: z.uuid(),
  status: z.enum(["pendiente", "presentado", "incidencia", "no_presentado"]),
  incidentLabel: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const teamLookupSchema = z.object({
  registrationCode: z.string().trim().min(3).max(32),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

const legacyAdminRateLimit = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockWindowMs: 15 * 60 * 1000,
} as const;

function buildSeedOrder(size: number): number[] {
  if (size === 2) {
    return [1, 2];
  }

  const previous = buildSeedOrder(size / 2);
  return previous.flatMap((seed) => [seed, size + 1 - seed]);
}

function parseScore(value: string | undefined) {
  if (!value || !value.length) {
    return null;
  }

  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

function toNullable(value: string | undefined) {
  return value && value.length ? value : null;
}

function safeRedirect(pathname: string | undefined, fallback: string) {
  return sanitizeRelativePath(pathname, fallback);
}

function normalizeTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function getEventDate(startDate: string) {
  return startDate.slice(0, 10);
}

function isManagedOperationalMatch(categoryMatch: {
  schedule_run_id: string | null;
}) {
  return Boolean(categoryMatch.schedule_run_id);
}

async function loadAdminCategory(categoryId: string) {
  const adminData = await getAdminScoreboardData();
  const category = adminData.categories.find((entry) => entry.category.id === categoryId) ?? null;

  return {
    adminData,
    category,
  };
}

function getPresentTeams(category: ScoreboardCategory) {
  return category.teams
    .filter((team) => Boolean(team.checked_in_at))
    .sort((left, right) => {
      const leftTime = new Date(left.checked_in_at ?? left.created_at).getTime();
      const rightTime = new Date(right.checked_in_at ?? right.created_at).getTime();

      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.team_name.localeCompare(right.team_name, "es");
    });
}

function getLatestGeneratedRun(category: ScoreboardCategory, stage: "initial" | "final") {
  return category.scheduleRuns.find((run) => run.stage === stage && run.status === "generated") ?? null;
}

function ensureOperationalGenerationAllowed(category: ScoreboardCategory) {
  const hasManagedMatches = category.matches.some((match) => isManagedOperationalMatch(match));
  const hasManagedBracket = Boolean(category.bracket);

  if (hasManagedMatches || hasManagedBracket || category.scheduleRuns.length > 0) {
    throw new Error("La jornada ya fue generada para esta categoría.");
  }
}

function getStandingsByGroupIds(category: ScoreboardCategory): Partial<Record<GroupLabel, string[]>> {
  return Object.fromEntries(
    category.groupStandings.map((group) => [group.groupLabel, group.standings.map((row) => row.team_id)]),
  ) as Partial<Record<GroupLabel, string[]>>;
}

async function insertScheduleRun(input: {
  categoryId: string;
  stage: "initial" | "final";
  formatKey: string;
  formatLabel: string;
  snapshotCutoff: string;
  presentTeamIds: string[];
  minimumMatchesPerTeam: number;
  totalMatchesPlanned: number;
  officialPlacement: boolean;
  capacitySummary: Record<string, unknown>;
  warnings: string[];
  meta: Record<string, unknown>;
  generatedFromRunId?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("category_schedule_runs")
    .insert({
      category_id: input.categoryId,
      stage: input.stage,
      format_key: input.formatKey,
      format_label: input.formatLabel,
      status: "generated",
      snapshot_cutoff: input.snapshotCutoff,
      present_team_ids: input.presentTeamIds,
      minimum_matches_per_team: input.minimumMatchesPerTeam,
      total_matches_planned: input.totalMatchesPlanned,
      official_placement: input.officialPlacement,
      capacity_summary: input.capacitySummary,
      warnings: input.warnings,
      meta: input.meta,
      generated_from_run_id: input.generatedFromRunId ?? null,
    })
    .select("*")
    .single<CategoryScheduleRunRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo registrar la jornada.");
  }

  return data;
}

async function insertManagedCategoryMatches(input: {
  categoryId: string;
  scheduleRunId: string;
  drafts: Array<{
    homeTeamId: string;
    awayTeamId: string;
    phase: "group" | "league" | "placement" | "friendly";
    groupLabel: GroupLabel | null;
    countsForStandings: boolean;
    roundLabel: string | null;
    matchOrder: number;
    scheduledAt: string | null;
    location: string | null;
    notes: string | null;
  }>;
}) {
  if (!input.drafts.length) {
    return;
  }

  const payload = input.drafts.map((draft) => ({
    category_id: input.categoryId,
    home_team_id: draft.homeTeamId,
    away_team_id: draft.awayTeamId,
    phase: draft.phase,
    group_label: draft.groupLabel,
    counts_for_standings: draft.countsForStandings,
    schedule_run_id: input.scheduleRunId,
    round_label: draft.roundLabel,
    match_order: draft.matchOrder,
    scheduled_at: draft.scheduledAt,
    location: draft.location,
    notes: draft.notes,
    status: "scheduled" as const,
  }));

  const { error } = await supabaseAdmin.from("category_matches").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

function getRoundName(roundNumber: number, roundCount: number, thirdPlaceLabel: string | null) {
  const effectiveRoundCount = thirdPlaceLabel && roundCount >= 2 ? roundCount : roundCount;

  if (roundNumber === effectiveRoundCount) {
    return "Final";
  }

  if (roundNumber === effectiveRoundCount - 1) {
    return "Semifinal";
  }

  if (roundNumber === effectiveRoundCount - 2) {
    return "Cuartos";
  }

  return `Ronda ${roundNumber}`;
}

async function createBracketStructure(input: {
  categoryId: string;
  bracketName: string;
  qualifiedTeamCount: number;
  seededTeamIds: Array<string | null>;
}) {
  const roundCount = Math.log2(input.qualifiedTeamCount);

  const { data: bracket, error: bracketError } = await supabaseAdmin
    .from("category_brackets")
    .insert({
      category_id: input.categoryId,
      name: input.bracketName,
      qualified_team_count: input.qualifiedTeamCount,
      format: "single_elimination",
      status: "active",
    })
    .select("*")
    .single<{ id: string }>();

  if (bracketError || !bracket) {
    throw new Error(bracketError?.message ?? "No se pudo crear el cuadro.");
  }

  const roundsToInsert = Array.from({ length: roundCount }, (_, index) => ({
    bracket_id: bracket.id,
    round_number: index + 1,
    name: getRoundName(index + 1, roundCount, null),
  }));

  const { data: roundRows, error: roundsError } = await supabaseAdmin
    .from("bracket_rounds")
    .insert(roundsToInsert)
    .select("*");

  if (roundsError || !roundRows) {
    throw new Error(roundsError?.message ?? "No se pudieron crear las rondas.");
  }

  const roundsByNumber = new Map(roundRows.map((round) => [round.round_number, round.id]));
  const previousRoundMatchIds = new Map<number, string[]>();

  for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
    const matchCount = input.qualifiedTeamCount / 2 ** roundNumber;
    const matchesToInsert = Array.from({ length: matchCount }, (_, index) => {
      if (roundNumber === 1) {
        const homeTeamId = input.seededTeamIds[index * 2] ?? null;
        const awayTeamId = input.seededTeamIds[index * 2 + 1] ?? null;
        const isBye = Boolean(homeTeamId) !== Boolean(awayTeamId);

        return {
          bracket_id: bracket.id,
          round_id: roundsByNumber.get(roundNumber)!,
          round_number: roundNumber,
          match_number: index + 1,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          status: isBye ? ("completed" as const) : ("scheduled" as const),
        };
      }

      const sourceMatches = previousRoundMatchIds.get(roundNumber - 1) ?? [];

      return {
        bracket_id: bracket.id,
        round_id: roundsByNumber.get(roundNumber)!,
        round_number: roundNumber,
        match_number: index + 1,
        home_source_match_id: sourceMatches[index * 2] ?? null,
        away_source_match_id: sourceMatches[index * 2 + 1] ?? null,
        status: "scheduled" as const,
      };
    });

    const { data: insertedMatches, error: matchesError } = await supabaseAdmin
      .from("bracket_matches")
      .insert(matchesToInsert)
      .select("id, round_number, match_number");

    if (matchesError || !insertedMatches) {
      throw new Error(matchesError?.message ?? "No se pudieron crear los cruces.");
    }

    previousRoundMatchIds.set(
      roundNumber,
      insertedMatches
        .sort((left, right) => left.match_number - right.match_number)
        .map((match) => match.id),
    );
  }

  return bracket.id;
}

function getBracketLosersForThirdPlace(category: ScoreboardCategory, bracketId: string) {
  const rounds = category.bracket?.bracket.id === bracketId ? category.bracket.rounds : [];
  const semifinalRound = rounds.find((round) => round.round.round_number === 1);

  if (!semifinalRound || semifinalRound.matches.length !== 2) {
    return null;
  }

  const losers = semifinalRound.matches.map((match) => {
    if (match.status !== "completed" || !match.home_team || !match.away_team || !match.winner_team) {
      return null;
    }

    return match.home_team.id === match.winner_team.id ? match.away_team : match.home_team;
  });

  if (losers.some((entry) => !entry)) {
    return null;
  }

  return losers as [NonNullable<(typeof semifinalRound.matches)[number]["home_team"]>, NonNullable<(typeof semifinalRound.matches)[number]["home_team"]>];
}

function notifyStaffOfResultUpdate(
  scope: MatchScope,
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
) {
  void (async () => {
    try {
      const matchTable = scope === "category_match" ? "category_matches" : "bracket_matches";
      const matchIdColumn = scope === "category_match" ? "category_match_id" : "bracket_match_id";

      const { data: matchRow } = await supabaseAdmin
        .from(matchTable)
        .select("id, home_team_id, away_team_id")
        .eq("id", matchId)
        .maybeSingle<{ id: string; home_team_id: string | null; away_team_id: string | null }>();

      const teamIds = [matchRow?.home_team_id, matchRow?.away_team_id].filter(Boolean) as string[];
      const { data: teams } = await supabaseAdmin
        .from("teams")
        .select("id, team_name")
        .in("id", teamIds);

      const homeTeamName = teams?.find((t) => t.id === matchRow?.home_team_id)?.team_name ?? "Pendiente";
      const awayTeamName = teams?.find((t) => t.id === matchRow?.away_team_id)?.team_name ?? "Pendiente";

      const { data: assignments } = await supabaseAdmin
        .from("staff_assignments")
        .select("staff_user_id")
        .eq(matchIdColumn, matchId);

      if (!assignments || assignments.length === 0) return;

      const scoreText =
        homeScore !== null && awayScore !== null
          ? `${homeTeamName} ${homeScore}-${awayScore} ${awayTeamName}`
          : `${homeTeamName} vs ${awayTeamName}`;

      const uniqueStaffIds = [...new Set(assignments.map((a) => a.staff_user_id))];

      await Promise.allSettled(
        uniqueStaffIds.map((staffUserId) =>
          sendPushToStaff(staffUserId, {
            title: "Resultado actualizado",
            body: `Resultado actualizado: ${scoreText}`,
            url: `/app/partido/${matchId}?scope=${scope}`,
          }),
        ),
      );
    } catch (pushError) {
      console.error("[push] Error notifying staff of result update:", pushError);
    }
  })();
}

function revalidateTournamentSurface(categoryId?: string, redirectTo?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/admin");
  revalidatePath("/app/partidos");
  revalidatePath("/login");

  if (categoryId) {
    revalidatePath(`/clasificacion/${categoryId}`);
    revalidatePath(`/cuadro/${categoryId}`);
  }

  if (redirectTo?.startsWith("/")) {
    revalidatePath(redirectTo);
  }
}

function createQrToken() {
  return randomBytes(18).toString("base64url");
}

async function insertMatchAudit(input: {
  scope: MatchScope;
  matchId: string;
  actorUserId: string | null;
  actorRole: StaffRole | null;
  previousStatus: string | null;
  newStatus: string | null;
  previousHomeScore: number | null;
  previousAwayScore: number | null;
  newHomeScore: number | null;
  newAwayScore: number | null;
  notes?: string | null;
}) {
  await supabaseAdmin.from("match_result_audit").insert({
    match_scope: input.scope,
    match_id: input.matchId,
    actor_user_id: input.actorUserId,
    actor_role: input.actorRole,
    previous_status: input.previousStatus,
    new_status: input.newStatus,
    previous_home_score: input.previousHomeScore,
    previous_away_score: input.previousAwayScore,
    new_home_score: input.newHomeScore,
    new_away_score: input.newAwayScore,
    notes: input.notes ?? null,
  });
}

async function persistCategoryMatchUpdate(input: {
  matchId: string;
  categoryId: string;
  status: "scheduled" | "completed" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
  notes: string | null;
  scheduledAt: string | null;
  location: string | null;
  actorUserId: string | null;
  actorRole: StaffRole | null;
}) {
  const { data: previousMatch } = await supabaseAdmin
    .from("category_matches")
    .select("*")
    .eq("id", input.matchId)
    .maybeSingle<{
      status: string | null;
      home_score: number | null;
      away_score: number | null;
    }>();

  const { error } = await supabaseAdmin
    .from("category_matches")
    .update({
      status: input.status,
      home_score: input.homeScore,
      away_score: input.awayScore,
      notes: input.notes,
      scheduled_at: input.scheduledAt,
      location: input.location,
    })
    .eq("id", input.matchId);

  if (error) {
    return error.message;
  }

  await insertMatchAudit({
    scope: "category_match",
    matchId: input.matchId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    previousStatus: previousMatch?.status ?? null,
    newStatus: input.status,
    previousHomeScore: previousMatch?.home_score ?? null,
    previousAwayScore: previousMatch?.away_score ?? null,
    newHomeScore: input.homeScore,
    newAwayScore: input.awayScore,
    notes: input.notes,
  });

  notifyStaffOfResultUpdate("category_match", input.matchId, input.homeScore, input.awayScore);

  revalidateTournamentSurface(input.categoryId);
  return null;
}

async function persistBracketMatchUpdate(input: {
  matchId: string;
  categoryId: string;
  status: "scheduled" | "completed" | "cancelled";
  homeScore: number | null;
  awayScore: number | null;
  notes: string | null;
  scheduledAt: string | null;
  location: string | null;
  actorUserId: string | null;
  actorRole: StaffRole | null;
}) {
  const { data: previousMatch } = await supabaseAdmin
    .from("bracket_matches")
    .select("*")
    .eq("id", input.matchId)
    .maybeSingle<{
      status: string | null;
      home_score: number | null;
      away_score: number | null;
    }>();

  const { error } = await supabaseAdmin
    .from("bracket_matches")
    .update({
      status: input.status,
      home_score: input.homeScore,
      away_score: input.awayScore,
      notes: input.notes,
      scheduled_at: input.scheduledAt,
      location: input.location,
    })
    .eq("id", input.matchId);

  if (error) {
    return error.message;
  }

  await insertMatchAudit({
    scope: "bracket_match",
    matchId: input.matchId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    previousStatus: previousMatch?.status ?? null,
    newStatus: input.status,
    previousHomeScore: previousMatch?.home_score ?? null,
    previousAwayScore: previousMatch?.away_score ?? null,
    newHomeScore: input.homeScore,
    newAwayScore: input.awayScore,
    notes: input.notes,
  });

  notifyStaffOfResultUpdate("bracket_match", input.matchId, input.homeScore, input.awayScore);

  revalidateTournamentSurface(input.categoryId);
  return null;
}

async function requireOperationalAccess(
  scope: MatchScope,
  matchId: string,
  requiredRole: "result" | "checkin",
) {
  const staff = await requireStaffSession();
  const detail = await getOperationalMatchById(staff, { matchId, scope });

  if (!detail) {
    redirect("/app?error=restricted");
  }

  if (requiredRole === "result" && !detail.canSubmitResult) {
    redirect("/app?error=restricted");
  }

  if (requiredRole === "checkin" && !detail.canCheckIn) {
    redirect("/app?error=restricted");
  }

  return { staff, detail };
}

export async function loginAdminAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    accessKey: formData.get("accessKey"),
  });

  const throttle = await assertRateLimitAllowed(
    "legacy-admin-login",
    legacyAdminRateLimit,
  );

  if (!throttle.allowed) {
    redirect("/login?error=legacy-locked");
  }

  if (!parsed.success || !isValidAdminAccessKey(parsed.data.accessKey)) {
    await registerRateLimitAttempt(throttle.attemptKey, legacyAdminRateLimit);
    redirect("/login?error=legacy");
  }

  await clearRateLimitAttempts(throttle.attemptKey);
  await setLegacyAdminSession();
  redirect("/app/admin");
}

export async function loginWithPinAction(formData: FormData) {
  const parsed = pinLoginSchema.safeParse({
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    redirect("/login?error=pin");
  }

  const throttle = await assertPinLoginAllowed();

  if (!throttle.allowed) {
    redirect("/login?error=pin-locked");
  }

  const pinHash = hashStaffPin(parsed.data.pin);

  const { data: profile } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .or(`pin_hash.eq.${pinHash},pin.eq.${parsed.data.pin}`)
    .eq("is_active", true)
    .maybeSingle<StaffProfileRow>();

  if (!profile || !verifyStaffPin(profile, parsed.data.pin)) {
    await registerFailedPinAttempt(throttle.attemptKey);
    redirect("/login?error=pin");
  }

  await clearFailedPinAttempts(throttle.attemptKey);

  if (!profile.pin_hash) {
    await supabaseAdmin
      .from("staff_profiles")
      .update({
        pin: null,
        pin_hash: pinHash,
        pin_last_four: parsed.data.pin.slice(-4),
        last_login_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  } else {
    await supabaseAdmin
      .from("staff_profiles")
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  await setPinSession(profile.id);

  if (profile.role === "admin" || profile.role === "superadmin") {
    redirect("/app/admin");
  }

  redirect("/app");
}

export async function logoutAdminAction() {
  await signOutStaffSession();
  redirect("/login?logout=1");
}

export async function saveScoringRuleAction(formData: FormData) {
  await requireAdminSession();

  const parsed = scoringRuleSchema.safeParse({
    categoryId: formData.get("categoryId"),
    pointsWin: formData.get("pointsWin"),
    pointsDraw: formData.get("pointsDraw"),
    pointsLoss: formData.get("pointsLoss"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=regla");
  }

  await supabaseAdmin.from("category_scoring_rules").upsert({
    category_id: parsed.data.categoryId,
    points_win: parsed.data.pointsWin,
    points_draw: parsed.data.pointsDraw,
    points_loss: parsed.data.pointsLoss,
  });

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect("/app/admin?saved=regla");
}

export async function createMatchAction(formData: FormData) {
  await requireAdminSession();

  const parsed = createMatchSchema.safeParse({
    categoryId: formData.get("categoryId"),
    homeTeamId: formData.get("homeTeamId"),
    awayTeamId: formData.get("awayTeamId"),
    roundLabel: formData.get("roundLabel"),
    matchOrder: formData.get("matchOrder"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
  });

  if (!parsed.success || parsed.data.homeTeamId === parsed.data.awayTeamId) {
    redirect("/app/admin?error=partido");
  }

  const { error } = await supabaseAdmin.from("category_matches").insert({
    category_id: parsed.data.categoryId,
    home_team_id: parsed.data.homeTeamId,
    away_team_id: parsed.data.awayTeamId,
    round_label: toNullable(parsed.data.roundLabel),
    match_order: parsed.data.matchOrder,
    scheduled_at: toNullable(parsed.data.scheduledAt),
    location: toNullable(parsed.data.location),
    status: "scheduled",
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect("/app/admin?saved=partido");
}

export async function updateMatchAction(formData: FormData) {
  const access = await requireAdminSession();

  const parsed = updateCategoryMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    categoryId: formData.get("categoryId"),
    status: formData.get("status"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    notes: formData.get("notes"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=resultado");
  }

  const homeScore = parseScore(parsed.data.homeScore);
  const awayScore = parseScore(parsed.data.awayScore);

  if (
    parsed.data.status === "completed" &&
    (homeScore === null || awayScore === null)
  ) {
    redirect("/app/admin?error=marcador");
  }

  if (parsed.data.status === "completed") {
    const { category } = await loadAdminCategory(parsed.data.categoryId);

    if (!category) {
      redirect("/app/admin?error=categoria");
    }

    const validationError = validateCompletedScore({
      sport: category.category.sport,
      homeScore,
      awayScore,
    });

    if (validationError) {
      redirect(`/app/admin?error=${encodeURIComponent(validationError)}`);
    }
  }

  const error = await persistCategoryMatchUpdate({
    matchId: parsed.data.matchId,
    categoryId: parsed.data.categoryId,
    status: parsed.data.status,
    homeScore,
    awayScore,
    notes: toNullable(parsed.data.notes),
    scheduledAt: toNullable(parsed.data.scheduledAt),
    location: toNullable(parsed.data.location),
    actorUserId: access.authUserId,
    actorRole: access.role,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error)}`);
  }

  redirect(safeRedirect(parsed.data.redirectTo, "/app/admin?saved=resultado"));
}

export async function addAdjustmentAction(formData: FormData) {
  await requireAdminSession();

  const parsed = adjustmentSchema.safeParse({
    categoryId: formData.get("categoryId"),
    teamId: formData.get("teamId"),
    pointsDelta: formData.get("pointsDelta"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=ajuste");
  }

  const { error } = await supabaseAdmin.from("team_score_adjustments").insert({
    category_id: parsed.data.categoryId,
    team_id: parsed.data.teamId,
    points_delta: parsed.data.pointsDelta,
    note: parsed.data.note,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect("/app/admin?saved=ajuste");
}

export async function generateBracketAction(formData: FormData) {
  await requireAdminSession();

  const parsed = bracketSchema.safeParse({
    categoryId: formData.get("categoryId"),
    qualifiedTeamCount: formData.get("qualifiedTeamCount"),
    bracketName: formData.get("bracketName"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=cuadro");
  }

  const { category } = await loadAdminCategory(parsed.data.categoryId);

  if (!category || category.standings.length < parsed.data.qualifiedTeamCount) {
    redirect("/app/admin?error=clasificados");
  }

  const qualified = category.standings.slice(0, parsed.data.qualifiedTeamCount);
  const seedOrder = buildSeedOrder(parsed.data.qualifiedTeamCount);
  const seededTeamIds = seedOrder.map((seed) => qualified[seed - 1]?.team_id ?? null);

  const { data: existingBracket } = await supabaseAdmin
    .from("category_brackets")
    .select("id")
    .eq("category_id", parsed.data.categoryId)
    .in("status", ["draft", "active"])
    .maybeSingle<{ id: string }>();

  if (existingBracket?.id) {
    await supabaseAdmin.from("category_brackets").delete().eq("id", existingBracket.id);
  }

  try {
    await createBracketStructure({
      categoryId: parsed.data.categoryId,
      bracketName: parsed.data.bracketName,
      qualifiedTeamCount: parsed.data.qualifiedTeamCount,
      seededTeamIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "crear-cuadro";
    redirect(`/app/admin?error=${encodeURIComponent(message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect("/app/admin?saved=cuadro");
}

export async function saveOperationalSettingsAction(formData: FormData) {
  await requireAdminSession();

  const parsed = operationalSettingsSchema.safeParse({
    categoryId: formData.get("categoryId"),
    matchMinutes: formData.get("matchMinutes"),
    turnoverMinutes: formData.get("turnoverMinutes"),
    venueCount: formData.get("venueCount"),
    windowStart: formData.get("windowStart"),
    windowEnd: formData.get("windowEnd"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=ajustes-jornada");
  }

  const { error } = await supabaseAdmin.from("category_operational_settings").upsert({
    category_id: parsed.data.categoryId,
    match_minutes: parsed.data.matchMinutes,
    turnover_minutes: parsed.data.turnoverMinutes,
    venue_count: parsed.data.venueCount,
    window_start: normalizeTimeValue(parsed.data.windowStart),
    window_end: normalizeTimeValue(parsed.data.windowEnd),
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect("/app/admin?saved=ajustes-jornada");
}

export async function generateOperationalScheduleAction(formData: FormData) {
  await requireAdminSession();

  const parsed = generateOperationalScheduleSchema.safeParse({
    categoryId: formData.get("categoryId"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=jornada");
  }

  try {
    const { adminData, category } = await loadAdminCategory(parsed.data.categoryId);

    if (!category) {
      throw new Error("Categoría no encontrada.");
    }

    ensureOperationalGenerationAllowed(category);

    const presentTeams = getPresentTeams(category);

    if (presentTeams.length < 4) {
      throw new Error("Necesitas al menos 4 equipos presentes para generar la jornada.");
    }

    const settings = category.operationalSettings ?? getDefaultOperationalSettings(category.category);
    const snapshotCutoff = new Date().toISOString();
    const plan = buildInitialOperationalPlan({
      category: category.category,
      eventDate: getEventDate(adminData.tournament.start_date),
      presentTeams,
      settings,
    });

    const scheduleRun = await insertScheduleRun({
      categoryId: category.category.id,
      stage: "initial",
      formatKey: plan.formatKey,
      formatLabel: plan.formatLabel,
      snapshotCutoff,
      presentTeamIds: presentTeams.map((team) => team.id),
      minimumMatchesPerTeam: plan.minimumMatchesPerTeam,
      totalMatchesPlanned: plan.totalMatchesPlanned,
      officialPlacement: plan.officialPlacement,
      capacitySummary: plan.capacity,
      warnings: plan.warnings,
      meta: buildInitialMetaFromPlan(plan),
    });

    if (plan.generatedMatches.length > 0) {
      await insertManagedCategoryMatches({
        categoryId: category.category.id,
        scheduleRunId: scheduleRun.id,
        drafts: plan.generatedMatches,
      });
    }

    if (plan.bracketPlan) {
      await createBracketStructure({
        categoryId: category.category.id,
        bracketName: plan.bracketPlan.name,
        qualifiedTeamCount: plan.bracketPlan.qualifiedTeamCount,
        seededTeamIds: plan.bracketPlan.seededTeamIds,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "jornada";
    redirect(`/app/admin?error=${encodeURIComponent(message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId, parsed.data.redirectTo);
  redirect(safeRedirect(parsed.data.redirectTo, "/app/admin?saved=jornada"));
}

export async function generateOperationalFinalStageAction(formData: FormData) {
  await requireAdminSession();

  const parsed = generateFinalStageSchema.safeParse({
    categoryId: formData.get("categoryId"),
    runId: formData.get("runId"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=fase-final");
  }

  try {
    const { adminData, category } = await loadAdminCategory(parsed.data.categoryId);

    if (!category) {
      throw new Error("Categoría no encontrada.");
    }

    const initialRun =
      (parsed.data.runId ? category.scheduleRuns.find((run) => run.id === parsed.data.runId) : null) ??
      getLatestGeneratedRun(category, "initial");

    if (!initialRun) {
      throw new Error("No hay una fase inicial generada.");
    }

    if (getLatestGeneratedRun(category, "final")) {
      throw new Error("La fase final ya fue generada.");
    }

    const pendingInitialMatches = category.matches.filter(
      (match) =>
        match.schedule_run_id === initialRun.id &&
        match.counts_for_standings &&
        match.status !== "completed",
    );

    if (pendingInitialMatches.length > 0) {
      throw new Error("Completa primero todos los partidos de la fase inicial.");
    }

    const settings = category.operationalSettings ?? getDefaultOperationalSettings(category.category);
    const plan = buildFinalStagePlan({
      category: category.category,
      eventDate: getEventDate(adminData.tournament.start_date),
      settings,
      teams: category.teams,
      standingsByGroup: getStandingsByGroupIds(category),
      overallStandings: category.standings.map((row) => row.team_id),
      previousRun: initialRun,
    });

    const finalRun = await insertScheduleRun({
      categoryId: category.category.id,
      stage: "final",
      formatKey: plan.formatKey,
      formatLabel: `${plan.formatLabel} · Fase final`,
      snapshotCutoff: new Date().toISOString(),
      presentTeamIds: initialRun.present_team_ids,
      minimumMatchesPerTeam: plan.minimumMatchesPerTeam,
      totalMatchesPlanned: plan.totalMatchesPlanned,
      officialPlacement: plan.officialPlacement,
      capacitySummary: plan.capacity,
      warnings: plan.warnings,
      meta: buildInitialMetaFromPlan(plan),
      generatedFromRunId: initialRun.id,
    });

    if (plan.generatedMatches.length > 0) {
      await insertManagedCategoryMatches({
        categoryId: category.category.id,
        scheduleRunId: finalRun.id,
        drafts: plan.generatedMatches,
      });
    }

    if (plan.bracketPlan) {
      await createBracketStructure({
        categoryId: category.category.id,
        bracketName: plan.bracketPlan.name,
        qualifiedTeamCount: plan.bracketPlan.qualifiedTeamCount,
        seededTeamIds: plan.bracketPlan.seededTeamIds,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "fase-final";
    redirect(`/app/admin?error=${encodeURIComponent(message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId, parsed.data.redirectTo);
  redirect(safeRedirect(parsed.data.redirectTo, "/app/admin?saved=fase-final"));
}

export async function generateThirdPlaceMatchAction(formData: FormData) {
  await requireAdminSession();

  const parsed = generateThirdPlaceSchema.safeParse({
    categoryId: formData.get("categoryId"),
    bracketId: formData.get("bracketId"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=tercer-puesto");
  }

  try {
    const { category } = await loadAdminCategory(parsed.data.categoryId);

    if (!category || !category.bracket || category.bracket.bracket.id !== parsed.data.bracketId) {
      throw new Error("No se encontró el cuadro activo.");
    }

    const existingThirdPlace = category.matches.find(
      (match) => match.phase === "placement" && match.round_label === "3º/4º",
    );

    if (existingThirdPlace) {
      throw new Error("El partido por el tercer puesto ya existe.");
    }

    const losers = getBracketLosersForThirdPlace(category, parsed.data.bracketId);

    if (!losers) {
      throw new Error("Las semifinales deben estar completadas para generar el 3º/4º.");
    }

    const latestFinalRun = getLatestGeneratedRun(category, "final");

    if (!latestFinalRun) {
      throw new Error("Falta la fase final generada.");
    }

    await insertManagedCategoryMatches({
      categoryId: category.category.id,
      scheduleRunId: latestFinalRun.id,
      drafts: [
        {
          homeTeamId: losers[0].id,
          awayTeamId: losers[1].id,
          phase: "placement",
          groupLabel: null,
          countsForStandings: false,
          roundLabel: "3º/4º",
          matchOrder: category.matches.length + 1,
          scheduledAt: null,
          location: null,
          notes: "Generado desde semifinales",
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "tercer-puesto";
    redirect(`/app/admin?error=${encodeURIComponent(message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId, parsed.data.redirectTo);
  redirect(safeRedirect(parsed.data.redirectTo, "/app/admin?saved=tercer-puesto"));
}

export async function updateBracketMatchAction(formData: FormData) {
  const access = await requireAdminSession();

  const parsed = updateBracketMatchSchema.safeParse({
    bracketId: formData.get("bracketId"),
    categoryId: formData.get("categoryId"),
    matchId: formData.get("matchId"),
    status: formData.get("status"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    notes: formData.get("notes"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=resultado-cuadro");
  }

  const homeScore = parseScore(parsed.data.homeScore);
  const awayScore = parseScore(parsed.data.awayScore);

  if (
    parsed.data.status === "completed" &&
    (homeScore === null || awayScore === null)
  ) {
    redirect("/app/admin?error=marcador-cuadro");
  }

  if (parsed.data.status === "completed") {
    const { category } = await loadAdminCategory(parsed.data.categoryId);

    if (!category) {
      redirect("/app/admin?error=categoria");
    }

    const validationError = validateCompletedScore({
      sport: category.category.sport,
      homeScore,
      awayScore,
    });

    if (validationError) {
      redirect(`/app/admin?error=${encodeURIComponent(validationError)}`);
    }
  }

  const error = await persistBracketMatchUpdate({
    matchId: parsed.data.matchId,
    categoryId: parsed.data.categoryId,
    status: parsed.data.status,
    homeScore,
    awayScore,
    notes: toNullable(parsed.data.notes),
    scheduledAt: toNullable(parsed.data.scheduledAt),
    location: toNullable(parsed.data.location),
    actorUserId: access.authUserId,
    actorRole: access.role,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error)}`);
  }

  redirect(safeRedirect(parsed.data.redirectTo, "/app/admin?saved=resultado-cuadro"));
}

function generatePin(): string {
  const bytes = randomBytes(4);
  const num = (bytes.readUInt32BE(0) % 900000) + 100000;
  return String(num);
}

export async function createStaffAction(formData: FormData) {
  await requireSuperadminSession();

  const parsed = createStaffSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=staff");
  }

  const pin = generatePin();
  const pinHash = hashStaffPin(pin);

  const { data: collision } = await supabaseAdmin
    .from("staff_profiles")
    .select("id")
    .eq("pin_hash", pinHash)
    .eq("is_active", true)
    .maybeSingle();

  if (collision) {
    redirect("/app/admin?error=pin-retry");
  }

  const staffId = randomUUID();
  const email = `staff-${staffId.slice(0, 8)}@torneo.local`;
  const password = randomBytes(24).toString("base64url");
  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    },
  });

  if (authUserError || !authUserData.user) {
    redirect(`/app/admin?error=${encodeURIComponent(authUserError?.message ?? "No se pudo crear la cuenta de staff.")}`);
  }

  const { error } = await supabaseAdmin.from("staff_profiles").insert({
    id: staffId,
    auth_user_id: authUserData.user.id,
    email,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    pin: null,
    pin_hash: pinHash,
    pin_last_four: pin.slice(-4),
    is_active: true,
  });

  if (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUserData.user.id);
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  await setStaffCreationFlash({
    pin,
    staffName: parsed.data.fullName,
  });
  revalidateTournamentSurface();
  redirect("/app/admin?saved=staff");
}

export async function assignStaffToMatchAction(formData: FormData) {
  await requireSuperadminSession();

  const parsed = assignStaffSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    duty: formData.get("duty"),
    scope: formData.get("scope"),
    matchId: formData.get("matchId"),
    staffUserId: formData.get("staffUserId"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=asignacion");
  }

  if (parsed.data.scope === "category_match") {
    await supabaseAdmin
      .from("staff_assignments")
      .delete()
      .eq("category_match_id", parsed.data.matchId)
      .eq("duty", parsed.data.duty);
  } else {
    await supabaseAdmin
      .from("staff_assignments")
      .delete()
      .eq("bracket_match_id", parsed.data.matchId)
      .eq("duty", parsed.data.duty);
  }

  if (parsed.data.staffUserId) {
    const payload =
      parsed.data.scope === "category_match"
        ? {
            staff_user_id: parsed.data.staffUserId,
            tournament_id: parsed.data.tournamentId,
            duty: parsed.data.duty,
            category_id: parsed.data.categoryId || null,
            category_match_id: parsed.data.matchId,
            bracket_match_id: null,
          }
        : {
            staff_user_id: parsed.data.staffUserId,
            tournament_id: parsed.data.tournamentId,
            duty: parsed.data.duty,
            category_id: parsed.data.categoryId || null,
            category_match_id: null,
            bracket_match_id: parsed.data.matchId,
          };

    const { error } = await supabaseAdmin.from("staff_assignments").insert(payload);

    if (error) {
      redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
    }

    // Fire-and-forget push notification to assigned staff
    const matchTable = parsed.data.scope === "category_match" ? "category_matches" : "bracket_matches";
    void (async () => {
      try {
        const { data: matchRow } = await supabaseAdmin
          .from(matchTable)
          .select("id, home_team_id, away_team_id")
          .eq("id", parsed.data.matchId)
          .maybeSingle<{ id: string; home_team_id: string | null; away_team_id: string | null }>();

        const teamIds = [matchRow?.home_team_id, matchRow?.away_team_id].filter(Boolean) as string[];
        const { data: teams } = await supabaseAdmin
          .from("teams")
          .select("id, team_name")
          .in("id", teamIds);

        const homeTeamName = teams?.find((t) => t.id === matchRow?.home_team_id)?.team_name ?? "Pendiente";
        const awayTeamName = teams?.find((t) => t.id === matchRow?.away_team_id)?.team_name ?? "Pendiente";
        const dutyLabel = parsed.data.duty === "referee" ? "arbitro" : "asistente";

        await sendPushToStaff(parsed.data.staffUserId!, {
          title: "Nueva asignacion",
          body: `Te han asignado como ${dutyLabel} en ${homeTeamName} vs ${awayTeamName}`,
          url: `/app/partido/${parsed.data.matchId}?scope=${parsed.data.scope}`,
        });
      } catch (pushError) {
        console.error("[push] Error in assignStaffToMatchAction:", pushError);
      }
    })();
  }

  revalidateTournamentSurface(parsed.data.categoryId || undefined);
  redirect("/app/admin?saved=asignacion");
}

export async function assignStaffToCategoryAction(formData: FormData) {
  await requireSuperadminSession();

  const parsed = assignCategoryStaffSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    categoryId: formData.get("categoryId"),
    duty: formData.get("duty"),
    staffUserId: formData.get("staffUserId"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=asignacion");
  }

  await supabaseAdmin
    .from("staff_assignments")
    .delete()
    .eq("category_id", parsed.data.categoryId)
    .eq("duty", parsed.data.duty)
    .is("category_match_id", null)
    .is("bracket_match_id", null);

  if (parsed.data.staffUserId) {
    const { error } = await supabaseAdmin.from("staff_assignments").insert({
      staff_user_id: parsed.data.staffUserId,
      tournament_id: parsed.data.tournamentId,
      duty: parsed.data.duty,
      category_id: parsed.data.categoryId,
      category_match_id: null,
      bracket_match_id: null,
    });

    if (error) {
      redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect("/app/admin?saved=asignacion");
}

export async function generateQrForResourceAction(formData: FormData) {
  const access = await getAdminAccessContext();

  if (!access || (access.role !== "admin" && access.role !== "superadmin")) {
    redirect("/login?error=restricted");
  }

  const parsed = qrSchema.safeParse({
    resourceType: formData.get("resourceType"),
    resourceId: formData.get("resourceId"),
    categoryId: formData.get("categoryId"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app/admin?error=qr");
  }

  await supabaseAdmin
    .from("match_qr_tokens")
    .update({
      is_active: false,
    })
    .eq("resource_type", parsed.data.resourceType)
    .eq("resource_id", parsed.data.resourceId)
    .eq("is_active", true);

  const { error } = await supabaseAdmin.from("match_qr_tokens").insert({
    token: createQrToken(),
    resource_type: parsed.data.resourceType,
    resource_id: parsed.data.resourceId,
    created_by_user_id: access.authUserId,
    is_active: true,
  });

  if (error) {
    redirect(`/app/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId || undefined, parsed.data.redirectTo);
  redirect(safeRedirect(parsed.data.redirectTo, "/app/admin?saved=qr"));
}

export async function saveCheckinAction(formData: FormData) {
  const parsed = checkinSchema.safeParse({
    scope: formData.get("scope"),
    matchId: formData.get("matchId"),
    teamId: formData.get("teamId"),
    status: formData.get("status"),
    incidentLabel: formData.get("incidentLabel"),
    notes: formData.get("notes"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app?error=checkin");
  }

  const { staff, detail } = await requireOperationalAccess(
    parsed.data.scope,
    parsed.data.matchId,
    "checkin",
  );

  const allowedTeamIds = [
    detail.match.home_team?.id ?? null,
    detail.match.away_team?.id ?? null,
  ].filter(Boolean);

  if (!allowedTeamIds.includes(parsed.data.teamId)) {
    redirect("/app?error=checkin");
  }

  const payload = {
    match_scope: parsed.data.scope,
    match_id: parsed.data.matchId,
    team_id: parsed.data.teamId,
    status: parsed.data.status,
    incident_label: toNullable(parsed.data.incidentLabel),
    notes: toNullable(parsed.data.notes),
    checked_in_by_user_id: staff.authUserId,
    checked_in_at: new Date().toISOString(),
  } satisfies Omit<TeamCheckinRow, "id" | "created_at" | "updated_at">;

  const { error } = await supabaseAdmin
    .from("team_checkins")
    .upsert(payload, { onConflict: "match_scope,match_id,team_id" });

  if (error) {
    redirect(`/app?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(detail.category.category.id, parsed.data.redirectTo);
  redirect(safeRedirect(parsed.data.redirectTo, "/app?saved=checkin"));
}

export async function submitMatchResultAction(formData: FormData) {
  const scopeValue = formData.get("scope");
  const matchIdValue = formData.get("matchId");

  if (typeof scopeValue !== "string" || typeof matchIdValue !== "string") {
    redirect("/app?error=resultado");
  }

  const { staff, detail } = await requireOperationalAccess(
    scopeValue as MatchScope,
    matchIdValue,
    "result",
  );

  if (scopeValue === "category_match") {
    const parsed = updateCategoryMatchSchema.safeParse({
      matchId: formData.get("matchId"),
      categoryId: formData.get("categoryId") ?? detail.category.category.id,
      status: formData.get("status"),
      homeScore: formData.get("homeScore"),
      awayScore: formData.get("awayScore"),
      notes: formData.get("notes"),
      scheduledAt: formData.get("scheduledAt"),
      location: formData.get("location"),
      redirectTo: formData.get("redirectTo"),
    });

    if (!parsed.success) {
      redirect("/app?error=resultado");
    }

    const homeScore = parseScore(parsed.data.homeScore);
    const awayScore = parseScore(parsed.data.awayScore);

    if (parsed.data.status === "completed" && (homeScore === null || awayScore === null)) {
      redirect("/app?error=marcador");
    }

    if (parsed.data.status === "completed") {
      const validationError = validateCompletedScore({
        sport: detail.category.category.sport,
        homeScore,
        awayScore,
      });

      if (validationError) {
        redirect(`/app?error=${encodeURIComponent(validationError)}`);
      }
    }

    const error = await persistCategoryMatchUpdate({
      matchId: parsed.data.matchId,
      categoryId: parsed.data.categoryId,
      status: parsed.data.status,
      homeScore,
      awayScore,
      notes: toNullable(parsed.data.notes),
      scheduledAt: toNullable(parsed.data.scheduledAt),
      location: toNullable(parsed.data.location),
      actorUserId: staff.authUserId,
      actorRole: staff.profile.role,
    });

    if (error) {
      redirect(`/app?error=${encodeURIComponent(error)}`);
    }

    redirect(safeRedirect(parsed.data.redirectTo, `/app/partido/${parsed.data.matchId}?scope=category_match`));
  }

  const parsed = updateBracketMatchSchema.safeParse({
    bracketId: formData.get("bracketId"),
    categoryId: formData.get("categoryId") ?? detail.category.category.id,
    matchId: formData.get("matchId"),
    status: formData.get("status"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    notes: formData.get("notes"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app?error=resultado");
  }

  const homeScore = parseScore(parsed.data.homeScore);
  const awayScore = parseScore(parsed.data.awayScore);

  if (parsed.data.status === "completed" && (homeScore === null || awayScore === null)) {
    redirect("/app?error=marcador");
  }

  if (parsed.data.status === "completed") {
    const validationError = validateCompletedScore({
      sport: detail.category.category.sport,
      homeScore,
      awayScore,
    });

    if (validationError) {
      redirect(`/app?error=${encodeURIComponent(validationError)}`);
    }
  }

  const error = await persistBracketMatchUpdate({
    matchId: parsed.data.matchId,
    categoryId: parsed.data.categoryId,
    status: parsed.data.status,
    homeScore,
    awayScore,
    notes: toNullable(parsed.data.notes),
    scheduledAt: toNullable(parsed.data.scheduledAt),
    location: toNullable(parsed.data.location),
    actorUserId: staff.authUserId,
    actorRole: staff.profile.role,
  });

  if (error) {
    redirect(`/app?error=${encodeURIComponent(error)}`);
  }

  redirect(safeRedirect(parsed.data.redirectTo, `/app/partido/${parsed.data.matchId}?scope=bracket_match`));
}

export async function lookupTeamByCodeAction(formData: FormData) {
  await requireStaffSession();

  const parsed = teamLookupSchema.safeParse({
    registrationCode: formData.get("registrationCode"),
    redirectTo: formData.get("redirectTo"),
  });

  const basePath = parsed.success && parsed.data.redirectTo ? parsed.data.redirectTo : "/app/scan";

  if (!parsed.success) {
    redirect(`${basePath}?error=codigo`);
  }

  const team = await getTeamByRegistrationCode(parsed.data.registrationCode);

  if (!team) {
    redirect(`${basePath}?error=no-team`);
  }

  redirect(`/app/equipo/${team.id}`);
}

/* ------------------------------------------------------------------ */
/* Delete actions                                                      */
/* ------------------------------------------------------------------ */

const deleteMatchSchema = z.object({
  matchId: z.uuid(),
  categoryId: z.uuid(),
  redirectTo: z.string().optional(),
});

const deleteAdjustmentSchema = z.object({
  adjustmentId: z.uuid(),
  categoryId: z.uuid(),
  redirectTo: z.string().optional(),
});

const removeStaffSchema = z.object({
  staffId: z.uuid(),
  redirectTo: z.string().optional(),
});

export async function deleteMatchAction(formData: FormData) {
  await requireAdminSession();

  const parsed = deleteMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    categoryId: formData.get("categoryId"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  const basePath = parsed.success && parsed.data.redirectTo ? parsed.data.redirectTo : "/app/admin";

  if (!parsed.success) {
    redirect(`${basePath}?error=borrar-partido`);
  }

  const { error } = await supabaseAdmin
    .from("category_matches")
    .delete()
    .eq("id", parsed.data.matchId);

  if (error) {
    redirect(`${basePath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect(`${basePath}?saved=borrado-partido`);
}

export async function deleteAdjustmentAction(formData: FormData) {
  await requireAdminSession();

  const parsed = deleteAdjustmentSchema.safeParse({
    adjustmentId: formData.get("adjustmentId"),
    categoryId: formData.get("categoryId"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  const basePath = parsed.success && parsed.data.redirectTo ? parsed.data.redirectTo : "/app/admin";

  if (!parsed.success) {
    redirect(`${basePath}?error=borrar-ajuste`);
  }

  const { error } = await supabaseAdmin
    .from("team_score_adjustments")
    .delete()
    .eq("id", parsed.data.adjustmentId);

  if (error) {
    redirect(`${basePath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface(parsed.data.categoryId);
  redirect(`${basePath}?saved=borrado-ajuste`);
}

export async function removeStaffAction(formData: FormData) {
  await requireSuperadminSession();

  const parsed = removeStaffSchema.safeParse({
    staffId: formData.get("staffId"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  const basePath = parsed.success && parsed.data.redirectTo ? parsed.data.redirectTo : "/app/admin";

  if (!parsed.success) {
    redirect(`${basePath}?error=borrar-staff`);
  }

  const { error } = await supabaseAdmin
    .from("staff_profiles")
    .update({ is_active: false })
    .eq("id", parsed.data.staffId);

  if (error) {
    redirect(`${basePath}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface();
  redirect(`${basePath}?saved=borrado-staff`);
}

/* ------------------------------------------------------------------ */
/* Global team check-in (tournament day)                               */
/* ------------------------------------------------------------------ */

const globalCheckinSchema = z.object({
  teamId: z.uuid(),
  redirectTo: z.string().trim().optional().or(z.literal("")),
});

export async function checkInTeamAction(formData: FormData) {
  await requireStaffSession(["admin", "assistant"]);

  const parsed = globalCheckinSchema.safeParse({
    teamId: formData.get("teamId"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect("/app?error=checkin");
  }

  const { error } = await supabaseAdmin
    .from("teams")
    .update({ checked_in_at: new Date().toISOString() })
    .eq("id", parsed.data.teamId);

  if (error) {
    redirect(`/app?error=${encodeURIComponent(error.message)}`);
  }

  revalidateTournamentSurface();
  redirect(safeRedirect(parsed.data.redirectTo, "/app?saved=checkin"));
}
