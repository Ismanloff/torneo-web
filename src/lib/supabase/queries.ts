import { ALLOWED_SPORT_LABELS, isAllowedSport } from "@/lib/allowed-sports";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  AdminArrivalLogEntry,
  AdminMatchCheckinLogEntry,
  BracketMatchRow,
  BracketRoundRow,
  CategoryBracketRow,
  CategoryMatchRow,
  CategoryOperationalSettingsRow,
  CategoryRow,
  CategoryScheduleRunRow,
  ConfirmationRow,
  EnrichedBracketMatch,
  EnrichedCategoryMatch,
  MatchQrTokenRow,
  MatchScope,
  OperationalDashboardData,
  OperationalMatchSummary,
  ScoreboardCategory,
  ScoreboardHomeData,
  ScoringRuleRow,
  SchoolRow,
  StaffAssignmentRow,
  StaffContext,
  StaffProfileRow,
  TeamCheckinRow,
  TeamRow,
  TeamScoreAdjustmentRow,
  TeamStatusRow,
  TournamentRow,
} from "@/lib/types";
import { getDefaultOperationalSettings } from "@/lib/operational-scheduling";
import { buildCategoryStandings, buildGroupedStandings } from "@/lib/standings";
import { isManagementRole } from "@/lib/utils";

function requireTournament(tournament: TournamentRow | null): TournamentRow {
  if (!tournament) {
    throw new Error("No hay un torneo activo configurado.");
  }

  return tournament;
}

function sortBracketRounds(rounds: BracketRoundRow[]) {
  return [...rounds].sort((left, right) => left.round_number - right.round_number);
}

function buildAssignmentMaps(assignments: StaffAssignmentRow[], staffProfiles: StaffProfileRow[]) {
  const staffLookup = new Map(
    staffProfiles
      .filter((profile): profile is StaffProfileRow & { auth_user_id: string } => Boolean(profile.auth_user_id))
      .map((profile) => [profile.auth_user_id, profile]),
  );
  const byCategoryMatchId = new Map<string, Map<string, StaffProfileRow>>();
  const byBracketMatchId = new Map<string, Map<string, StaffProfileRow>>();
  const byCategoryId = new Map<string, Map<string, StaffProfileRow>>();

  for (const assignment of assignments) {
    const profile = staffLookup.get(assignment.staff_user_id);

    if (!profile) {
      continue;
    }

    if (assignment.category_match_id) {
      const current = byCategoryMatchId.get(assignment.category_match_id) ?? new Map();
      current.set(assignment.duty, profile);
      byCategoryMatchId.set(assignment.category_match_id, current);
    }

    if (assignment.bracket_match_id) {
      const current = byBracketMatchId.get(assignment.bracket_match_id) ?? new Map();
      current.set(assignment.duty, profile);
      byBracketMatchId.set(assignment.bracket_match_id, current);
    }

    if (
      assignment.category_id &&
      !assignment.category_match_id &&
      !assignment.bracket_match_id
    ) {
      const current = byCategoryId.get(assignment.category_id) ?? new Map();
      current.set(assignment.duty, profile);
      byCategoryId.set(assignment.category_id, current);
    }
  }

  return {
    byCategoryMatchId,
    byBracketMatchId,
    byCategoryId,
  };
}

function buildCheckinMap(checkins: TeamCheckinRow[], staffProfiles: StaffProfileRow[]) {
  const staffLookup = new Map(
    staffProfiles
      .filter((profile): profile is StaffProfileRow & { auth_user_id: string } => Boolean(profile.auth_user_id))
      .map((profile) => [profile.auth_user_id, profile]),
  );
  const checkinsByKey = new Map<
    string,
    TeamCheckinRow & {
      recorded_by: StaffProfileRow | null;
    }
  >();

  for (const checkin of checkins) {
    checkinsByKey.set(`${checkin.match_scope}:${checkin.match_id}:${checkin.team_id}`, {
      ...checkin,
      recorded_by: checkin.checked_in_by_user_id
        ? (staffLookup.get(checkin.checked_in_by_user_id) ?? null)
        : null,
    });
  }

  return checkinsByKey;
}

