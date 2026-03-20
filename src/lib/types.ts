export type StaffRole = "superadmin" | "admin" | "referee" | "assistant";
export type StaffDuty = "referee" | "assistant";
export type MatchScope = "category_match" | "bracket_match";
export type CheckinStatus = "pendiente" | "presentado" | "incidencia" | "no_presentado";
export type CategoryMatchPhase = "group" | "league" | "placement" | "friendly";
export type ScheduleRunStage = "initial" | "final";
export type FinalStageType = "none" | "top2_final" | "top4_bracket";
export type RankSourceMode = "overall" | "group";
export type GroupLabel = "A" | "B";

export type TournamentRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  tournament_id: string;
  school_id: string | null;
  name: string;
  sport: string;
  school: string | null;
  age_group: string;
  age_min: number;
  age_max: number;
  max_teams: number;
  current_teams: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryOperationalSettingsRow = {
  category_id: string;
  match_minutes: number;
  turnover_minutes: number;
  venue_count: number;
  window_start: string;
  window_end: string;
  created_at: string;
  updated_at: string;
};

export type TeamRow = {
  id: string;
  category_id: string;
  team_name: string;
  captain_name: string;
  captain_phone: string;
  captain_email: string;
  total_players: number;
  registration_code: string;
  status: string;
  gdpr_consent: boolean;
  regulation_accepted: boolean;
  parental_confirmation_required: boolean;
  parental_confirmed_at: string | null;
  notes: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamStatusRow = TeamRow;

export type SchoolRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConfirmationRow = {
  id: string;
  team_id: string;
  token: string;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  child_name: string;
  status: string;
  expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export type ScoringRuleRow = {
  category_id: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
  created_at: string;
  updated_at: string;
};

export type CategoryMatchRow = {
  id: string;
  category_id: string;
  home_team_id: string;
  away_team_id: string;
  phase: CategoryMatchPhase;
  group_label: GroupLabel | null;
  counts_for_standings: boolean;
  schedule_run_id: string | null;
  round_label: string | null;
  match_order: number;
  scheduled_at: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryStandingRow = {
  category_id: string;
  tournament_id: string;
  category_name: string;
  sport: string;
  school: string | null;
  age_group: string;
  team_id: string;
  registration_code: string;
  team_name: string;
  captain_name: string;
  registration_status: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  adjustment_points: number;
  total_points: number;
};

export type RankSelector = {
  mode: RankSourceMode;
  rank: number;
  groupLabel?: GroupLabel;
};

export type PlacementTemplate = {
  label: string;
  home: RankSelector;
  away: RankSelector;
};

export type BracketTemplate = {
  name: string;
  qualifiedTeamCount: number;
  seedSelectors: RankSelector[];
  thirdPlaceLabel: string | null;
};

export type ScheduleRunMeta = {
  initialStage: "league" | "group" | "bracket";
  finalStage: FinalStageType;
  groupLabels: GroupLabel[];
  finalMatches: PlacementTemplate[];
  bracketTemplate: BracketTemplate | null;
  directBracket: boolean;
};

export type OperationalCapacitySummary = {
  slotMinutes: number;
  totalWindowMinutes: number;
  slotsPerVenue: number;
  venueCount: number;
  maxMatches: number;
};

export type CategoryScheduleRunRow = {
  id: string;
  category_id: string;
  stage: ScheduleRunStage;
  format_key: string;
  format_label: string;
  status: "generated" | "cancelled";
  snapshot_at: string;
  snapshot_cutoff: string;
  present_team_ids: string[];
  minimum_matches_per_team: number;
  total_matches_planned: number;
  official_placement: boolean;
  capacity_summary: OperationalCapacitySummary;
  warnings: string[];
  meta: ScheduleRunMeta;
  generated_from_run_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamScoreAdjustmentRow = {
  id: string;
  category_id: string;
  team_id: string;
  points_delta: number;
  note: string;
  created_at: string;
  updated_at: string;
};

export type CategoryBracketRow = {
  id: string;
  category_id: string;
  name: string;
  format: "single_elimination";
  qualified_team_count: number;
  status: "draft" | "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type BracketRoundRow = {
  id: string;
  bracket_id: string;
  round_number: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type BracketMatchRow = {
  id: string;
  bracket_id: string;
  round_id: string;
  round_number: number;
  match_number: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_source_match_id: string | null;
  away_source_match_id: string | null;
  scheduled_at: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffProfileRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: StaffRole;
  pin: string | null;
  pin_hash: string | null;
  pin_last_four: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffAssignmentRow = {
  id: string;
  staff_user_id: string;
  tournament_id: string;
  duty: StaffDuty;
  category_id: string | null;
  category_match_id: string | null;
  bracket_match_id: string | null;
  location_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamCheckinRow = {
  id: string;
  match_scope: MatchScope;
  match_id: string;
  team_id: string;
  status: CheckinStatus;
  incident_label: string | null;
  notes: string | null;
  checked_in_by_user_id: string | null;
  checked_in_at: string;
  created_at: string;
  updated_at: string;
};

export type MatchResultAuditRow = {
  id: string;
  match_scope: MatchScope;
  match_id: string;
  actor_user_id: string | null;
  actor_role: StaffRole | null;
  previous_status: string | null;
  new_status: string | null;
  previous_home_score: number | null;
  previous_away_score: number | null;
  new_home_score: number | null;
  new_away_score: number | null;
  notes: string | null;
  created_at: string;
};

export type MatchQrTokenRow = {
  id: string;
  token: string;
  resource_type: MatchScope | "team";
  resource_id: string;
  created_by_user_id: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryCardData = {
  id: string;
  name: string;
  sport: string;
  ageGroup: string;
  ageMin: number;
  ageMax: number;
  maxTeams: number;
  registeredTeams: number;
  remainingSlots: number;
  isActive: boolean;
};

export type CategoryGroup = {
  sport: string;
  categories: CategoryCardData[];
};

export type TeamSummary = Pick<TeamRow, "id" | "team_name" | "registration_code">;
export type StaffSummary = Pick<StaffProfileRow, "auth_user_id" | "email" | "full_name" | "role">;

export type EnrichedTeamCheckin = TeamCheckinRow & {
  recorded_by: StaffSummary | null;
};

export type EnrichedCategoryMatch = CategoryMatchRow & {
  scope: "category_match";
  home_team: TeamSummary;
  away_team: TeamSummary;
  referee_assignment: StaffSummary | null;
  assistant_assignment: StaffSummary | null;
  home_checkin: EnrichedTeamCheckin | null;
  away_checkin: EnrichedTeamCheckin | null;
  qr_token: MatchQrTokenRow | null;
};

export type EnrichedBracketMatch = BracketMatchRow & {
  scope: "bracket_match";
  home_team: TeamSummary | null;
  away_team: TeamSummary | null;
  winner_team: TeamSummary | null;
  referee_assignment: StaffSummary | null;
  assistant_assignment: StaffSummary | null;
  home_checkin: EnrichedTeamCheckin | null;
  away_checkin: EnrichedTeamCheckin | null;
  qr_token: MatchQrTokenRow | null;
};

export type ScoreboardCategory = {
  category: CategoryRow;
  category_referee_assignment: StaffSummary | null;
  category_assistant_assignment: StaffSummary | null;
  operationalSettings: CategoryOperationalSettingsRow | null;
  scheduleRuns: CategoryScheduleRunRow[];
  teams: (TeamRow & { qr_token: MatchQrTokenRow | null })[];
  standings: CategoryStandingRow[];
  groupStandings: Array<{
    groupLabel: GroupLabel;
    standings: CategoryStandingRow[];
  }>;
  matches: EnrichedCategoryMatch[];
  adjustments: Array<
    TeamScoreAdjustmentRow & {
      team: TeamSummary;
    }
  >;
  bracket: {
    bracket: CategoryBracketRow;
    rounds: Array<{
      round: BracketRoundRow;
      matches: EnrichedBracketMatch[];
    }>;
  } | null;
  scoringRule: ScoringRuleRow | null;
};

export type ScoreboardHomeData = {
  tournament: TournamentRow;
  totalTeams: number;
  totalMatches: number;
  categories: ScoreboardCategory[];
};

export type StaffContext = {
  authUserId: string | null;
  profile: StaffProfileRow;
};

export type OperationalMatchSummary = {
  scope: MatchScope;
  matchId: string;
  categoryId: string;
  categoryName: string;
  sport: string;
  ageGroup: string;
  location: string | null;
  scheduledAt: string | null;
  status: string;
  homeTeam: TeamSummary | null;
  awayTeam: TeamSummary | null;
  duty: StaffDuty | "admin";
  qrToken: string | null;
};

export type OperationalDashboardData = {
  tournament: TournamentRow;
  staff: StaffProfileRow;
  assignedMatches: OperationalMatchSummary[];
  teams: (TeamRow & { category: CategoryRow })[];
};

export type AdminArrivalLogEntry = {
  teamId: string;
  teamName: string;
  registrationCode: string;
  categoryId: string;
  categoryName: string;
  sport: string;
  checkedInAt: string;
};

export type AdminMatchCheckinLogEntry = {
  key: string;
  teamId: string;
  teamName: string;
  registrationCode: string;
  matchId: string;
  matchScope: MatchScope;
  matchLabel: string;
  categoryId: string;
  categoryName: string;
  status: CheckinStatus;
  incidentLabel: string | null;
  checkedInAt: string;
  recordedByName: string | null;
};
