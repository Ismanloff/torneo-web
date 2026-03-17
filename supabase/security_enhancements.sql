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
create policy if not exists "staff_own_push_subscriptions"
  on public.push_subscriptions
  for all
  using (staff_user_id = auth.uid())
  with check (staff_user_id = auth.uid());

-- ============================================================
-- 3. ATOMIC TEAM REGISTRATION FUNCTION
-- ============================================================

-- Prevents race condition when checking max_teams capacity.
-- The function locks the category row, counts active teams, and
-- inserts both the team record and its QR token in a single transaction.
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
  v_category    record;
  v_active_count integer;
  v_team_id     uuid;
begin
  -- Lock the category row to prevent concurrent inserts
  select * into v_category
    from public.categories
    where id = p_category_id
      and is_active = true
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'category_not_found');
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

  return jsonb_build_object('success', true, 'team_id', v_team_id);

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
-- Uses "if not exists" so it is safe to re-run.
create policy if not exists "staff_read_own_audit"
  on public.match_result_audit
  for select
  using (actor_user_id = auth.uid());
