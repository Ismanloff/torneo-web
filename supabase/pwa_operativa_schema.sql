create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('superadmin', 'admin', 'referee', 'assistant')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  duty text not null check (duty in ('referee', 'assistant')),
  category_id uuid references public.categories(id) on delete cascade,
  category_match_id uuid references public.category_matches(id) on delete cascade,
  bracket_match_id uuid references public.bracket_matches(id) on delete cascade,
  location_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_assignments_target_check check (
    category_id is not null
    or category_match_id is not null
    or bracket_match_id is not null
    or location_label is not null
  ),
  constraint staff_assignments_scope_check check (
    not (category_match_id is not null and bracket_match_id is not null)
  )
);

create unique index if not exists staff_assignments_category_match_duty_idx
  on public.staff_assignments(category_match_id, duty)
  where category_match_id is not null;

create unique index if not exists staff_assignments_bracket_match_duty_idx
  on public.staff_assignments(bracket_match_id, duty)
  where bracket_match_id is not null;

create index if not exists staff_assignments_staff_idx
  on public.staff_assignments(staff_user_id, starts_at);

create table if not exists public.team_checkins (
  id uuid primary key default gen_random_uuid(),
  match_scope text not null check (match_scope in ('category_match', 'bracket_match')),
  match_id uuid not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null check (status in ('pendiente', 'presentado', 'incidencia', 'no_presentado')),
  incident_label text,
  notes text,
  checked_in_by_user_id uuid references auth.users(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_scope, match_id, team_id)
);

create index if not exists team_checkins_match_idx
  on public.team_checkins(match_scope, match_id);

create table if not exists public.match_result_audit (
  id uuid primary key default gen_random_uuid(),
  match_scope text not null check (match_scope in ('category_match', 'bracket_match')),
  match_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text check (actor_role in ('superadmin', 'admin', 'referee', 'assistant')),
  previous_status text,
  new_status text,
  previous_home_score integer,
  previous_away_score integer,
  new_home_score integer,
  new_away_score integer,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists match_result_audit_match_idx
  on public.match_result_audit(match_scope, match_id, created_at desc);

create table if not exists public.match_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  resource_type text not null check (resource_type in ('category_match', 'bracket_match', 'team')),
  resource_id uuid not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists match_qr_tokens_active_resource_idx
  on public.match_qr_tokens(resource_type, resource_id)
  where is_active = true;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select sp.role
  from public.staff_profiles sp
  where sp.auth_user_id = auth.uid()
    and sp.is_active = true
  limit 1;
$$;

create or replace function public.is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() in ('superadmin', 'admin'), false);
$$;