function buildQrTokenMap(tokens: MatchQrTokenRow[]) {
  const map = new Map<string, MatchQrTokenRow>();

  for (const token of tokens) {
    map.set(`${token.resource_type}:${token.resource_id}`, token);
  }

  return map;
}

function enrichCategories(input: {
  categories: CategoryRow[];
  teams: TeamRow[];
  matches: CategoryMatchRow[];
  rules: ScoringRuleRow[];
  adjustments: TeamScoreAdjustmentRow[];
  brackets: CategoryBracketRow[];
  bracketRounds: BracketRoundRow[];
  bracketMatches: BracketMatchRow[];
  operationalSettings: CategoryOperationalSettingsRow[];
  scheduleRuns: CategoryScheduleRunRow[];
  staffProfiles: StaffProfileRow[];
  assignments: StaffAssignmentRow[];
  checkins: TeamCheckinRow[];
  qrTokens: MatchQrTokenRow[];
}): ScoreboardCategory[] {
  const teamLookup = new Map(input.teams.map((team) => [team.id, team]));
  const matchesByCategory = new Map<string, CategoryMatchRow[]>();
  const rulesByCategory = new Map(input.rules.map((rule) => [rule.category_id, rule]));
  const adjustmentsByCategory = new Map<string, TeamScoreAdjustmentRow[]>();
  const bracketsByCategory = new Map(input.brackets.map((bracket) => [bracket.category_id, bracket]));
  const settingsByCategory = new Map(input.operationalSettings.map((settings) => [settings.category_id, settings]));
  const scheduleRunsByCategory = new Map<string, CategoryScheduleRunRow[]>();
  const roundsByBracket = new Map<string, BracketRoundRow[]>();
  const matchesByBracket = new Map<string, BracketMatchRow[]>();
  const { byCategoryMatchId, byBracketMatchId, byCategoryId } = buildAssignmentMaps(
    input.assignments,
    input.staffProfiles,
  );
  const checkinsByKey = buildCheckinMap(input.checkins, input.staffProfiles);
  const qrTokensByKey = buildQrTokenMap(input.qrTokens);

  for (const match of input.matches) {
    const current = matchesByCategory.get(match.category_id) ?? [];
    current.push(match);
    matchesByCategory.set(match.category_id, current);
  }

  for (const run of input.scheduleRuns) {
    const current = scheduleRunsByCategory.get(run.category_id) ?? [];
    current.push(run);
    scheduleRunsByCategory.set(run.category_id, current);
  }

  for (const adjustment of input.adjustments) {
    const current = adjustmentsByCategory.get(adjustment.category_id) ?? [];
    current.push(adjustment);
    adjustmentsByCategory.set(adjustment.category_id, current);
  }

  for (const round of input.bracketRounds) {
    const current = roundsByBracket.get(round.bracket_id) ?? [];
    current.push(round);
    roundsByBracket.set(round.bracket_id, current);
  }

  for (const match of input.bracketMatches) {
    const current = matchesByBracket.get(match.bracket_id) ?? [];
    current.push(match);
    matchesByBracket.set(match.bracket_id, current);
  }

  return input.categories.map((category) => {
    const categoryAssignmentMap = byCategoryId.get(category.id);
    const teams = input.teams
      .filter((team) => team.category_id === category.id)
      .sort((left, right) => left.team_name.localeCompare(right.team_name, "es"))
      .map((team) => ({
        ...team,
        qr_token: qrTokensByKey.get(`team:${team.id}`) ?? null,
      }));

    const matches: EnrichedCategoryMatch[] = (matchesByCategory.get(category.id) ?? [])
      .map((match) => {
        const assignmentMap = byCategoryMatchId.get(match.id);
        const homeCheckin =
          checkinsByKey.get(`category_match:${match.id}:${match.home_team_id}`) ?? null;
        const awayCheckin =
          checkinsByKey.get(`category_match:${match.id}:${match.away_team_id}`) ?? null;

        return {
          ...match,
          scope: "category_match" as const,
          home_team: {
            id: match.home_team_id,
            team_name: teamLookup.get(match.home_team_id)?.team_name ?? "Equipo desconocido",
            registration_code: teamLookup.get(match.home_team_id)?.registration_code ?? "",
          },
          away_team: {
            id: match.away_team_id,
            team_name: teamLookup.get(match.away_team_id)?.team_name ?? "Equipo desconocido",
            registration_code: teamLookup.get(match.away_team_id)?.registration_code ?? "",
          },
          referee_assignment:
            assignmentMap?.get("referee") ?? categoryAssignmentMap?.get("referee") ?? null,
          assistant_assignment:
            assignmentMap?.get("assistant") ?? categoryAssignmentMap?.get("assistant") ?? null,
          home_checkin: homeCheckin,
          away_checkin: awayCheckin,
          qr_token: qrTokensByKey.get(`category_match:${match.id}`) ?? null,
        };
      })
      .sort((left, right) => {
        const leftTime = left.scheduled_at ? new Date(left.scheduled_at).getTime() : 0;
        const rightTime = right.scheduled_at ? new Date(right.scheduled_at).getTime() : 0;

        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }

        return left.match_order - right.match_order;
      });

    const scoringRule = rulesByCategory.get(category.id) ?? null;
    const standings = buildCategoryStandings({
      category,
      teams,
      matches,
      scoringRule,
      adjustments: adjustmentsByCategory.get(category.id) ?? [],
    });
    const groupStandings = buildGroupedStandings({
      category,
      teams,
      matches,
      scoringRule,
      adjustments: adjustmentsByCategory.get(category.id) ?? [],
    });

    const adjustments = (adjustmentsByCategory.get(category.id) ?? [])
      .map((adjustment) => ({
        ...adjustment,
        team: {
          id: adjustment.team_id,
          team_name: teamLookup.get(adjustment.team_id)?.team_name ?? "Equipo desconocido",
          registration_code: teamLookup.get(adjustment.team_id)?.registration_code ?? "",
        },
      }))
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

    const bracket = bracketsByCategory.get(category.id) ?? null;
    const bracketData = bracket
      ? {
          bracket,
          rounds: sortBracketRounds(roundsByBracket.get(bracket.id) ?? []).map((round) => ({
            round,
            matches: (matchesByBracket.get(bracket.id) ?? [])
              .filter((match) => match.round_id === round.id)
              .sort((left, right) => left.match_number - right.match_number)
              .map((match): EnrichedBracketMatch => {
                const assignmentMap = byBracketMatchId.get(match.id);
                const homeCheckin = match.home_team_id
                  ? checkinsByKey.get(`bracket_match:${match.id}:${match.home_team_id}`) ?? null
                  : null;
                const awayCheckin = match.away_team_id
                  ? checkinsByKey.get(`bracket_match:${match.id}:${match.away_team_id}`) ?? null
                  : null;

                return {
                  ...match,
                  scope: "bracket_match" as const,
                  home_team: match.home_team_id
                    ? {
                        id: match.home_team_id,
                        team_name: teamLookup.get(match.home_team_id)?.team_name ?? "Pendiente",
                        registration_code:
                          teamLookup.get(match.home_team_id)?.registration_code ?? "",
                      }
                    : null,
                  away_team: match.away_team_id
                    ? {
                        id: match.away_team_id,
                        team_name: teamLookup.get(match.away_team_id)?.team_name ?? "Pendiente",
                        registration_code:
                          teamLookup.get(match.away_team_id)?.registration_code ?? "",
                      }
                    : null,
                  winner_team: match.winner_team_id
                    ? {
                        id: match.winner_team_id,
                        team_name: teamLookup.get(match.winner_team_id)?.team_name ?? "Pendiente",
                        registration_code:
                          teamLookup.get(match.winner_team_id)?.registration_code ?? "",
                      }
                    : null,
                  referee_assignment:
                    assignmentMap?.get("referee") ?? categoryAssignmentMap?.get("referee") ?? null,
                  assistant_assignment:
                    assignmentMap?.get("assistant") ?? categoryAssignmentMap?.get("assistant") ?? null,
                  home_checkin: homeCheckin,
                  away_checkin: awayCheckin,
                  qr_token: qrTokensByKey.get(`bracket_match:${match.id}`) ?? null,
                };
              }),
          })),
        }
      : null;

    return {
      category,
      category_referee_assignment: categoryAssignmentMap?.get("referee") ?? null,
      category_assistant_assignment: categoryAssignmentMap?.get("assistant") ?? null,
      operationalSettings: settingsByCategory.get(category.id) ?? getDefaultOperationalSettings(category),
      scheduleRuns: (scheduleRunsByCategory.get(category.id) ?? []).sort(
        (left, right) => new Date(right.snapshot_at).getTime() - new Date(left.snapshot_at).getTime(),
      ),
      teams,
      standings,
      groupStandings,
      matches,
      adjustments,
      bracket: bracketData,
      scoringRule,
    };
  });
}

