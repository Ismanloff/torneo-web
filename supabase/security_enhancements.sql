-- Security and performance enhancements
-- Apply this file after the initial schema migrations
-- Safe to run multiple times (idempotent)
-- Generated: 2026-03-17

-- ============================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================

-- Teams by category and status (used in inscripcion/actions.ts and queries.ts)
create index if not exists teams_category_status_idx
  on public.teams(category_id, status)
  where status <> 'cancelled';

-- Staff profiles lookup by auth_user_id (used in sync-score route)
create index if not exists staff_profiles_auth_user_idx
  on public.staff_profiles(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists staff_profiles_pin_hash_idx
  on public.staff_profiles(pin_hash)
  where pin_hash is not null;

create index if not exists staff_login_attempts_locked_until_idx
  on public.staff_login_attempts(locked_until);

-- QR tokens lookup by resource (used in q/[token]/route.ts)
-- Note: match_qr_tokens_active_resource_idx already covers (resource_type, resource_id)
-- filtered on is_active = true. This non-unique variant supports multi-row lookups.
create index if not exists match_qr_tokens_resource_idx
  on public.match_qr_tokens(resource_type, resource_id)
  where is_active = true;

-- Team checkins lookup by team (complements existing match_scope/match_id index)
create index if not exists team_checkins_team_scope_idx
  on public.team_checkins(team_id, match_scope, match_id);

-- ============================================================
-- 2. PUSH SUBSCRIPTIONS SECURITY
-- ============================================================

-- Enable RLS if not already (safe even if already enabled)
alter table if exists public.push_subscriptions enable row level security;

-- Staff can only read/manage their own push subscriptions
drop policy if exists "staff_own_push_subscriptions"
on public.push_subscriptions;

create policy "staff_own_push_subscriptions"
  on public.push_subscriptions
  for all
  using (staff_user_id = auth.uid())
  with check (staff_user_id = auth.uid());

-- ============================================================
-- 3. ATOMIC TEAM REGISTRATION FUNCTION
-- ============================================================

do $$
begin
  if exists (
    select 1
    from public.teams
    where status <> 'cancelled'
    group by
      category_id,
      regexp_replace(lower(trim(team_name)), '\s+', ' ', 'g'),
      lower(trim(captain_email))
    having count(*) > 1
  ) then
    raise exception
      'Duplicate non-cancelled team registrations detected. Resolve them before applying teams_active_registration_dedupe_idx.';
  end if;
end;
$$;

create unique index if not exists teams_active_registration_dedupe_idx
  on public.teams(
    category_id,
    regexp_replace(lower(trim(team_name)), '\s+', ' ', 'g'),
    lower(trim(captain_email))
  )
  where status <> 'cancelled';

-- Prevents race condition when checking max_teams capacity.
-- The function locks the category row, deduplicates repeated submissions,
-- and inserts both the team record and its QR token in a single transaction.
create or replace function public.register_team_atomic(
  p_category_id        uuid,
  p_team_name          text,
  p_captain_name       text,
  p_captain_phone      text,
  p_captain_email      text,
  p_total_players      integer,
  p_registration_code  text,
  p_qr_token           text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category                 record;
  v_active_count             integer;
  v_team_id                  uuid;
  v_existing_team_id         uuid;
  v_existing_qr_token        text;
  v_normalized_team_name     text;
  v_normalized_captain_email text;
begin
  v_normalized_team_name := regexp_replace(lower(trim(p_team_name)), '\s+', ' ', 'g');
  v_normalized_captain_email := lower(trim(p_captain_email));

  -- Lock the category row to prevent concurrent inserts
  select * into v_category
    from public.categories
    where id = p_category_id
      and is_active = true
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'category_not_found');
  end if;

  select id into v_existing_team_id
    from public.teams
    where category_id = p_category_id
      and status <> 'cancelled'
      and regexp_replace(lower(trim(team_name)), '\s+', ' ', 'g') = v_normalized_team_name
      and lower(trim(captain_email)) = v_normalized_captain_email
    order by created_at asc
    limit 1;

  if v_existing_team_id is not null then
    select token into v_existing_qr_token
      from public.match_qr_tokens
      where resource_type = 'team'
        and resource_id = v_existing_team_id
        and is_active = true
      order by created_at desc
      limit 1;

    if v_existing_qr_token is null then
      insert into public.match_qr_tokens (token, resource_type, resource_id, is_active)
      values (p_qr_token, 'team', v_existing_team_id, true)
      returning token into v_existing_qr_token;
    end if;

    return jsonb_build_object(
      'success', true,
      'team_id', v_existing_team_id,
      'qr_token', v_existing_qr_token,
      'deduplicated', true
    );
  end if;

  -- Count active teams (non-cancelled)
  select count(*) into v_active_count
    from public.teams
    where category_id = p_category_id
      and status <> 'cancelled';

  if v_active_count >= v_category.max_teams then
    return jsonb_build_object('success', false, 'error', 'category_full');
  end if;

  -- Insert team
  insert into public.teams (
    category_id,
    team_name,
    captain_name,
    captain_phone,
    captain_email,
    total_players,
    registration_code,
    status,
    gdpr_consent,
    regulation_accepted,
    parental_confirmation_required
  ) values (
    p_category_id,
    p_team_name,
    p_captain_name,
    p_captain_phone,
    p_captain_email,
    p_total_players,
    p_registration_code,
    'pending',
    true,
    true,
    false
  )
  returning id into v_team_id;

  -- Insert QR token linked to the new team
  insert into public.match_qr_tokens (token, resource_type, resource_id, is_active)
  values (p_qr_token, 'team', v_team_id, true);

  return jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'qr_token', p_qr_token,
    'deduplicated', false
  );

exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'duplicate_registration_code');
  when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- Grant execution to authenticated users and service role
grant execute on function public.register_team_atomic(
  uuid, text, text, text, text, integer, text, text
) to authenticated, service_role;

-- Revoke from anon (registrations must go through server actions with the service key)
revoke execute on function public.register_team_atomic(
  uuid, text, text, text, text, integer, text, text
) from anon;

-- ============================================================
-- 4. STAFF AUDIT READ ACCESS
-- ============================================================

-- Staff members can read their own audit entries in addition to the
-- existing admin-only policy defined in pwa_operativa_schema.sql.
drop policy if exists "staff_read_own_audit"
on public.match_result_audit;

create policy "staff_read_own_audit"
  on public.match_result_audit
  for select
  using (actor_user_id = auth.uid());
