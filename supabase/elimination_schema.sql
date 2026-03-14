create table if not exists public.category_brackets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  format text not null default 'single_elimination'
    check (format in ('single_elimination')),
  qualified_team_count integer not null
    check (qualified_team_count in (2, 4, 8, 16, 32)),
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists category_brackets_active_per_category_idx
  on public.category_brackets(category_id)
  where status in ('draft', 'active');

create table if not exists public.bracket_rounds (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.category_brackets(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bracket_id, round_number)
);

create table if not exists public.bracket_matches (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references public.category_brackets(id) on delete cascade,
  round_id uuid not null references public.bracket_rounds(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  match_number integer not null check (match_number > 0),
  home_team_id uuid references public.teams(id) on delete set null,
  away_team_id uuid references public.teams(id) on delete set null,
  home_source_match_id uuid references public.bracket_matches(id) on delete set null,
  away_source_match_id uuid references public.bracket_matches(id) on delete set null,
  scheduled_at timestamptz,
  location text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  winner_team_id uuid references public.teams(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bracket_id, round_number, match_number),
  constraint bracket_matches_distinct_teams_check
    check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id),
  constraint bracket_matches_distinct_sources_check
    check (
      home_source_match_id is null
      or away_source_match_id is null
      or home_source_match_id <> away_source_match_id
    )
);

create index if not exists bracket_rounds_bracket_idx
  on public.bracket_rounds(bracket_id, round_number);

create index if not exists bracket_matches_bracket_idx
  on public.bracket_matches(bracket_id, round_number, match_number);

create index if not exists bracket_matches_home_source_idx
  on public.bracket_matches(home_source_match_id);

create index if not exists bracket_matches_away_source_idx
  on public.bracket_matches(away_source_match_id);

create or replace function public.validate_bracket_match_teams()
returns trigger
language plpgsql
as $$
declare
  bracket_category_id uuid;
  home_category uuid;
  away_category uuid;
begin
  select category_id into bracket_category_id
  from public.category_brackets
  where id = new.bracket_id;

  if bracket_category_id is null then
    raise exception 'El cuadro no existe';
  end if;

  if new.home_team_id is not null then
    select category_id into home_category
    from public.teams
    where id = new.home_team_id;

    if home_category is distinct from bracket_category_id then
      raise exception 'El equipo local no pertenece a la categoria del cuadro';
    end if;
  end if;

  if new.away_team_id is not null then
    select category_id into away_category
    from public.teams
    where id = new.away_team_id;

    if away_category is distinct from bracket_category_id then
      raise exception 'El equipo visitante no pertenece a la categoria del cuadro';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.compute_bracket_match_winner()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' then
    if new.home_score is null or new.away_score is null then
      raise exception 'El marcador debe estar completo para finalizar el cruce';
    end if;

    if new.home_score = new.away_score then
      raise exception 'En eliminatoria no se permiten empates';
    end if;

    if new.home_team_id is null or new.away_team_id is null then
      raise exception 'Ambos equipos deben estar asignados antes de cerrar el cruce';
    end if;

    if new.home_score > new.away_score then
      new.winner_team_id := new.home_team_id;
    else
      new.winner_team_id := new.away_team_id;
    end if;
  elsif new.status <> 'completed' then
    new.winner_team_id := null;
  end if;

  return new;
end;
$$;

create or replace function public.propagate_bracket_winner()
returns trigger
language plpgsql
as $$
begin
  update public.bracket_matches
  set home_team_id = new.winner_team_id,
      updated_at = now()
  where home_source_match_id = new.id
    and status <> 'completed';

  update public.bracket_matches
  set away_team_id = new.winner_team_id,
      updated_at = now()
  where away_source_match_id = new.id
    and status <> 'completed';

  if not exists (
    select 1
    from public.bracket_matches
    where bracket_id = new.bracket_id
      and status <> 'completed'
  ) then
    update public.category_brackets
    set status = 'completed',
        updated_at = now()
    where id = new.bracket_id;
  else
    update public.category_brackets
    set updated_at = now()
    where id = new.bracket_id;
  end if;

  return null;
end;
$$;

drop trigger if exists category_brackets_set_updated_at on public.category_brackets;
create trigger category_brackets_set_updated_at
before update on public.category_brackets
for each row
execute function public.scoring_set_updated_at();

drop trigger if exists bracket_rounds_set_updated_at on public.bracket_rounds;
create trigger bracket_rounds_set_updated_at
before update on public.bracket_rounds
for each row
execute function public.scoring_set_updated_at();

drop trigger if exists bracket_matches_set_updated_at on public.bracket_matches;
create trigger bracket_matches_set_updated_at
before update on public.bracket_matches
for each row
execute function public.scoring_set_updated_at();

drop trigger if exists bracket_matches_validate_teams on public.bracket_matches;
create trigger bracket_matches_validate_teams
before insert or update on public.bracket_matches
for each row
execute function public.validate_bracket_match_teams();

drop trigger if exists bracket_matches_compute_winner on public.bracket_matches;
create trigger bracket_matches_compute_winner
before insert or update on public.bracket_matches
for each row
execute function public.compute_bracket_match_winner();

drop trigger if exists bracket_matches_propagate_winner on public.bracket_matches;
create trigger bracket_matches_propagate_winner
after insert or update of status, home_score, away_score, winner_team_id on public.bracket_matches
for each row
execute function public.propagate_bracket_winner();
