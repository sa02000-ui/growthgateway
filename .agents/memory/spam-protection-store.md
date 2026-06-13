---
name: Spam-protection durable store
description: Where the peer-feedback dedup guard and rate limiters keep their durable state, and why.
---

The peer-feedback duplicate-submission guard and all express-rate-limit limiters
are backed by the **Replit PostgreSQL** database (`DATABASE_URL`), not external
Supabase.

**Why:** state must survive restarts and be shared across instances; we control
DDL on Replit Postgres (Supabase is external, anon/service key, no reliable DDL).

**How to apply:**
- Shared pool + idempotent DDL live in `server/pg-pool.ts` (`ensureInfraTables()`
  runs `CREATE TABLE IF NOT EXISTS` lazily on first use — self-healing, no manual
  migration). Tables: `peer_feedback_dedup`, `rate_limit_store`.
- Rate limiters use `PostgresRateLimitStore` (`server/pg-rate-limit-store.ts`),
  an express-rate-limit v8 Store. Give EACH limiter its OWN store instance — the
  constructor assigns a unique key prefix so keyspaces don't collide in the
  shared table.
- The dedup guards (`server/peer-feedback-guards.ts`) `isDuplicateSubmission` /
  `rememberSubmission` are async — await them in routes.
- Expired-row cleanup is DB-gated, not process-local: `spam_protection_cleanup`
  (single CHECK id=1 row) stores `last_run`; an atomic
  `UPDATE ... WHERE last_run <= now() - interval RETURNING id` lets exactly one
  instance claim a purge per interval (others get rowCount 0). Trigger via
  fire-and-forget `triggerSpamProtectionCleanup()` from hot paths
  (`increment`, `isDuplicateSubmission`); a per-process `setInterval` is only a
  best-effort idle backup. **Why:** the old setInterval/per-submission delete
  died with a single process; the gate must live in the DB so any live instance
  serving traffic keeps both tables pruned.
- Note: the express-rate-limit `Store` interface has an optional `prefix` field;
  don't name a private member `prefix` (TS conflict) — use `keyPrefix`.
