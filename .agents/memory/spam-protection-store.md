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
- Note: the express-rate-limit `Store` interface has an optional `prefix` field;
  don't name a private member `prefix` (TS conflict) — use `keyPrefix`.
