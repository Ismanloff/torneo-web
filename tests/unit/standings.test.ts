import { describe, expect, it } from "vitest";

import { buildCategoryStandings, buildGroupedStandings } from "@/lib/standings";
import type { CategoryMatchRow, CategoryRow, ScoringRuleRow, TeamRow } from "@/lib/types";

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "category-standings",
    tournament_id: "tournament-1",
    school_id: "school-1",
    name: "Baloncesto Infantil",
    sport: "Baloncesto",
    school: "Fátima",
    age_group: "11-13 años",
    age_min: 11,
    age_max: 13,
    max_teams: 8,
    current_teams: 4,
    is_active: true,
    created_at: "2026-03-15T10:00:00.000Z",
    updated_at: "2026-03-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeTeam(index: number): TeamRow {
  return {
    id: `team-${index}`,
    category_id: "category-standings",
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
    checked_in_at: null,
    created_at: "2026-03-15T10:00:00.000Z",
    updated_at: "2026-03-15T10:00:00.000Z",
  };
}

function makeMatch(
  id: string,
  overrides: Partial<CategoryMatchRow>,
): CategoryMatchRow {
  return {
    id,
    category_id: "category-standings",
    home_team_id: "team-1",
    away_team_id: "team-2",
    phase: "league",
    group_label: null,
    counts_for_standings: true,
    schedule_run_id: null,
    round_label: "Jornada",
    match_order: 0,
    scheduled_at: null,
    location: null,
    status: "completed",
    home_score: 0,
    away_score: 0,
    notes: null,
    created_at: "2026-03-15T10:00:00.000Z",
    updated_at: "2026-03-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("standings", () => {
  const category = makeCategory();
  const volleyballCategory = makeCategory({
    name: "Voleibol Infantil",
    sport: "Voleibol",
  });
  const teams = [1, 2, 3, 4].map(makeTeam);
  const scoringRule: ScoringRuleRow = {
    category_id: category.id,
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    created_at: "2026-03-15T10:00:00.000Z",
    updated_at: "2026-03-15T10:00:00.000Z",
  };

  it("orders by total points, then goal difference, then goals for", () => {
    const matches: CategoryMatchRow[] = [
      makeMatch("m1", { home_team_id: "team-1", away_team_id: "team-2", home_score: 3, away_score: 0 }),
      makeMatch("m2", { home_team_id: "team-3", away_team_id: "team-4", home_score: 1, away_score: 0 }),
      makeMatch("m3", { home_team_id: "team-1", away_team_id: "team-3", home_score: 0, away_score: 1 }),
      makeMatch("m4", { home_team_id: "team-2", away_team_id: "team-4", home_score: 2, away_score: 0 }),
      makeMatch("m5", {
        home_team_id: "team-1",
        away_team_id: "team-4",
        phase: "placement",
        counts_for_standings: false,
        home_score: 9,
        away_score: 0,
      }),
    ];

    const standings = buildCategoryStandings({
      category,
      teams,
      matches,
      scoringRule,
      adjustments: [],
    });

    expect(standings.map((row) => row.team_id)).toEqual(["team-3", "team-1", "team-2", "team-4"]);
    expect(standings[0]?.total_points).toBe(6);
    expect(standings[0]?.goal_difference).toBe(2);
    expect(standings[1]?.goal_difference).toBe(2);
  });

  it("uses volleyball standings points for 2-0 and 2-1 wins", () => {
    const matches: CategoryMatchRow[] = [
      makeMatch("v1", { home_team_id: "team-1", away_team_id: "team-2", home_score: 2, away_score: 0 }),
      makeMatch("v2", { home_team_id: "team-3", away_team_id: "team-4", home_score: 2, away_score: 1 }),
      makeMatch("v3", { home_team_id: "team-1", away_team_id: "team-3", home_score: 1, away_score: 2 }),
      makeMatch("v4", { home_team_id: "team-2", away_team_id: "team-4", home_score: 2, away_score: 0 }),
    ];

    const standings = buildCategoryStandings({
      category: volleyballCategory,
      teams,
      matches,
      scoringRule,
      adjustments: [],
    });

    expect(standings.map((row) => row.team_id)).toEqual(["team-3", "team-1", "team-2", "team-4"]);
    expect(standings[0]?.total_points).toBe(4);
    expect(standings[1]?.total_points).toBe(4);
    expect(standings[2]?.total_points).toBe(3);
    expect(standings[3]?.total_points).toBe(1);
  });

  it("builds standings per group and ignores placement/friendly matches", () => {
    const matches: CategoryMatchRow[] = [
      makeMatch("g1", {
        home_team_id: "team-1",
        away_team_id: "team-2",
        phase: "group",
        group_label: "A",
        home_score: 2,
        away_score: 1,
      }),
      makeMatch("g2", {
        home_team_id: "team-3",
        away_team_id: "team-4",
        phase: "group",
        group_label: "B",
        home_score: 0,
        away_score: 0,
      }),
      makeMatch("f1", {
        home_team_id: "team-1",
        away_team_id: "team-3",
        phase: "friendly",
        counts_for_standings: false,
        home_score: 8,
        away_score: 0,
      }),
    ];

    const grouped = buildGroupedStandings({
      category: volleyballCategory,
      teams,
      matches,
      scoringRule,
      adjustments: [],
    });

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.groupLabel).toBe("A");
    expect(grouped[0]?.standings.map((row) => row.team_id)).toEqual(["team-1", "team-2"]);
    expect(grouped[1]?.groupLabel).toBe("B");
    expect(grouped[1]?.standings.map((row) => row.team_id)).toEqual(["team-3", "team-4"]);
    expect(grouped[0]?.standings[0]?.goals_for).toBe(2);
    expect(grouped[1]?.standings[0]?.played).toBe(1);
  });
});
