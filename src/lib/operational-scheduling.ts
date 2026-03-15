import { normalizeSportName } from "@/lib/allowed-sports";
import type {
  BracketTemplate,
  CategoryMatchPhase,
  CategoryOperationalSettingsRow,
  CategoryRow,
  CategoryScheduleRunRow,
  FinalStageType,
  GroupLabel,
  OperationalCapacitySummary,
  PlacementTemplate,
  RankSelector,
  TeamRow,
} from "@/lib/types";

export type ScheduledMatchDraft = {
  homeTeamId: string;
  awayTeamId: string;
  phase: CategoryMatchPhase;
  groupLabel: GroupLabel | null;
  countsForStandings: boolean;
  roundLabel: string | null;
  matchOrder: number;
  scheduledAt: string | null;
  location: string | null;
  notes: string | null;
};

export type BracketGenerationPlan = {
  name: string;
  qualifiedTeamCount: number;
  seededTeamIds: Array<string | null>;
  thirdPlaceLabel: string | null;
  actualPlayedMatches: number;
};

export type OperationalSchedulePlan = {
  formatKey: string;
  formatLabel: string;
  stage: "initial" | "final";
  initialStage: "league" | "group" | "bracket";
  finalStage: FinalStageType;
  minimumMatchesPerTeam: number;
  officialPlacement: boolean;
  totalMatchesPlanned: number;
  warnings: string[];
  capacity: OperationalCapacitySummary & {
    overCapacity: boolean;
  };
  generatedMatches: ScheduledMatchDraft[];
  bracketPlan: BracketGenerationPlan | null;
  finalMatches: PlacementTemplate[];
  groupLabels: GroupLabel[];
  directBracket: boolean;
};

type PlanInput = {
  category: CategoryRow;
  eventDate: string;
  presentTeams: TeamRow[];
  settings: CategoryOperationalSettingsRow;
};

