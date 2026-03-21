create table if not exists public.category_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  stage text not null check (stage in ('initial', 'final')),
  format_key text not null,
  format_label text not null,
  status text not null default 'generated' check (status in ('generated', 'cancelled')),
  snapshot_at timestamptz not null default now(),
  snapshot_cutoff timestamptz not null,
  present_team_ids uuid[] not null default '{}'::uuid[],
  minimum_matches_per_team integer not null default 0 check (minimum_matches_per_team >= 0 and minimum_matches_per_team <= 20),
  total_matches_planned integer not null default 0 check (total_matches_planned >= 0 and total_matches_planned <= 128),
  official_placement boolean not null default false,
  capacity_summary jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}'::text[],
  meta jsonb not null default '{}'::jsonb,
  generated_from_run_id uuid references public.category_schedule_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parental_confirmations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  token text not null unique,
  parent_name text,
  parent_phone text,
  parent_email text,
  child_name text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references auth.users(id) on delete set null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now()
);

create table if not exists public.slots_config_history (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  old_max_teams integer not null,
  new_max_teams integer not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz default now()
);
