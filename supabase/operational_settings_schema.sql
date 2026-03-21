create table if not exists public.category_operational_settings (
  category_id uuid primary key references public.categories(id) on delete cascade,
  match_minutes integer not null check (match_minutes >= 5 and match_minutes <= 120),
  turnover_minutes integer not null check (turnover_minutes >= 0 and turnover_minutes <= 60),
  venue_count integer not null check (venue_count >= 1 and venue_count <= 8),
  window_start time not null,
  window_end time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