async function getActiveTournamentData() {
  const [{ data: tournament }, { data: categories }, { data: schools }, { data: teams }] =
    await Promise.all([
      supabaseAdmin
        .from("tournaments")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<TournamentRow>(),
      supabaseAdmin
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sport", { ascending: true })
        .order("name", { ascending: true })
        .returns<CategoryRow[]>(),
      supabaseAdmin
        .from("schools")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .returns<SchoolRow[]>(),
      supabaseAdmin
        .from("teams")
        .select("*")
        .neq("status", "cancelled")
        .order("created_at", { ascending: true })
        .returns<TeamRow[]>(),
    ]);

  const activeTournament = requireTournament(tournament);
  const activeCategories = (categories ?? []).filter(
    (category) => category.tournament_id === activeTournament.id && isAllowedSport(category.sport),
  );
  const categoryIds = activeCategories.map((category) => category.id);
  const activeTeams = (teams ?? []).filter((team) => categoryIds.includes(team.category_id));

  if (!activeCategories.length) {
    throw new Error(
      `No hay categorias activas para los deportes permitidos: ${ALLOWED_SPORT_LABELS.join(", ")}.`,
    );
  }

  return {
    tournament: activeTournament,
    categories: activeCategories,
    schools: schools ?? [],
    teams: activeTeams,
  };
}

