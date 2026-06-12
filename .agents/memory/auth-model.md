---
name: Auth & authorization model
description: How authorization works across the Express API and why server-side checks are the only safe layer
---

# Authorization model

Every Express data route talks to Supabase using the **service_role** key
(`server/db.ts` prefers `SUPABASE_SERVICE_ROLE_KEY`). Service role bypasses
Postgres RLS entirely.

**Rule:** the ONLY authorization layer for user-scoped data is the Express
`requireAuth` middleware (`server/auth.ts`), which verifies the Bearer token via
`supabase.auth.getUser` and sets `req.userId`. Routes must derive the user via
`getUserId(req)` and **never** trust a client-supplied `userId`/`resultId` from
the URL or body.

**Why:** trusting client IDs caused a full IDOR/auth-bypass (the original audit
finding). Service role means no DB-side safety net.

**How to apply:**
- New user-scoped route → add `requireAuth`, use `getUserId(req)`, and for
  by-id resources verify ownership before returning/mutating.
- Public-by-design routes stay open: `/api/config` (anon key only), health,
  assessments-library list, `*questions`, peer-feedback questions, POST
  peer-feedback/:userId (submitting feedback ABOUT a user), feedback-token/:token
  resolve, shared-result/:token.
- The browser must send the token: `client/src/lib/queryClient.ts` attaches it for
  `apiRequest` + default query fn; raw `fetch` calls to protected routes must spread
  `await getAuthHeaders()`.

# Supabase RLS caveat (separate from Express)

Because the anon key is shipped to the browser, any table with a permissive anon
policy is readable directly, bypassing Express. `feedback_tokens` had a public
anon-read policy that must be dropped at the DB level — Express auth cannot
protect against direct anon-key table reads. Always lock RLS on tables that hold
mappings/PII, even though the server uses service role.

# Supabase table inventory + direct browser reads

Tables that actually EXIST in the external Supabase project: `results_log`,
`peer_feedback`, `feedback_tokens`, `assessments_library`, `assessment_questions`.
Tables referenced in code but NOT present in Supabase (return PGRST205/404 to the
anon REST API): `groups`, `group_members`, `shared_result_tokens`,
`conversations`, `messages`, `user_profiles`, `life_events`. Profile/life-event
data lives in **Replit Postgres** (`DATABASE_URL`: `user_profiles`,
`life_events_log`, `profile_history`), which is not reachable via the anon key.

**Non-obvious:** the browser reads `results_log` and `peer_feedback` *directly*
via the anon-key Supabase client carrying the logged-in user's session
(home-tab.tsx, peer-feedback-tab.tsx), NOT through Express. So those two tables'
RLS SELECT policies MUST stay owner-scoped (`auth.uid() = user_id` /
`= target_user_id`) — the Express layer does not cover this path. All writes,
however, go through Express via the service role, so no client write policies are
needed. The lockdown DDL lives at `security/supabase_rls_lockdown.sql` (must be
run by hand in the Supabase SQL editor; DDL can't run from the app env).
**Why:** task-2 audit confirmed anon reads already return 0 rows on the sensitive
tables, but anon INSERT into `peer_feedback` was still permitted until that SQL
is applied.

# Verifying RLS via the anon REST API (non-obvious gotchas)

Automated drift check lives at `security/check-rls.ts` (`npx tsx security/check-rls.ts`,
anon key only). Two traps when probing PostgREST directly:
- A ranged GET (`Range: 0-0`) returns **HTTP 206**, not 200. Treat 200 *and* 206
  as success; row total is the number after `/` in the `Content-Range` header
  (`*/0` = empty).
- On an anon INSERT, **only** an RLS denial (HTTP 401/403 or Postgres code
  `42501`) proves the table is protected. A NOT-NULL/constraint error (code
  `23502`) means the insert PASSED RLS and only tripped a column constraint — i.e.
  anon writes are NOT blocked. That 23502 was exactly the open `peer_feedback`
  insert gap, so the check flags 23502 as a FAILURE, not a pass.
