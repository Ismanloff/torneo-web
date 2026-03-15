import { describe, expect, it } from "vitest";

import {
  buildFinalStagePlan,
  buildInitialMetaFromPlan,
  buildInitialOperationalPlan,
  computeOperationalCapacity,
  getDefaultOperationalSettings,
} from "@/lib/operational-scheduling";
import type { CategoryRow, CategoryScheduleRunRow, TeamRow } from "@/lib/types";

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "category-1",
    tournament_id: "tournament-1",
    school_id: "school-1",
    name: "Fútbol Cadete",
    sport: "Fútbol",
    school: "Mater",
    age_group: "14-17 años",
    age_min: 14,
    age_max: 17,
    max_teams: 8,
    current_teams: 0,
    is_active: true,
    created_at: "2026-03-15T10:00:00.000Z",
    updated_at: "2026-03-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeTeam(index: number, categoryId = "category-1"): TeamRow {
  return {
    id: `team-${index}`,
    category_id: categoryId,
    team_name: `Equipo ${index}`,
    captain_name: `Capitán ${index}`,
    captain_phone: "600000000",
    captain_email: `team${index}@example.com`,
    total_players: 8,
    registration_code: `TEAM-${index}`,
    status: "confirmed",
    gdpr_consent: true,
    regulation_accepted: true,
    parental_confirmation_required: false,
    parental_confirmed_at: null,
    notes: null,
    checked_in_at: `2026-04-18T10:${String(index).padStart(2, "0")}:00.000Z`,
    created_at: `2026-03-15T10:${String(index).padStart(2, "0")}:00.000Z`,
    updated_at: `2026-03-15T10:${String(index).padStart(2, "0")}:00.000Z`,
  };
}

describe("operational scheduling", () => {
  it("computes football capacity with two venues between 11:00 and 14:00", () => {
    const settings = getDefaultOperationalSettings(makeCategory());
    const capacity = computeOperationalCapacity(settings);

    expect(capacity.slotMinutes).toBe(25);
    expect(capacity.slotsPerVenue).toBe(7);
    expect(capacity.maxMatches).toBe(14);
  });

  it("builds the expected initial plan for football with 6 present teams", () => {
    const category = makeCategory();
    const teams = Array.from({ length: 6 }, (_, index) => makeTeam(index + 1));
    const plan = buildInitialOperationalPlan({
      category,
      eventDate: "2026-04-18",
      presentTeams: teams,
      settings: getDefaultOperationalSettings(category),
    });

    expect(plan.formatKey).toBe("football_6_groups_top4");
    expect(plan.initialStage).toBe("group");
    expect(plan.finalStage).toBe("top4_bracket");
    expect(plan.generatedMatches).toHaveLength(6);
    expect(plan.totalMatchesPlanned).toBe(10);
    expect(plan.groupLabels).toEqual(["A", "B"]);
  });

  it("builds a direct bracket for court sports with 7 present teams", () => {
    const category = makeCategory({
      id: "category-basket",
      name: "Baloncesto Infantil",
      sport: "Baloncesto",
      age_group: "11-13 años",
      school: "Fátima",
    });
    const teams = Array.from({ length: 7 }, (_, index) => makeTeam(index + 1, category.id));
    const plan = buildInitialOperationalPlan({
      category,
      eventDate: "2026-04-18",
      presentTeams: teams,
      settings: getDefaultOperationalSettings(category),
    });

    expect(plan.initialStage).toBe("bracket");
    expect(plan.directBracket).toBe(true);
    expect(plan.bracketPlan?.qualifiedTeamCount).toBe(8);
    expect(plan.bracketPlan?.actualPlayedMatches).toBe(7);
    expect(plan.warnings.some((warning) => warning.includes("bye"))).toBe(true);
  });

  it("builds the expected final stage plan from group standings", () => {
    const category = makeCategory();
    const teams = Array.from({ length: 6 }, (_, index) => makeTeam(index + 1));
    const initialPlan = buildInitialOperationalPlan({
      category,
      eventDate: "2026-04-18",
      presentTeams: teams,
      settings: getDefaultOperationalSettings(category),
    });
    const initialRun: CategoryScheduleRunRow = {
      id: "run-1",
      category_id: category.id,
      stage: "initial",
      format_key: initialPlan.formatKey,
      format_label: initialPlan.formatLabel,
      status: "generated",
      snapshot_at: "2026-04-18T10:50:00.000Z",
      snapshot_cutoff: "2026-04-18T10:50:00.000Z",
      present_team_ids: teams.map((team) => team.id),
      minimum_matches_per_team: initialPlan.minimumMatchesPerTeam,
      total_matches_planned: initialPlan.totalMatchesPlanned,
      official_placement: initialPlan.officialPlacement,
      capacity_summary: initialPlan.capacity,
      warnings: initialPlan.warnings,
      meta: buildInitialMetaFromPlan(initialPlan),
      generated_from_run_id: null,
      created_at: "2026-04-18T10:50:00.000Z",
      updated_at: "2026-04-18T10:50:00.000Z",
    };

    const finalPlan = buildFinalStagePlan({
      category,
      eventDate: "2026-04-18",
      settings: getDefaultOperationalSettings(category),
      teams,
      standingsByGroup: {
        A: ["team-1", "team-2", "team-3"],
        B: ["team-4", "team-5", "team-6"],
      },
      overallStandings: ["team-1", "team-4", "team-2", "team-5", "team-3", "team-6"],
      previousRun: initialRun,
    });

    expect(finalPlan.stage).toBe("final");
    expect(finalPlan.generatedMatches).toHaveLength(1);
    expect(finalPlan.generatedMatches[0]?.roundLabel).toBe("5º/6º");
    expect(finalPlan.bracketPlan?.qualifiedTeamCount).toBe(4);
    expect(finalPlan.bracketPlan?.seededTeamIds).toEqual(["team-1", "team-5", "team-4", "team-2"]);
  });
});