export async function getScoreboardHomeData(): Promise<ScoreboardHomeData> {
  const base = await getActiveTournamentData();
  const categoryIds = base.categories.map((category) => category.id);

  // Phase 1: fetch category-scoped data + brackets in parallel
  const [
    { data: matches },
    { data: rules },
    { data: adjustments },
    { data: brackets },
    { data: operationalSettings },
    { data: scheduleRuns },
    { data: staffProfiles },
    { data: assignments },
    { data: checkins },
    { data: qrTokens },
  ] = await Promise.all([
    supabaseAdmin
      .from("category_matches")
      .select("*")
      .in("category_id", categoryIds)
      .returns<CategoryMatchRow[]>(),
    supabaseAdmin
      .from("category_scoring_rules")
      .select("*")
      .in("category_id", categoryIds)
      .returns<ScoringRuleRow[]>(),
    supabaseAdmin
      .from("team_score_adjustments")
      .select("*")
      .in("category_id", categoryIds)
      .returns<TeamScoreAdjustmentRow[]>(),
    supabaseAdmin
      .from("category_brackets")
      .select("*")
      .in("category_id", categoryIds)
      .returns<CategoryBracketRow[]>(),
    supabaseAdmin
      .from("category_operational_settings")
      .select("*")
      .in("category_id", categoryIds)
      .returns<CategoryOperationalSettingsRow[]>(),
    supabaseAdmin
      .from("category_schedule_runs")
      .select("*")
      .in("category_id", categoryIds)
      .returns<CategoryScheduleRunRow[]>(),
    supabaseAdmin
      .from("staff_profiles")
      .select("*")
      .eq("is_active", true)
      .order("role", { ascending: true })
      .order("full_name", { ascending: true })
      .returns<StaffProfileRow[]>(),
    supabaseAdmin
      .from("staff_assignments")
      .select("*")
      .eq("tournament_id", base.tournament.id)
      .returns<StaffAssignmentRow[]>(),
    supabaseAdmin
      .from("team_checkins")
      .select("*")
      .returns<TeamCheckinRow[]>(),
    supabaseAdmin
      .from("match_qr_tokens")
      .select("*")
      .eq("is_active", true)
      .returns<MatchQrTokenRow[]>(),
  ]);

  // Phase 2: fetch bracket rounds & matches filtered by known bracket IDs
  // (previously these fetched ALL rows from both tables unfiltered)
  const bracketIds = (brackets ?? []).map((bracket) => bracket.id);
  let bracketRounds: BracketRoundRow[] = [];
  let bracketMatches: BracketMatchRow[] = [];

  if (bracketIds.length > 0) {
    const [{ data: rounds }, { data: bMatches }] = await Promise.all([
      supabaseAdmin
        .from("bracket_rounds")
        .select("*")
        .in("bracket_id", bracketIds)
        .returns<BracketRoundRow[]>(),
      supabaseAdmin
        .from("bracket_matches")
        .select("*")
        .in("bracket_id", bracketIds)
        .returns<BracketMatchRow[]>(),
    ]);
    bracketRounds = rounds ?? [];
    bracketMatches = bMatches ?? [];
  }

  const categories = enrichCategories({
    categories: base.categories,
    teams: base.teams,
    matches: matches ?? [],
    rules: rules ?? [],
    adjustments: adjustments ?? [],
    brackets: brackets ?? [],
    bracketRounds,
    bracketMatches,
    operationalSettings: operationalSettings ?? [],
    scheduleRuns: scheduleRuns ?? [],
    staffProfiles: staffProfiles ?? [],
    assignments: assignments ?? [],
    checkins: checkins ?? [],
    qrTokens: qrTokens ?? [],
  });

  return {
    tournament: base.tournament,
    totalTeams: base.teams.length,
    totalMatches:
      (matches ?? []).length + bracketMatches.length,
    categories,
  };
}

