-- ============================================================================
-- Supabase RLS lockdown for the Personality & Growth Portal
-- ============================================================================
--
-- WHY THIS FILE EXISTS
--   The Express backend talks to Supabase with the SERVICE ROLE key, which
--   bypasses Row Level Security entirely. The same anon key, however, is shipped
--   to the browser (via /api/config). Any table with a permissive anon policy is
--   therefore readable/writable directly from the public internet, bypassing the
--   Express auth layer. This script locks every Supabase table down so the anon
--   key can only do what the app legitimately needs.
--
-- HOW TO RUN
--   This DDL CANNOT be executed from the app environment. Paste this whole file
--   into the Supabase SQL editor (Dashboard -> SQL Editor) and run it. It is
--   idempotent: it drops every existing policy on each table and recreates the
--   intended set, so it is safe to run repeatedly.
--
-- SCOPE / FINDINGS (audited June 12, 2026 with the anon key vs service role)
--   Tables that EXIST in this Supabase project:
--     results_log          - SENSITIVE (per-user assessment results)   -> owner read only
--     peer_feedback        - SENSITIVE (feedback about a user)         -> owner read only
--     feedback_tokens      - SENSITIVE (token -> user_id mapping)      -> no anon access
--     assessments_library  - PUBLIC, non-sensitive (test catalog)      -> public read OK
--     assessment_questions - PUBLIC, non-sensitive (question bank)     -> public read OK
--   Tables referenced in code but NOT present in Supabase (no action needed here):
--     groups, group_members, shared_result_tokens, conversations, messages,
--     user_profiles, life_events  -- profiles/life events live in Replit Postgres
--     (DATABASE_URL), which is NOT exposed via the anon key.
--
-- APP IMPACT: NONE.
--   * All writes go through Express using the service role (which bypasses RLS):
--       - assessment submit, peer-feedback submit, token mint, account delete.
--   * The browser only does authenticated SELECT reads on results_log and
--     peer_feedback (home-tab.tsx / peer-feedback-tab.tsx), scoped to the logged
--     in user. The authenticated owner-read policies below preserve that.
--   * The browser reads assessments_library / assessment_questions through the
--     Express API (service role), so their public-read policy is a convenience
--     for genuinely public, non-sensitive data and is intentionally retained.
-- ============================================================================

BEGIN;

-- Helper: drop every existing policy on a table so we can recreate cleanly.
-- (We cannot DROP POLICY IF EXISTS by name because policy names are unknown.)
DO $$
DECLARE
  r record;
  t text;
  tables text[] := ARRAY[
    'results_log',
    'peer_feedback',
    'feedback_tokens',
    'assessments_library',
    'assessment_questions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip tables that do not exist in this project (defensive).
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping %, table not found', t;
      CONTINUE;
    END IF;

    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- results_log : per-user assessment results. Owner read only. No anon. No client
-- writes (the server inserts/deletes via the service role).
-- ----------------------------------------------------------------------------
ALTER TABLE public.results_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_log_owner_select"
  ON public.results_log
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- ----------------------------------------------------------------------------
-- peer_feedback : feedback ABOUT a user. The target user may read feedback about
-- themselves. No anon read. Submissions arrive through the Express endpoint
-- (POST /api/peer-feedback/:userId) using the service role, so NO anon/insert
-- policy is created here -- this closes the anon-INSERT gap found in the audit.
-- ----------------------------------------------------------------------------
ALTER TABLE public.peer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_feedback_target_select"
  ON public.peer_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = target_user_id::text);

-- ----------------------------------------------------------------------------
-- feedback_tokens : token -> user_id mapping (PII / user enumeration risk).
-- No client access at all; resolved server-side via the service role.
-- RLS enabled with zero policies = deny everything for anon and authenticated.
-- ----------------------------------------------------------------------------
ALTER TABLE public.feedback_tokens ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- assessments_library : genuinely public, non-sensitive test catalog.
-- Public (anon) read is intentionally retained. No writes for anyone but the
-- service role (which bypasses RLS).
-- ----------------------------------------------------------------------------
ALTER TABLE public.assessments_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessments_library_public_read"
  ON public.assessments_library
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- assessment_questions : genuinely public, non-sensitive question bank.
-- Same treatment as assessments_library.
-- ----------------------------------------------------------------------------
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessment_questions_public_read"
  ON public.assessment_questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;

-- ============================================================================
-- VERIFICATION (run from any shell that has $SUPABASE_URL and the ANON key).
-- The anon key is the value /api/config returns as supabaseAnonKey
-- (Replit secret SUPABASE_KEY). Do NOT use the service role key for these checks.
--
--   AN="<anon key>"; URL="$SUPABASE_URL"
--
-- 1) Sensitive tables must return 0 rows to the anon key:
--   for t in results_log peer_feedback feedback_tokens; do
--     curl -s -D - -o /dev/null \
--       -H "apikey: $AN" -H "Authorization: Bearer $AN" \
--       -H "Prefer: count=exact" -H "Range: 0-0" \
--       "$URL/rest/v1/$t?select=id" | grep -i content-range
--   done
--   # Expect:  content-range: */0   for each table.
--
-- 2) Anon writes must be rejected (expect HTTP 401, code 42501 RLS violation):
--   for t in results_log peer_feedback feedback_tokens; do
--     curl -s -o /dev/null -w "$t -> %{http_code}\n" -X POST \
--       -H "apikey: $AN" -H "Authorization: Bearer $AN" \
--       -H "Content-Type: application/json" -d '{}' \
--       "$URL/rest/v1/$t"
--   done
--
-- 3) Public tables still readable by anon (expected, non-sensitive):
--   for t in assessments_library assessment_questions; do
--     curl -s -D - -o /dev/null \
--       -H "apikey: $AN" -H "Authorization: Bearer $AN" \
--       -H "Prefer: count=exact" -H "Range: 0-0" \
--       "$URL/rest/v1/$t?select=id" | grep -i content-range
--   done
--   # Expect a non-zero count (e.g. 0-0/11, 0-0/281).
--
-- 4) Logged-in users still see their own data: open the app, sign in, and
--    confirm the dashboard (home + peer feedback tabs) loads results normally.
-- ============================================================================
