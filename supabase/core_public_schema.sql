create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text,
  city text,
  contact_email text,
  contact_phone text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date,
  end_date date,
  registration_deadline timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  name text not null,
  sport text not null,
  school text,
  age_group text,
  age_min integer,
  age_max integer,
  max_teams integer not null default 10,
  current_teams integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  team_name text not null,
  captain_name text not null,
  captain_phone text not null,
  captain_email text not null,
  total_players integer not null default 1,
  registration_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'waitlist')),
  gdpr_consent boolean not null default false,
  regulation_accepted boolean not null default false,
  parental_confirmation_required boolean default false,
  parental_confirmed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  checked_in_at timestamptz
);
