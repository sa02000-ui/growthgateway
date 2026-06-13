import pg from "pg";

// Shared Replit PostgreSQL pool. Used for durable operational state that must
// survive server restarts and be shared across instances (e.g. the peer-feedback
// dedup guard and the rate-limiter store).
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Idempotent DDL for the infra tables backing spam protection. Run once at
// startup so the tables always exist after a restart or on a fresh instance,
// without requiring a manual migration step.
let ready: Promise<void> | null = null;

export function ensureInfraTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS peer_feedback_dedup (
          key TEXT PRIMARY KEY,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rate_limit_store (
          key TEXT PRIMARY KEY,
          hits INTEGER NOT NULL,
          reset_time TIMESTAMPTZ NOT NULL
        )
      `);
      // Single-row table tracking the last time expired spam-protection rows
      // were purged. Lives in the DB (not process memory) so the cleanup
      // schedule is shared across instances and survives any single process
      // dying. CHECK (id = 1) enforces exactly one row.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS spam_protection_cleanup (
          id INTEGER PRIMARY KEY DEFAULT 1,
          last_run TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0),
          CONSTRAINT spam_protection_cleanup_single_row CHECK (id = 1)
        )
      `);
      await pool.query(`
        INSERT INTO spam_protection_cleanup (id) VALUES (1)
        ON CONFLICT (id) DO NOTHING
      `);
    })().catch((err) => {
      // A transient failure during init must not be cached forever: clear the
      // memoized promise so the next caller retries instead of being stuck with
      // a permanently-rejected promise (which would break rate-limit/dedup
      // until the process restarts).
      ready = null;
      throw err;
    });
  }
  return ready;
}