export async function getAdminScoreboardData() {
  const home = await getScoreboardHomeData();
  const { data: staffProfiles } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true })
    .returns<StaffProfileRow[]>();

  return {
    tournament: home.tournament,
    totalTeams: home.totalTeams,
    totalMatches: home.totalMatches,
    categories: home.categories,
    staffProfiles: staffProfiles ?? [],
    recentArrivals: buildAdminArrivalLog(home.categories),
    recentMatchCheckins: buildAdminMatchCheckinLog(home.categories),
  };
}

function buildAdminArrivalLog(categories: ScoreboardCategory[]): AdminArrivalLogEntry[] {
  return categories
    .flatMap((category) =>
      category.teams
        .filter((team) => Boolean(team.checked_in_at))
        .map((team) => ({
          teamId: team.id,
          teamName: team.team_name,
          registrationCode: team.registration_code,
          categoryId: category.category.id,
          categoryName: category.category.name,
          sport: category.category.sport,
          checkedInAt: team.checked_in_at as string,
        })),
    )
    .sort((left, right) => new Date(right.checkedInAt).getTime() - new Date(left.checkedInAt).getTime())
    .slice(0, 12);
}

function buildAdminMatchCheckinLog(categories: ScoreboardCategory[]): AdminMatchCheckinLogEntry[] {
  return categories
    .flatMap((category) => {
      const categoryMatchEntries = category.matches.flatMap((match) => {
        const entries: AdminMatchCheckinLogEntry[] = [];

        if (match.home_checkin) {
          entries.push({
            key: `${match.home_checkin.id}:${match.home_team.id}`,
            teamId: match.home_team.id,
            teamName: match.home_team.team_name,
            registrationCode: match.home_team.registration_code,
            matchId: match.id,
            matchScope: match.scope,
            matchLabel: `${match.home_team.team_name} vs ${match.away_team.team_name}`,
            categoryId: category.category.id,
            categoryName: category.category.name,
            status: match.home_checkin.status,
            incidentLabel: match.home_checkin.incident_label,
            checkedInAt: match.home_checkin.checked_in_at,
            recordedByName: match.home_checkin.recorded_by?.full_name ?? null,
          });
        }

        if (match.away_checkin) {
          entries.push({
            key: `${match.away_checkin.id}:${match.away_team.id}`,
            teamId: match.away_team.id,
            teamName: match.away_team.team_name,
            registrationCode: match.away_team.registration_code,
            matchId: match.id,
            matchScope: match.scope,
            matchLabel: `${match.home_team.team_name} vs ${match.away_team.team_name}`,
            categoryId: category.category.id,
            categoryName: category.category.name,
            status: match.away_checkin.status,
            incidentLabel: match.away_checkin.incident_label,
            checkedInAt: match.away_checkin.checked_in_at,
            recordedByName: match.away_checkin.recorded_by?.full_name ?? null,
          });
        }

        return entries;
      });

      const bracketEntries = (category.bracket?.rounds ?? []).flatMap((round) =>
        round.matches.flatMap((match) => {
          const entries: AdminMatchCheckinLogEntry[] = [];
          const matchLabel = `${match.home_team?.team_name ?? "Pendiente"} vs ${match.away_team?.team_name ?? "Pendiente"}`;

          if (match.home_checkin && match.home_team) {
            entries.push({
              key: `${match.home_checkin.id}:${match.home_team.id}`,
              teamId: match.home_team.id,
              teamName: match.home_team.team_name,
              registrationCode: match.home_team.registration_code,
              matchId: match.id,
              matchScope: match.scope,
              matchLabel,
              categoryId: category.category.id,
              categoryName: `${category.category.name} · ${round.round.name}`,
              status: match.home_checkin.status,
              incidentLabel: match.home_checkin.incident_label,
              checkedInAt: match.home_checkin.checked_in_at,
              recordedByName: match.home_checkin.recorded_by?.full_name ?? null,
            });
          }

          if (match.away_checkin && match.away_team) {
            entries.push({
              key: `${match.away_checkin.id}:${match.away_team.id}`,
              teamId: match.away_team.id,
              teamName: match.away_team.team_name,
              registrationCode: match.away_team.registration_code,
              matchId: match.id,
              matchScope: match.scope,
              matchLabel,
              categoryId: category.category.id,
              categoryName: `${category.category.name} · ${round.round.name}`,
              status: match.away_checkin.status,
              incidentLabel: match.away_checkin.incident_label,
              checkedInAt: match.away_checkin.checked_in_at,
              recordedByName: match.away_checkin.recorded_by?.full_name ?? null,
            });
          }

          return entries;
        }),
      );

      return [...categoryMatchEntries, ...bracketEntries];
    })
    .sort((left, right) => new Date(right.checkedInAt).getTime() - new Date(left.checkedInAt).getTime())
    .slice(0, 12);
}