const DEFAULT_WINDOW_START = "11:00:00";
const DEFAULT_WINDOW_END = "14:00:00";

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function addMinutesToIso(dateInput: string, minutes: number) {
  const date = new Date(dateInput);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function buildDateTime(eventDate: string, timeValue: string) {
  const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  return `${eventDate}T${normalizedTime}`;
}

function sortTeamsForScheduling(teams: TeamRow[]): TeamRow[] {
  return [...teams].sort((left, right) => {
    const time = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

    if (time !== 0) {
      return time;
    }

    return left.team_name.localeCompare(right.team_name, "es");
  });
}

export function getDefaultOperationalSettings(category: CategoryRow): CategoryOperationalSettingsRow {
  const normalizedSport = normalizeSportName(category.sport);
  const isFootball = normalizedSport === "futbol";

  return {
    category_id: category.id,
    match_minutes: isFootball ? 20 : 15,
    turnover_minutes: 5,
    venue_count: isFootball ? 2 : 1,
    window_start: DEFAULT_WINDOW_START,
    window_end: DEFAULT_WINDOW_END,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

export function computeOperationalCapacity(settings: CategoryOperationalSettingsRow) {
  const slotMinutes = settings.match_minutes + settings.turnover_minutes;
  const totalWindowMinutes = Math.max(
    parseTimeToMinutes(settings.window_end) - parseTimeToMinutes(settings.window_start),
    0,
  );
  const slotsPerVenue = slotMinutes > 0 ? Math.floor(totalWindowMinutes / slotMinutes) : 0;

  return {
    slotMinutes,
    totalWindowMinutes,
    slotsPerVenue,
    venueCount: settings.venue_count,
    maxMatches: slotsPerVenue * settings.venue_count,
  } satisfies OperationalCapacitySummary;
}

function buildVenueNames(category: CategoryRow, settings: CategoryOperationalSettingsRow) {
  const schoolPrefix = category.school ? `${category.school} · ` : "";
  const sport = normalizeSportName(category.sport);

  if (sport === "futbol") {
    return Array.from({ length: settings.venue_count }, (_, index) => `${schoolPrefix}Campo ${index + 1}`);
  }

  if (sport === "baloncesto") {
    return Array.from({ length: settings.venue_count }, (_, index) =>
      settings.venue_count === 1
        ? `${schoolPrefix}Pista Baloncesto`
        : `${schoolPrefix}Pista Baloncesto ${index + 1}`,
    );
  }

  return Array.from({ length: settings.venue_count }, (_, index) =>
    settings.venue_count === 1
      ? `${schoolPrefix}Pista Voleibol`
      : `${schoolPrefix}Pista Voleibol ${index + 1}`,
  );
}

function withSchedule(
  drafts: Array<Omit<ScheduledMatchDraft, "scheduledAt" | "location" | "matchOrder">>,
  category: CategoryRow,
  eventDate: string,
  settings: CategoryOperationalSettingsRow,
) {
  const startAt = buildDateTime(eventDate, settings.window_start);
  const slotMinutes = settings.match_minutes + settings.turnover_minutes;
  const venues = buildVenueNames(category, settings);

  return drafts.map((draft, index) => {
    const slotIndex = Math.floor(index / settings.venue_count);
    const venueIndex = index % settings.venue_count;

    return {
      ...draft,
      matchOrder: index,
      scheduledAt: addMinutesToIso(startAt, slotIndex * slotMinutes),
      location: venues[venueIndex] ?? venues[0] ?? null,
    } satisfies ScheduledMatchDraft;
  });
}

function buildRoundRobin(teamIds: Array<string | null>) {
  const slots = [...teamIds];

  if (slots.length % 2 !== 0) {
    slots.push(null);
  }

  const rounds: Array<Array<[string, string]>> = [];
  const rotating = [...slots];

  for (let roundIndex = 0; roundIndex < rotating.length - 1; roundIndex += 1) {
    const round: Array<[string, string]> = [];

    for (let index = 0; index < rotating.length / 2; index += 1) {
      const home = rotating[index];
      const away = rotating[rotating.length - 1 - index];

      if (home && away) {
        round.push(index % 2 === 0 ? [home, away] : [away, home]);
      }
    }

    rounds.push(round);

    const fixed = rotating[0];
    const rest = rotating.slice(1);
    rest.unshift(rest.pop() ?? null);
    rotating.splice(0, rotating.length, fixed, ...rest);
  }

  return rounds;
}

function buildLeagueMatches(teamIds: string[], labelPrefix: string, phase: CategoryMatchPhase) {
  const rounds = buildRoundRobin(teamIds);

  return rounds.flatMap((round, roundIndex) =>
    round.map(([homeTeamId, awayTeamId]) => ({
      homeTeamId,
      awayTeamId,
      phase,
      groupLabel: null,
      countsForStandings: true,
      roundLabel: `${labelPrefix} · Jornada ${roundIndex + 1}`,
      notes: null,
    })),
  );
}

function splitIntoGroups(teamIds: string[], groupSizes: number[]): Record<GroupLabel, string[]> {
  const labels: GroupLabel[] = ["A", "B"];
  const groups: Record<GroupLabel, string[]> = {
    A: [],
    B: [],
  };
  const buckets = groupSizes.map(() => [] as string[]);

  let direction = 1;
  let cursor = 0;

  for (const teamId of teamIds) {
    buckets[cursor].push(teamId);

    const nextCursor = cursor + direction;

    if (nextCursor >= groupSizes.length || nextCursor < 0) {
      direction *= -1;
      cursor += direction;
    } else {
      cursor = nextCursor;
    }
  }

  for (let index = 0; index < groupSizes.length; index += 1) {
    groups[labels[index]] = buckets[index].slice(0, groupSizes[index]);
  }

  return groups;
}

function buildGroupMatches(groups: Record<GroupLabel, string[]>) {
  const groupedRounds = Object.entries(groups).map(([label, teamIds]) => ({
    label: label as GroupLabel,
    rounds: buildRoundRobin(teamIds),
  }));
  const totalRounds = Math.max(...groupedRounds.map((entry) => entry.rounds.length), 0);
  const drafts: Array<Omit<ScheduledMatchDraft, "scheduledAt" | "location" | "matchOrder">> = [];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    for (const group of groupedRounds) {
      const matches = group.rounds[roundIndex] ?? [];

      for (const [homeTeamId, awayTeamId] of matches) {
        drafts.push({
          homeTeamId,
          awayTeamId,
          phase: "group",
          groupLabel: group.label,
          countsForStandings: true,
          roundLabel: `Grupo ${group.label} · Jornada ${roundIndex + 1}`,
          notes: null,
        });
      }
    }
  }

  return drafts;
}

function buildSeedOrder(size: number): number[] {
  if (size === 2) {
    return [1, 2];
  }

  const previous = buildSeedOrder(size / 2);
  return previous.flatMap((seed) => [seed, size + 1 - seed]);
}

function buildSeededTeamIds(teamIds: string[], size: number) {
  const seedOrder = buildSeedOrder(size);
  return seedOrder.map((seed) => teamIds[seed - 1] ?? null);
}

function countActualBracketMatches(seededTeamIds: Array<string | null>, size: number, thirdPlaceLabel: string | null) {
  const participantCount = seededTeamIds.filter(Boolean).length;
  const baseMatches = Math.max(participantCount - 1, 0);
  return baseMatches + (thirdPlaceLabel ? 1 : 0);
}

function resolveSelector(
  selector: RankSelector,
  overallTeamIds: string[],
  groups: Partial<Record<GroupLabel, string[]>>,
) {
  if (selector.mode === "overall") {
    return overallTeamIds[selector.rank - 1] ?? null;
  }

  if (!selector.groupLabel) {
    return null;
  }

  return groups[selector.groupLabel]?.[selector.rank - 1] ?? null;
}

function buildFinalMatchesFromSelectors(
  templates: PlacementTemplate[],
  overallTeamIds: string[],
  groups: Partial<Record<GroupLabel, string[]>>,
) {
  type PlacementDraft = Omit<ScheduledMatchDraft, "scheduledAt" | "location" | "matchOrder">;

  return templates
    .map((template) => {
      const homeTeamId = resolveSelector(template.home, overallTeamIds, groups);
      const awayTeamId = resolveSelector(template.away, overallTeamIds, groups);

      if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
        return null;
      }

      return {
        homeTeamId,
        awayTeamId,
        phase: "placement" as const,
        groupLabel: null,
        countsForStandings: false,
        roundLabel: template.label,
        notes: null,
      } satisfies PlacementDraft;
    })
    .filter(Boolean) as PlacementDraft[];
}

function buildCapacityWarning(totalMatches: number, capacity: OperationalCapacitySummary) {
  if (totalMatches <= capacity.maxMatches) {
    return null;
  }

  return `La jornada supera la capacidad estimada de ${capacity.maxMatches} partidos.`;
}

function footballInitialPlan(input: PlanInput): OperationalSchedulePlan {
  const teamIds = sortTeamsForScheduling(input.presentTeams).map((team) => team.id);
  const capacity = computeOperationalCapacity(input.settings);
  const warnings: string[] = [];

  if (teamIds.length === 4 || teamIds.length === 5) {
    const generatedMatches = withSchedule(
      buildLeagueMatches(teamIds, "Liga", "league"),
      input.category,
      input.eventDate,
      input.settings,
    );
    const finalMatches: PlacementTemplate[] = [
      {
        label: "Final",
        home: { mode: "overall", rank: 1 },
        away: { mode: "overall", rank: 2 },
      },
    ];

    if (teamIds.length >= 4) {
      finalMatches.push({
        label: "3º/4º",
        home: { mode: "overall", rank: 3 },
        away: { mode: "overall", rank: 4 },
      });
    }

    const totalMatches = generatedMatches.length + finalMatches.length;
    const capacityWarning = buildCapacityWarning(totalMatches, capacity);

    if (capacityWarning) {
      warnings.push(capacityWarning);
    }

    return {
      formatKey: teamIds.length === 4 ? "football_4_league_top2" : "football_5_league_top2",
      formatLabel: teamIds.length === 4 ? "Liga completa + final" : "Liga completa + final y 3º/4º",
      stage: "initial",
      initialStage: "league",
      finalStage: "top2_final",
      minimumMatchesPerTeam: teamIds.length === 4 ? 4 : 4,
      officialPlacement: true,
      totalMatchesPlanned: totalMatches,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: totalMatches > capacity.maxMatches,
      },
      generatedMatches,
      bracketPlan: null,
      finalMatches,
      groupLabels: [],
      directBracket: false,
    };
  }

  if (teamIds.length === 6) {
    const groups = splitIntoGroups(teamIds, [3, 3]);
    const generatedMatches = withSchedule(
      buildGroupMatches(groups),
      input.category,
      input.eventDate,
      input.settings,
    );
    const totalMatches = generatedMatches.length + 4;

    return {
      formatKey: "football_6_groups_top4",
      formatLabel: "2 grupos de 3 + semifinales + final + 5º/6º",
      stage: "initial",
      initialStage: "group",
      finalStage: "top4_bracket",
      minimumMatchesPerTeam: 3,
      officialPlacement: true,
      totalMatchesPlanned: totalMatches,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: totalMatches > capacity.maxMatches,
      },
      generatedMatches,
      bracketPlan: null,
      finalMatches: [
        {
          label: "5º/6º",
          home: { mode: "group", groupLabel: "A", rank: 3 },
          away: { mode: "group", groupLabel: "B", rank: 3 },
        },
      ],
      groupLabels: ["A", "B"],
      directBracket: false,
    };
  }

  if (teamIds.length === 7 || teamIds.length === 8) {
    const groups = splitIntoGroups(teamIds, teamIds.length === 7 ? [4, 3] : [4, 4]);
    const generatedMatches = withSchedule(
      buildGroupMatches(groups),
      input.category,
      input.eventDate,
      input.settings,
    );
    const finalMatches: PlacementTemplate[] = [
      {
        label: "Final",
        home: { mode: "group", groupLabel: "A", rank: 1 },
        away: { mode: "group", groupLabel: "B", rank: 1 },
      },
      {
        label: "3º/4º",
        home: { mode: "group", groupLabel: "A", rank: 2 },
        away: { mode: "group", groupLabel: "B", rank: 2 },
      },
    ];

    if (teamIds.length === 7) {
      finalMatches.push({
        label: "5º/6º",
        home: { mode: "group", groupLabel: "A", rank: 3 },
        away: { mode: "group", groupLabel: "B", rank: 3 },
      });
      warnings.push("El séptimo equipo termina su jornada al cerrar la fase inicial.");
    }

    const totalMatches = generatedMatches.length + finalMatches.length;
    const capacityWarning = buildCapacityWarning(totalMatches, capacity);

    if (capacityWarning) {
      warnings.push(capacityWarning);
    }

    return {
      formatKey: teamIds.length === 7 ? "football_7_groups_ranked_finals" : "football_8_groups_ranked_finals",
      formatLabel: teamIds.length === 7 ? "Grupos 4/3 + finales por puesto" : "2 grupos de 4 + final y 3º/4º",
      stage: "initial",
      initialStage: "group",
      finalStage: "top2_final",
      minimumMatchesPerTeam: teamIds.length === 7 ? 2 : 3,
      officialPlacement: true,
      totalMatchesPlanned: totalMatches,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: totalMatches > capacity.maxMatches,
      },
      generatedMatches,
      bracketPlan: null,
      finalMatches,
      groupLabels: ["A", "B"],
      directBracket: false,
    };
  }

  throw new Error("El fútbol requiere entre 4 y 8 equipos presentes para generar la jornada.");
}

