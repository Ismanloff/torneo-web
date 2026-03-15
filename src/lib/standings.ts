import type {
  CategoryMatchRow,
  CategoryRow,
  CategoryStandingRow,
  GroupLabel,
  ScoringRuleRow,
  TeamRow,
  TeamScoreAdjustmentRow,
} from "@/lib/types";

type BuildStandingsInput = {
  category: CategoryRow;
  teams: TeamRow[];
  matches: CategoryMatchRow[];
  scoringRule: ScoringRuleRow | null;
  adjustments: TeamScoreAdjustmentRow[];
  groupLabel?: GroupLabel;
};

function compareStandings(left: CategoryStandingRow, right: CategoryStandingRow) {
  if (right.total_points !== left.total_points) {
    return right.total_points - left.total_points;
  }

  if (right.goal_difference !== left.goal_difference) {
    return right.goal_difference - left.goal_difference;
  }

  if (right.goals_for !== left.goals_for) {
    return right.goals_for - left.goals_for;
  }

  return left.team_name.localeCompare(right.team_name, "es");
}

export function buildCategoryStandings({
  category,
  teams,
  matches,
  scoringRule,
  adjustments,
  groupLabel,
}: BuildStandingsInput): CategoryStandingRow[] {
  const pointsWin = scoringRule?.points_win ?? 3;
  const pointsDraw = scoringRule?.points_draw ?? 1;
  const pointsLoss = scoringRule?.points_loss ?? 0;
  const groupTeamIds = new Set<string>();

  const relevantMatches = matches.filter((match) => {
    if (!match.counts_for_standings || match.status !== "completed") {
      return false;
    }

    if (groupLabel) {
      return match.group_label === groupLabel;
    }

    return true;
  });

  if (groupLabel) {
    for (const match of matches) {
      if (match.group_label !== groupLabel) {
        continue;
      }

      groupTeamIds.add(match.home_team_id);
      groupTeamIds.add(match.away_team_id);
    }
  }

  const adjustmentByTeam = new Map<string, number>();

  for (const adjustment of adjustments) {
    adjustmentByTeam.set(
      adjustment.team_id,
      (adjustmentByTeam.get(adjustment.team_id) ?? 0) + adjustment.points_delta,
    );
  }

  const rows = new Map<string, CategoryStandingRow>();
  const relevantTeams = teams.filter((team) => !groupLabel || groupTeamIds.has(team.id));

  for (const team of relevantTeams) {
    rows.set(team.id, {
      category_id: category.id,
      tournament_id: category.tournament_id,
      category_name: category.name,
      sport: category.sport,
      school: category.school,
      age_group: category.age_group,
      team_id: team.id,
      registration_code: team.registration_code,
      team_name: team.team_name,
      captain_name: team.captain_name,
      registration_status: team.status,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      adjustment_points: adjustmentByTeam.get(team.id) ?? 0,
      total_points: adjustmentByTeam.get(team.id) ?? 0,
    });
  }

  for (const match of relevantMatches) {
    const home = rows.get(match.home_team_id);
    const away = rows.get(match.away_team_id);

    if (!home || !away || match.home_score === null || match.away_score === null) {
      continue;
    }

    home.played += 1;
    home.goals_for += match.home_score;
    home.goals_against += match.away_score;

    away.played += 1;
    away.goals_for += match.away_score;
    away.goals_against += match.home_score;

    if (match.home_score > match.away_score) {
      home.wins += 1;
      away.losses += 1;
    } else if (match.home_score < match.away_score) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
    }
  }

  return [...rows.values()]
    .map((row) => {
      const totalPoints =
        row.wins * pointsWin +
        row.draws * pointsDraw +
        row.losses * pointsLoss +
        row.adjustment_points;

      return {
        ...row,
        goal_difference: row.goals_for - row.goals_against,
        total_points: totalPoints,
      };
    })
    .sort(compareStandings);
}

export function buildGroupedStandings(input: Omit<BuildStandingsInput, "groupLabel">) {
  const labels = [...new Set(
    input.matches
      .filter((match) => match.counts_for_standings && match.group_label)
      .map((match) => match.group_label as GroupLabel),
  )].sort();

  return labels.map((groupLabel) => ({
    groupLabel,
    standings: buildCategoryStandings({
      ...input,
      groupLabel,
    }),
  }));
}