function flattenOperationalMatches(
  categories: ScoreboardCategory[],
  staff: StaffContext,
): OperationalMatchSummary[] {
  const summaries: OperationalMatchSummary[] = [];

  for (const category of categories) {
    for (const match of category.matches) {
      const duty =
        isManagementRole(staff.profile.role)
          ? "admin"
          : match.referee_assignment?.auth_user_id === staff.authUserId
            ? "referee"
            : match.assistant_assignment?.auth_user_id === staff.authUserId
              ? "assistant"
              : null;

      if (!duty) {
        continue;
      }

      summaries.push({
        scope: "category_match",
        matchId: match.id,
        categoryId: category.category.id,
        categoryName: category.category.name,
        sport: category.category.sport,
        ageGroup: category.category.age_group,
        location: match.location,
        scheduledAt: match.scheduled_at,
        status: match.status,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        duty,
        qrToken: match.qr_token?.token ?? null,
      });
    }

    for (const round of category.bracket?.rounds ?? []) {
      for (const match of round.matches) {
        const duty =
          isManagementRole(staff.profile.role)
            ? "admin"
            : match.referee_assignment?.auth_user_id === staff.authUserId
              ? "referee"
              : match.assistant_assignment?.auth_user_id === staff.authUserId
                ? "assistant"
                : null;

        if (!duty) {
          continue;
        }

        summaries.push({
          scope: "bracket_match",
          matchId: match.id,
          categoryId: category.category.id,
          categoryName: `${category.category.name} · ${round.round.name}`,
          sport: category.category.sport,
          ageGroup: category.category.age_group,
          location: match.location,
          scheduledAt: match.scheduled_at,
          status: match.status,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          duty,
          qrToken: match.qr_token?.token ?? null,
        });
      }
    }
  }

  return summaries.sort((left, right) => {
    const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduledAt
      ? new Date(right.scheduledAt).getTime()
      : Number.MAX_SAFE_INTEGER;

    return leftTime - rightTime;
  });
}

