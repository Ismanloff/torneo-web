create extension if not exists pgcrypto;

create table if not exists public.category_scoring_rules (
  category_id uuid primary key references public.categories(id) on delete cascade,
  points_win integer not null default 3 check (points_win between 0 and 20),
  points_draw integer not null default 1 check (points_draw between 0 and 20),
  points_loss integer not null default 0 check (points_loss between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.category_matches (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  round_label text,
  match_order integer not null default 0,
  scheduled_at timestamptz,
  location text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_matches_distinct_teams_check check (home_team_id <> away_team_id),
  constraint category_matches_completed_scores_check check (
    (status = 'completed' and home_score is not null and away_score is not null)
    or (status <> 'completed')
  )
);

create table if not exists public.team_score_adjustments (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  points_delta integer not null,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists category_matches_category_idx
  on public.category_matches(category_id, scheduled_at, match_order);

create index if not exists category_matches_home_team_idx
  on public.category_matches(home_team_id);

create index if not exists category_matches_away_team_idx
  on public.category_matches(away_team_id);

create index if not exists team_score_adjustments_category_team_idx
  on public.team_score_adjustments(category_id, team_id, created_at desc);

create or replace function public.scoring_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_category_match_teams()
returns trigger
language plpgsql
as $$
declare
  home_category uuid;
  away_category uuid;
begin
  select category_id into home_category
  from public.teams
  where id = new.home_team_id;

  select category_id into away_category
  from public.teams
  where id = new.away_team_id;

  if home_category is null or away_category is null then
    raise exception 'Los equipos del partido no existen';
  end if;

  if home_category <> new.category_id or away_category <> new.category_id then
    raise exception 'Los equipos deben pertenecer a la categoria del partido';
  end if;

  return new;
end;
$$;

drop trigger if exists category_scoring_rules_set_updated_at on public.category_scoring_rules;
create trigger category_scoring_rules_set_updated_at
before update on public.category_scoring_rules
for each row
execute function public.scoring_set_updated_at();

drop trigger if exists category_matches_set_updated_at on public.category_matches;
create trigger category_matches_set_updated_at
before update on public.category_matches
for each row
execute function public.scoring_set_updated_at();

drop trigger if exists team_score_adjustments_set_updated_at on public.team_score_adjustments;
create trigger team_score_adjustments_set_updated_at
before update on public.team_score_adjustments
for each row
execute function public.scoring_set_updated_at();

drop trigger if exists category_matches_validate_teams on public.category_matches;
create trigger category_matches_validate_teams
before insert or update on public.category_matches
for each row
execute function public.validate_category_match_teams();

insert into public.category_scoring_rules (category_id)
select id
from public.categories
on conflict (category_id) do nothing;

create or replace view public.category_standings as
with rules as (
  select
    c.id as category_id,
    coalesce(r.points_win, 3) as points_win,
    coalesce(r.points_draw, 1) as points_draw,
    coalesce(r.points_loss, 0) as points_loss
  from public.categories c
  left join public.category_scoring_rules r
    on r.category_id = c.id
),
completed_match_rows as (
  select
    m.category_id,
    m.home_team_id as team_id,
    m.home_score as goals_for,
    m.away_score as goals_against,
    case when m.home_score > m.away_score then 1 else 0 end as wins,
    case when m.home_score = m.away_score then 1 else 0 end as draws,
    case when m.home_score < m.away_score then 1 else 0 end as losses
  from public.category_matches m
  where m.status = 'completed'

  union all

  select
    m.category_id,
    m.away_team_id as team_id,
    m.away_score as goals_for,
    m.home_score as goals_against,
    case when m.away_score > m.home_score then 1 else 0 end as wins,
    case when m.away_score = m.home_score then 1 else 0 end as draws,
    case when m.away_score < m.home_score then 1 else 0 end as losses
  from public.category_matches m
  where m.status = 'completed'
),
match_totals as (
  select
    cmr.category_id,
    cmr.team_id,
    count(*)::integer as played,
    sum(cmr.wins)::integer as wins,
    sum(cmr.draws)::integer as draws,
    sum(cmr.losses)::integer as losses,
    sum(cmr.goals_for)::integer as goals_for,
    sum(cmr.goals_against)::integer as goals_against
  from completed_match_rows cmr
  group by cmr.category_id, cmr.team_id
),
adjustment_totals as (
  select
    tsa.category_id,
    tsa.team_id,
    coalesce(sum(tsa.points_delta), 0)::integer as adjustment_points
  from public.team_score_adjustments tsa
  group by tsa.category_id, tsa.team_id
)
select
  c.id as category_id,
  c.tournament_id,
  c.name as category_name,
  c.sport,
  c.school,
  c.age_group,
  t.id as team_id,
  t.registration_code,
  t.team_name,
  t.captain_name,
  t.status as registration_status,
  coalesce(mt.played, 0) as played,
  coalesce(mt.wins, 0) as wins,
  coalesce(mt.draws, 0) as draws,
  coalesce(mt.losses, 0) as losses,
  coalesce(mt.goals_for, 0) as goals_for,
  coalesce(mt.goals_against, 0) as goals_against,
  coalesce(mt.goals_for, 0) - coalesce(mt.goals_against, 0) as goal_difference,
  coalesce(at.adjustment_points, 0) as adjustment_points,
  (
    coalesce(mt.wins, 0) * r.points_win
    + coalesce(mt.draws, 0) * r.points_draw
    + coalesce(mt.losses, 0) * r.points_loss
    + coalesce(at.adjustment_points, 0)
  )::integer as total_points
from public.categories c
join public.teams t
  on t.category_id = c.id
join rules r
  on r.category_id = c.id
left join match_totals mt
  on mt.category_id = c.id
 and mt.team_id = t.id
left join adjustment_totals at
  on at.category_id = c.id
 and at.team_id = t.id
where c.is_active = true
  and t.status <> 'cancelled';