function courtInitialPlan(input: PlanInput): OperationalSchedulePlan {
  const teamIds = sortTeamsForScheduling(input.presentTeams).map((team) => team.id);
  const capacity = computeOperationalCapacity(input.settings);
  const warnings: string[] = [];

  if (teamIds.length === 4) {
    const generatedMatches = withSchedule(
      buildLeagueMatches(teamIds, "Liga", "league"),
      input.category,
      input.eventDate,
      input.settings,
    );
    const finalMatches: PlacementTemplate[] = [
      {
        label: "Final",
        home: { mode: "overall", rank: 1 },
        away: { mode: "overall", rank: 2 },
      },
    ];
    const totalMatches = generatedMatches.length + finalMatches.length;

    return {
      formatKey: "court_4_league_final",
      formatLabel: "Liga completa + final",
      stage: "initial",
      initialStage: "league",
      finalStage: "top2_final",
      minimumMatchesPerTeam: 3,
      officialPlacement: false,
      totalMatchesPlanned: totalMatches,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: totalMatches > capacity.maxMatches,
      },
      generatedMatches,
      bracketPlan: null,
      finalMatches,
      groupLabels: [],
      directBracket: false,
    };
  }

  if (teamIds.length === 5) {
    const groups = splitIntoGroups(teamIds, [3, 2]);
    const generatedMatches = withSchedule(
      buildGroupMatches(groups),
      input.category,
      input.eventDate,
      input.settings,
    );

    return {
      formatKey: "court_5_groups_top4",
      formatLabel: "Grupos 3/2 + semifinales + final",
      stage: "initial",
      initialStage: "group",
      finalStage: "top4_bracket",
      minimumMatchesPerTeam: 2,
      officialPlacement: false,
      totalMatchesPlanned: generatedMatches.length + 3,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: generatedMatches.length + 3 > capacity.maxMatches,
      },
      generatedMatches,
      bracketPlan: null,
      finalMatches: [],
      groupLabels: ["A", "B"],
      directBracket: false,
    };
  }

  if (teamIds.length === 6) {
    const groups = splitIntoGroups(teamIds, [3, 3]);
    const generatedMatches = withSchedule(
      buildGroupMatches(groups),
      input.category,
      input.eventDate,
      input.settings,
    );
    const finalMatches: PlacementTemplate[] = [
      {
        label: "Final",
        home: { mode: "group", groupLabel: "A", rank: 1 },
        away: { mode: "group", groupLabel: "B", rank: 1 },
      },
      {
        label: "3º/4º",
        home: { mode: "group", groupLabel: "A", rank: 2 },
        away: { mode: "group", groupLabel: "B", rank: 2 },
      },
    ];

    return {
      formatKey: "court_6_groups_finals",
      formatLabel: "2 grupos de 3 + final + 3º/4º",
      stage: "initial",
      initialStage: "group",
      finalStage: "top2_final",
      minimumMatchesPerTeam: 2,
      officialPlacement: true,
      totalMatchesPlanned: generatedMatches.length + finalMatches.length,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: generatedMatches.length + finalMatches.length > capacity.maxMatches,
      },
      generatedMatches,
      bracketPlan: null,
      finalMatches,
      groupLabels: ["A", "B"],
      directBracket: false,
    };
  }

  if (teamIds.length === 7 || teamIds.length === 8) {
    if (teamIds.length === 7) {
      warnings.push("Se reserva un bye automático para el primer cruce del cuadro.");
    }

    warnings.push("La colocación completa no cabe en esta pista. Solo se reserva 3º/4º.");

    const seededTeamIds = buildSeededTeamIds(teamIds, 8);
    const thirdPlaceLabel = "3º/4º";
    const bracketPlan: BracketGenerationPlan = {
      name: `${input.category.name} · Eliminatoria`,
      qualifiedTeamCount: 8,
      seededTeamIds,
      thirdPlaceLabel,
      actualPlayedMatches: countActualBracketMatches(seededTeamIds, 8, thirdPlaceLabel),
    };

    return {
      formatKey: teamIds.length === 7 ? "court_7_direct_bracket" : "court_8_direct_bracket",
      formatLabel: teamIds.length === 7 ? "Eliminatoria directa de 8 con bye" : "Cuartos + semifinales + final",
      stage: "initial",
      initialStage: "bracket",
      finalStage: "none",
      minimumMatchesPerTeam: 1,
      officialPlacement: true,
      totalMatchesPlanned: bracketPlan.actualPlayedMatches,
      warnings,
      capacity: {
        ...capacity,
        overCapacity: bracketPlan.actualPlayedMatches > capacity.maxMatches,
      },
      generatedMatches: [],
      bracketPlan,
      finalMatches: [],
      groupLabels: [],
      directBracket: true,
    };
  }

  throw new Error("Esta categoría necesita entre 4 y 8 equipos presentes para generar la jornada.");
}

