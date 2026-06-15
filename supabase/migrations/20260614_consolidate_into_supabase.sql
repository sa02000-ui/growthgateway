-- Consolidation: move the tables that previously lived in a separate (Replit)
-- Postgres into Supabase, so DATABASE_URL can point at Supabase and the whole app
-- uses a SINGLE database. Applied to the live Supabase project; recorded here as
-- migrations-as-code so the schema is reproducible.
--
-- No app code changes are required: the app already connects to a remote Postgres
-- via the `pg` pool over SSL (DATABASE_URL). Repointing DATABASE_URL at Supabase's
-- Postgres connection string is a config switch, not a rewrite.
--
-- RLS NOTE: RLS is ENABLED with NO policies on every table below. The app's pg pool
-- connects as the `postgres` owner role, which bypasses RLS, so server queries keep
-- working. Supabase's auto REST layer (anon/authenticated) is denied, so these
-- server-only operational tables are never exposed to the browser.

-- === Profile data (previously written by server/profile-routes.ts) ===

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  marital_status text,
  children_count integer,
  youngest_child_age text,
  birth_country text,
  years_in_region text,
  cultural_background text,
  profession text,
  industry text,
  education_level text,
  field_of_study text,
  household_income text,
  parental_occupation text,
  parental_income text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;

create table if not exists public.life_events_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  year integer not null,
  significance integer,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, year)
);
alter table public.life_events_log enable row level security;

create table if not exists public.profile_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.profile_history enable row level security;

-- === Operational tables (also self-created by app code via CREATE TABLE IF NOT
-- EXISTS; defined here so they ship with RLS on and are reproducible) ===

-- share-results.ts
create table if not exists public.shared_results (
  token text primary key,
  result_id text not null,
  user_id text not null,
  expires_at timestamptz not null
);
alter table public.shared_results enable row level security;

-- pg-pool.ts (spam-protection dedup + rate limiter + cleanup tracker)
create table if not exists public.peer_feedback_dedup (
  key text primary key,
  expires_at timestamptz not null
);
alter table public.peer_feedback_dedup enable row level security;

create table if not exists public.rate_limit_store (
  key text primary key,
  hits integer not null,
  reset_time timestamptz not null
);
alter table public.rate_limit_store enable row level security;

create table if not exists public.spam_protection_cleanup (
  id integer primary key default 1,
  last_run timestamptz not null default to_timestamp(0),
  constraint spam_protection_cleanup_single_row check (id = 1)
);
alter table public.spam_protection_cleanup enable row level security;
insert into public.spam_protection_cleanup (id) values (1) on conflict (id) do nothing;
