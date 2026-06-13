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
    })();
  }
  return ready;
}