create or replace function public.can_access_category_match(target_match_id uuid, required_duty text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_staff_admin()
    or exists (
      select 1
      from public.staff_assignments sa
      join public.staff_profiles sp
        on sp.auth_user_id = sa.staff_user_id
       and sp.is_active = true
      left join public.category_matches cm
        on cm.id = target_match_id
      where (
          sa.category_match_id = target_match_id
          or (
            sa.category_id = cm.category_id
            and sa.category_match_id is null
            and sa.bracket_match_id is null
          )
        )
        and sa.staff_user_id = auth.uid()
        and (required_duty is null or sa.duty = required_duty)
    );
$$;

create or replace function public.can_access_bracket_match(target_match_id uuid, required_duty text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_staff_admin()
    or exists (
      select 1
      from public.staff_assignments sa
      join public.staff_profiles sp
        on sp.auth_user_id = sa.staff_user_id
       and sp.is_active = true
      left join public.bracket_matches bm
        on bm.id = target_match_id
      left join public.category_brackets cb
        on cb.id = bm.bracket_id
      where (
          sa.bracket_match_id = target_match_id
          or (
            sa.category_id = cb.category_id
            and sa.category_match_id is null
            and sa.bracket_match_id is null
          )
        )
        and sa.staff_user_id = auth.uid()
        and (required_duty is null or sa.duty = required_duty)
    );
$$;

create or replace function public.can_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_staff_admin()
    or exists (
      select 1
      from public.staff_assignments sa
      left join public.category_matches cm
        on cm.id = sa.category_match_id
      left join public.bracket_matches bm
        on bm.id = sa.bracket_match_id
      left join public.category_matches category_matches_by_category
        on category_matches_by_category.category_id = sa.category_id
      left join public.bracket_matches bracket_matches_by_category
        on bracket_matches_by_category.bracket_id in (
          select cb.id
          from public.category_brackets cb
          where cb.category_id = sa.category_id
        )
      where sa.staff_user_id = auth.uid()
        and (
          cm.home_team_id = target_team_id
          or cm.away_team_id = target_team_id
          or bm.home_team_id = target_team_id
          or bm.away_team_id = target_team_id
          or category_matches_by_category.home_team_id = target_team_id
          or category_matches_by_category.away_team_id = target_team_id
          or bracket_matches_by_category.home_team_id = target_team_id
          or bracket_matches_by_category.away_team_id = target_team_id
        )
    );
$$;

drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row
execute function public.update_updated_at_column();

drop trigger if exists staff_assignments_set_updated_at on public.staff_assignments;
create trigger staff_assignments_set_updated_at
before update on public.staff_assignments
for each row
execute function public.update_updated_at_column();

drop trigger if exists team_checkins_set_updated_at on public.team_checkins;
create trigger team_checkins_set_updated_at
before update on public.team_checkins
for each row
execute function public.update_updated_at_column();

drop trigger if exists match_qr_tokens_set_updated_at on public.match_qr_tokens;
create trigger match_qr_tokens_set_updated_at
before update on public.match_qr_tokens
for each row
execute function public.update_updated_at_column();

alter table public.staff_profiles enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.team_checkins enable row level security;
alter table public.match_result_audit enable row level security;
alter table public.match_qr_tokens enable row level security;
alter table public.category_scoring_rules enable row level security;
alter table public.category_matches enable row level security;
alter table public.category_brackets enable row level security;
alter table public.bracket_rounds enable row level security;
alter table public.bracket_matches enable row level security;

do $$
declare
  record_item record;
begin
  for record_item in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'staff_profiles',
        'staff_assignments',
        'team_checkins',
        'match_result_audit',
        'match_qr_tokens',
        'category_scoring_rules',
        'category_matches',
        'category_brackets',
        'bracket_rounds',
        'bracket_matches'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      record_item.policyname,
      record_item.schemaname,
      record_item.tablename
    );
  end loop;
end
$$;

create policy "public_read_category_scoring_rules"
on public.category_scoring_rules
for select
to anon, authenticated
using (true);

create policy "public_read_category_matches"
on public.category_matches
for select
to anon, authenticated
using (true);

create policy "referee_update_category_matches"
on public.category_matches
for update
to authenticated
using (public.can_access_category_match(id, 'referee'))
with check (public.can_access_category_match(id, 'referee'));

create policy "public_read_category_brackets"
on public.category_brackets
for select
to anon, authenticated
using (true);

create policy "public_read_bracket_rounds"
on public.bracket_rounds
for select
to anon, authenticated
using (true);

create policy "public_read_bracket_matches"
on public.bracket_matches
for select
to anon, authenticated
using (true);

create policy "referee_update_bracket_matches"
on public.bracket_matches
for update
to authenticated
using (public.can_access_bracket_match(id, 'referee'))
with check (public.can_access_bracket_match(id, 'referee'));

create policy "staff_read_own_profile"
on public.staff_profiles
for select
to authenticated
using (auth.uid() = auth_user_id or public.is_staff_admin());

create policy "admin_manage_staff_profiles"
on public.staff_profiles
for all
to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

create policy "staff_read_own_assignments"
on public.staff_assignments
for select
to authenticated
using (staff_user_id = auth.uid() or public.is_staff_admin());

create policy "admin_manage_staff_assignments"
on public.staff_assignments
for all
to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

create policy "staff_read_team_checkins"
on public.team_checkins
for select
to authenticated
using (
  public.is_staff_admin()
  or (match_scope = 'category_match' and public.can_access_category_match(match_id))
  or (match_scope = 'bracket_match' and public.can_access_bracket_match(match_id))
);

create policy "public_read_team_checkins"
on public.team_checkins
for select
to anon
using (true);

create policy "assistant_manage_team_checkins"
on public.team_checkins
for insert
to authenticated
with check (
  public.is_staff_admin()
  or (match_scope = 'category_match' and public.can_access_category_match(match_id, 'assistant'))
  or (match_scope = 'bracket_match' and public.can_access_bracket_match(match_id, 'assistant'))
);

create policy "assistant_update_team_checkins"
on public.team_checkins
for update
to authenticated
using (
  public.is_staff_admin()
  or (match_scope = 'category_match' and public.can_access_category_match(match_id, 'assistant'))
  or (match_scope = 'bracket_match' and public.can_access_bracket_match(match_id, 'assistant'))
)
with check (
  public.is_staff_admin()
  or (match_scope = 'category_match' and public.can_access_category_match(match_id, 'assistant'))
  or (match_scope = 'bracket_match' and public.can_access_bracket_match(match_id, 'assistant'))
);

create policy "admin_read_audit"
on public.match_result_audit
for select
to authenticated
using (public.is_staff_admin());

create policy "admin_insert_audit"
on public.match_result_audit
for insert
to authenticated
with check (public.is_staff_admin());

create policy "admin_manage_qr_tokens"
on public.match_qr_tokens
for all
to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

grant select on public.category_scoring_rules to anon, authenticated;
grant select on public.category_matches to anon, authenticated;
grant select on public.category_brackets to anon, authenticated;
grant select on public.bracket_rounds to anon, authenticated;
grant select on public.bracket_matches to anon, authenticated;
grant select on public.staff_profiles to authenticated;
grant select on public.staff_assignments to authenticated;
grant select on public.team_checkins to anon, authenticated;
grant insert, update on public.team_checkins to authenticated;
grant select on public.match_result_audit to authenticated;
grant select on public.match_qr_tokens to authenticated;

alter table public.category_matches replica identity full;
alter table public.bracket_matches replica identity full;
alter table public.category_brackets replica identity full;
alter table public.team_checkins replica identity full;
alter table public.staff_assignments replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'category_matches'
  ) then
    alter publication supabase_realtime add table public.category_matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bracket_matches'
  ) then
    alter publication supabase_realtime add table public.bracket_matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'category_brackets'
  ) then
    alter publication supabase_realtime add table public.category_brackets;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_checkins'
  ) then
    alter publication supabase_realtime add table public.team_checkins;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_assignments'
  ) then
    alter publication supabase_realtime add table public.staff_assignments;
  end if;
end
$$;