export function buildInitialOperationalPlan(input: PlanInput): OperationalSchedulePlan {
  const normalizedSport = normalizeSportName(input.category.sport);

  if (normalizedSport === "futbol") {
    return footballInitialPlan(input);
  }

  return courtInitialPlan(input);
}

export function buildFinalStagePlan(input: {
  category: CategoryRow;
  eventDate: string;
  settings: CategoryOperationalSettingsRow;
  teams: TeamRow[];
  standingsByGroup: Partial<Record<GroupLabel, string[]>>;
  overallStandings: string[];
  previousRun: CategoryScheduleRunRow;
}): OperationalSchedulePlan {
  const warnings = [...input.previousRun.warnings];
  const capacity = {
    ...input.previousRun.capacity_summary,
    overCapacity: false,
  };

  if (input.previousRun.meta.finalStage === "none") {
    throw new Error("Esta jornada no necesita una fase final adicional.");
  }

  const placementDrafts = buildFinalMatchesFromSelectors(
    input.previousRun.meta.finalMatches,
    input.overallStandings,
    input.standingsByGroup,
  );

  if (input.previousRun.meta.finalStage === "top2_final") {
    return {
      formatKey: input.previousRun.format_key,
      formatLabel: input.previousRun.format_label,
      stage: "final" as const,
      initialStage: input.previousRun.meta.initialStage,
      finalStage: input.previousRun.meta.finalStage,
      minimumMatchesPerTeam: input.previousRun.minimum_matches_per_team,
      officialPlacement: input.previousRun.official_placement,
      totalMatchesPlanned: input.previousRun.total_matches_planned,
      capacity,
      generatedMatches: withSchedule(placementDrafts, input.category, input.eventDate, input.settings),
      bracketPlan: null,
      finalMatches: input.previousRun.meta.finalMatches,
      groupLabels: input.previousRun.meta.groupLabels,
      directBracket: input.previousRun.meta.directBracket,
      warnings,
    };
  }

  const bracketTemplate = input.previousRun.meta.bracketTemplate;

  if (!bracketTemplate) {
    throw new Error("Falta la configuración del cuadro final.");
  }

  const seededTeamIds = bracketTemplate.seedSelectors.map((selector) =>
    resolveSelector(selector, input.overallStandings, input.standingsByGroup),
  );

  const bracketPlan: BracketGenerationPlan = {
    name: bracketTemplate.name,
    qualifiedTeamCount: bracketTemplate.qualifiedTeamCount,
    seededTeamIds,
    thirdPlaceLabel: bracketTemplate.thirdPlaceLabel,
    actualPlayedMatches: countActualBracketMatches(
      seededTeamIds,
      bracketTemplate.qualifiedTeamCount,
      bracketTemplate.thirdPlaceLabel,
    ),
  };

  return {
    formatKey: input.previousRun.format_key,
    formatLabel: input.previousRun.format_label,
    stage: "final" as const,
    initialStage: input.previousRun.meta.initialStage,
    finalStage: input.previousRun.meta.finalStage,
    minimumMatchesPerTeam: input.previousRun.minimum_matches_per_team,
    officialPlacement: input.previousRun.official_placement,
    totalMatchesPlanned: input.previousRun.total_matches_planned,
    capacity,
    generatedMatches: withSchedule(placementDrafts, input.category, input.eventDate, input.settings),
    bracketPlan,
    finalMatches: input.previousRun.meta.finalMatches,
    groupLabels: input.previousRun.meta.groupLabels,
    directBracket: input.previousRun.meta.directBracket,
    warnings,
  };
}