export async function getOperationalDashboardData(
  staff: StaffContext,
): Promise<OperationalDashboardData> {
  const adminData = await getAdminScoreboardData();
  const assignedMatches = flattenOperationalMatches(adminData.categories, staff);
  const teamIds = new Set<string>();

  for (const match of assignedMatches) {
    if (match.homeTeam?.id) teamIds.add(match.homeTeam.id);
    if (match.awayTeam?.id) teamIds.add(match.awayTeam.id);
  }

  const teams = adminData.categories
    .flatMap((category) =>
      category.teams
        .filter((team) => isManagementRole(staff.profile.role) || teamIds.has(team.id))
        .map((team) => ({
          ...team,
          category: category.category,
        })),
    )
    .sort((left, right) => left.team_name.localeCompare(right.team_name, "es"));

  return {
    tournament: adminData.tournament,
    staff: staff.profile,
    assignedMatches,
    teams,
  };
}

export async function getOperationalMatchById(
  staff: StaffContext,
  input: { matchId: string; scope: MatchScope },
) {
  const adminData = await getAdminScoreboardData();

  for (const category of adminData.categories) {
    if (input.scope === "category_match") {
      const match = category.matches.find((item) => item.id === input.matchId);

      if (!match) {
        continue;
      }

      const canAccess =
        isManagementRole(staff.profile.role) ||
        match.referee_assignment?.auth_user_id === staff.authUserId ||
        match.assistant_assignment?.auth_user_id === staff.authUserId;

      return canAccess
        ? {
            category,
            match,
            canSubmitResult:
              isManagementRole(staff.profile.role) ||
              match.referee_assignment?.auth_user_id === staff.authUserId,
            canCheckIn:
              isManagementRole(staff.profile.role) ||
              match.assistant_assignment?.auth_user_id === staff.authUserId,
          }
        : null;
    }

    for (const round of category.bracket?.rounds ?? []) {
      const match = round.matches.find((item) => item.id === input.matchId);

      if (!match) {
        continue;
      }

      const canAccess =
        isManagementRole(staff.profile.role) ||
        match.referee_assignment?.auth_user_id === staff.authUserId ||
        match.assistant_assignment?.auth_user_id === staff.authUserId;

      return canAccess
        ? {
            category,
            round,
            match,
            canSubmitResult:
              isManagementRole(staff.profile.role) ||
              match.referee_assignment?.auth_user_id === staff.authUserId,
            canCheckIn:
              isManagementRole(staff.profile.role) ||
              match.assistant_assignment?.auth_user_id === staff.authUserId,
          }
        : null;
    }
  }

  return null;
}

export async function getOperationalTeamById(staff: StaffContext, teamId: string) {
  const adminData = await getAdminScoreboardData();

  for (const category of adminData.categories) {
    const team = category.teams.find((item) => item.id === teamId);

    if (!team) {
      continue;
    }

    const relatedCategoryMatches = category.matches.filter(
      (match) => match.home_team.id === teamId || match.away_team.id === teamId,
    );
    const relatedBracketMatches = (category.bracket?.rounds ?? []).flatMap((round) =>
      round.matches.filter((match) => match.home_team?.id === teamId || match.away_team?.id === teamId),
    );

    const canAccess =
      isManagementRole(staff.profile.role) ||
      relatedCategoryMatches.some(
        (match) =>
          match.referee_assignment?.auth_user_id === staff.authUserId ||
          match.assistant_assignment?.auth_user_id === staff.authUserId,
      ) ||
      relatedBracketMatches.some(
        (match) =>
          match.referee_assignment?.auth_user_id === staff.authUserId ||
          match.assistant_assignment?.auth_user_id === staff.authUserId,
      );

    return canAccess
      ? {
          team,
          category: category.category,
          categoryMatches: relatedCategoryMatches,
          bracketMatches: relatedBracketMatches,
        }
      : null;
  }

  return null;
}

