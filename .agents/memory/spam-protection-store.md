---
name: Spam-protection durable store
description: Where the peer-feedback dedup guard and rate limiters keep their durable state, and why.
---

The peer-feedback duplicate-submission guard and all express-rate-limit limiters
are backed by the **Replit PostgreSQL** database (`DATABASE_URL`), not external
Supabase.

**Why:** state must survive restarts and be shared across instances; we control
DDL on Replit Postgres (Supabase is external, anon/service key, no reliable DDL).

**Durable rules (the non-obvious decisions):**
- The dedup guard is a single ATOMIC claim, not read-then-write: claim = `INSERT
  ... ON CONFLICT DO UPDATE ... WHERE expires_at <= now() RETURNING` (acquires, or
  reclaims an expired key, else rejects an active duplicate). **Why:** a
  read-then-write pair let two concurrent identical submissions both pass.
- Routes MUST release the claim on EVERY failure path after acquiring (incl. the
  outer catch). **Why:** a thrown exception otherwise leaves the key locked until
  TTL, blocking legitimate retries.
- Give each rate limiter its OWN store instance — the store assigns a unique key
  prefix so keyspaces don't collide in the one shared table.
- Expired-row cleanup is DB-gated, not process-local: a single-row table stores
  `last_run` and an atomic `UPDATE ... RETURNING` lets exactly one instance purge
  per interval. **Why:** the old per-process setInterval/delete died with the
  process; the schedule must live in the DB to survive across instances.
- Gotcha: express-rate-limit's `Store` interface has an optional `prefix` field —
  don't name a private member `prefix` (TS conflict); use `keyPrefix`.