export function buildInitialMetaFromPlan(plan: OperationalSchedulePlan): {
  initialStage: "league" | "group" | "bracket";
  finalStage: FinalStageType;
  groupLabels: GroupLabel[];
  finalMatches: PlacementTemplate[];
  bracketTemplate: BracketTemplate | null;
  directBracket: boolean;
} {
  return {
    initialStage: plan.initialStage,
    finalStage: plan.finalStage,
    groupLabels: plan.groupLabels,
    finalMatches: plan.finalMatches,
    bracketTemplate:
      plan.finalStage === "top4_bracket"
        ? {
            name: `${plan.formatLabel} · Eliminatoria`,
            qualifiedTeamCount: 4,
            seedSelectors:
              plan.formatKey === "football_6_groups_top4"
                ? [
                    { mode: "group", groupLabel: "A", rank: 1 },
                    { mode: "group", groupLabel: "B", rank: 2 },
                    { mode: "group", groupLabel: "B", rank: 1 },
                    { mode: "group", groupLabel: "A", rank: 2 },
                  ]
                : plan.formatKey === "court_5_groups_top4"
                  ? [
                      { mode: "group", groupLabel: "A", rank: 1 },
                      { mode: "group", groupLabel: "B", rank: 2 },
                      { mode: "group", groupLabel: "B", rank: 1 },
                      { mode: "group", groupLabel: "A", rank: 2 },
                    ]
                  : [
                      { mode: "group", groupLabel: "A", rank: 1 },
                      { mode: "group", groupLabel: "B", rank: 2 },
                      { mode: "group", groupLabel: "B", rank: 1 },
                      { mode: "group", groupLabel: "A", rank: 2 },
                    ],
            thirdPlaceLabel: plan.formatKey === "court_5_groups_top4" ? null : "3º/4º",
          }
        : null,
    directBracket: plan.directBracket,
  };
}