export async function getPublicMatchByToken(input: {
  token: string;
  matchId: string;
  scope: MatchScope;
}) {
  const qrTarget = await getQrTargetByToken(input.token);

  if (
    !qrTarget ||
    qrTarget.resource_id !== input.matchId ||
    qrTarget.resource_type !== input.scope
  ) {
    return null;
  }

  const home = await getScoreboardHomeData();

  for (const category of home.categories) {
    if (input.scope === "category_match") {
      const match = category.matches.find((item) => item.id === input.matchId);

      if (match) {
        return {
          category,
          match,
          qrTarget,
        };
      }
    }

    for (const round of category.bracket?.rounds ?? []) {
      const match = round.matches.find((item) => item.id === input.matchId);

      if (match) {
        return {
          category,
          round,
          match,
          qrTarget,
        };
      }
    }
  }

  return null;
}

export async function getPublicTeamByToken(input: { token: string; teamId: string }) {
  const qrTarget = await getQrTargetByToken(input.token);

  if (!qrTarget || qrTarget.resource_id !== input.teamId || qrTarget.resource_type !== "team") {
    return null;
  }

  const home = await getScoreboardHomeData();

  for (const category of home.categories) {
    const team = category.teams.find((item) => item.id === input.teamId);

    if (!team) {
      continue;
    }

    const categoryMatches = category.matches.filter(
      (match) => match.home_team.id === input.teamId || match.away_team.id === input.teamId,
    );
    const bracketMatches = (category.bracket?.rounds ?? []).flatMap((round) =>
      round.matches.filter((match) => match.home_team?.id === input.teamId || match.away_team?.id === input.teamId),
    );

    return {
      team,
      category: category.category,
      categoryMatches,
      bracketMatches,
      qrTarget,
    };
  }

  return null;
}

export async function getTeamByRegistrationCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const { data } = await supabaseAdmin
    .from("teams")
    .select("*, category:categories(*)")
    .eq("registration_code", normalizedCode)
    .maybeSingle<TeamStatusRow & { category: CategoryRow }>();

  if (!data) {
    return null;
  }

  const { data: qrToken } = await supabaseAdmin
    .from("match_qr_tokens")
    .select("*")
    .eq("resource_type", "team")
    .eq("resource_id", data.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<MatchQrTokenRow>();

  return {
    ...data,
    qr_token: qrToken ?? null,
  };
}

export async function getParentalConfirmationByToken(token: string) {
  const { data } = await supabaseAdmin
    .from("parental_confirmations")
    .select("*, team:teams(*, category:categories(*))")
    .eq("token", token)
    .maybeSingle<ConfirmationRow & { team: TeamStatusRow & { category: CategoryRow } }>();

  return data;
}

export async function getStaffProfileByEmail(email: string) {
  const { data } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle<StaffProfileRow>();

  return data;
}

export async function getStaffProfileByAuthUserId(authUserId: string) {
  const { data } = await supabaseAdmin
    .from("staff_profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle<StaffProfileRow>();

  return data;
}

export async function getQrTargetByToken(token: string) {
  const { data } = await supabaseAdmin
    .from("match_qr_tokens")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle<MatchQrTokenRow>();

  return data;
}

export async function touchQrToken(token: string) {
  await supabaseAdmin
    .from("match_qr_tokens")
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq("token", token);
}

export async function confirmParentalAuthorization(input: {
  token: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
}) {
  const confirmation = await getParentalConfirmationByToken(input.token);

  if (!confirmation) {
    throw new Error("No se ha encontrado la autorizacion.");
  }

  if (confirmation.status === "confirmed") {
    return {
      message: "La autorizacion ya estaba confirmada.",
    };
  }

  const now = new Date().toISOString();

  const { error: updateConfirmationError } = await supabaseAdmin
    .from("parental_confirmations")
    .update({
      parent_name: input.parentName,
      parent_phone: input.parentPhone,
      parent_email: input.parentEmail.toLowerCase(),
      status: "confirmed",
      confirmed_at: now,
    })
    .eq("token", input.token);

  if (updateConfirmationError) {
    throw new Error(updateConfirmationError.message);
  }

  const { error: updateTeamError } = await supabaseAdmin
    .from("teams")
    .update({
      parental_confirmed_at: now,
      status: "confirmed",
      updated_at: now,
    })
    .eq("id", confirmation.team.id);

  if (updateTeamError) {
    throw new Error(updateTeamError.message);
  }

  return {
    message: "La autorizacion se ha registrado correctamente.",
  };
}
