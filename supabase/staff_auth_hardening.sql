alter table if exists public.staff_profiles
  add column if not exists pin text unique;

alter table if exists public.staff_profiles
  add column if not exists pin_hash text unique;

alter table if exists public.staff_profiles
  add column if not exists pin_last_four text;

alter table if exists public.staff_profiles
  add column if not exists last_login_at timestamptz;

update public.staff_profiles
set pin_last_four = right(pin, 4)
where pin is not null
  and pin_last_four is null;

create unique index if not exists staff_profiles_pin_hash_idx
  on public.staff_profiles(pin_hash)
  where pin_hash is not null;

create table if not exists public.staff_login_attempts (
  attempt_key text primary key,
  failure_count integer not null default 0 check (failure_count >= 0),
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staff_login_attempts_locked_until_idx
  on public.staff_login_attempts(locked_until);

alter table if exists public.staff_login_attempts
  enable row level security;

revoke all on public.staff_login_attempts from anon, authenticated;

drop policy if exists "deny_staff_login_attempts_client_access"
on public.staff_login_attempts;

create policy "deny_staff_login_attempts_client_access"
on public.staff_login_attempts
for all
to authenticated
using (false)
with check (false);

drop trigger if exists staff_login_attempts_set_updated_at on public.staff_login_attempts;
create trigger staff_login_attempts_set_updated_at
before update on public.staff_login_attempts
for each row
execute function public.update_updated_at_column();
