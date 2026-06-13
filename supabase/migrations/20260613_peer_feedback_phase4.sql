-- Phase 4 peer-feedback schema (applied on the external Supabase project).
-- Recorded here as migrations-as-code so the schema is reproducible from the repo.
-- RLS note: the Express backend uses the service_role key (bypasses RLS); the
-- browser only uses the anon key for auth. Tables holding feedback data are
-- service-role only (no anon policies), mirroring feedback_tokens.

-- 1. Relationship segmentation + instrument tagging on peer feedback.
alter table public.peer_feedback
  add column if not exists relationship text;

alter table public.peer_feedback
  add column if not exists instrument text not null default 'big-five';

-- 2. One-time peer invites (so a single person can't repeatedly skew the average).
create table if not exists public.peer_invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  target_user_id uuid not null,
  relationship text,
  instrument text not null default 'big-five',
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists peer_invites_target_user_id_idx on public.peer_invites (target_user_id);
create index if not exists peer_invites_token_idx on public.peer_invites (token);

-- 3. RLS: enabled with NO policies -> reachable only via the service_role key.
alter table public.peer_invites enable row level security;
