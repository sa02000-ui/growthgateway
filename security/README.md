# Database security checks

This folder holds the Supabase Row Level Security (RLS) lockdown and an automated
check that the lockdown is still in force.

## Files

- `supabase_rls_lockdown.sql` — the RLS policy lockdown. **Apply it by pasting it
  into the Supabase SQL editor** (Dashboard → SQL Editor). DDL cannot be run from
  the app environment. It is idempotent and safe to re-run.
- `check-rls.ts` — an automated regression check that the lockdown is still live.

## Running the RLS regression check

```bash
npx tsx security/check-rls.ts
```

It uses the **anon key** (`SUPABASE_KEY`) and `SUPABASE_URL`, exactly as the
browser would. It never uses the service role key (which bypasses RLS and would
hide a regression).

What it asserts:

- **Sensitive tables** (`results_log`, `peer_feedback`, `feedback_tokens`) return
  **0 rows** to the anon key **and reject an anon INSERT with an RLS violation**
  (HTTP 401/403 or Postgres code `42501`).
  - Note: a NOT-NULL / constraint error (e.g. code `23502`) on the insert is
    treated as a **failure**, because it means the write passed RLS and only
    failed on a column — i.e. anonymous inserts are *not* being blocked.
- **Public catalog tables** (`assessments_library`, `assessment_questions`)
  remain publicly readable (non-zero row count).

Exit codes:

- `0` — all checks passed; the lockdown is intact.
- `1` — at least one check failed; RLS protection may be off. Re-apply
  `security/supabase_rls_lockdown.sql` in the Supabase SQL editor.
- `2` — the check could not run (missing `SUPABASE_URL` / `SUPABASE_KEY`).

Run it on demand after touching Supabase policies, or wire it into CI so drift is
caught immediately instead of in a future incident.
