import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import { pool, ensureInfraTables } from "./pg-pool";
import {
  triggerSpamProtectionCleanup,
  startSpamProtectionCleanupTimer,
} from "./spam-protection-cleanup";

// express-rate-limit Store backed by Replit PostgreSQL so rate-limit counters
// survive restarts and are shared across instances (the default MemoryStore is
// per-process and resets on restart). Each limiter gets its own instance with a
// unique prefix so their keys never collide in the shared table.

let prefixCounter = 0;

export class PostgresRateLimitStore implements Store {
  private windowMs = 60 * 1000;

  // express-rate-limit reads this public `prefix` during its double-count
  // validation to distinguish limiter instances that share a store class. Each
  // instance gets a unique prefix so stacking multiple limiters on one route
  // (e.g. the global apiLimiter + writeLimiter + openFeedbackLimiter) doesn't
  // trip ERR_ERL_DOUBLE_COUNT. It also namespaces keys in the shared table.
  readonly prefix: string;

  // DB-backed store: keys are not local to the process.
  readonly localKeys = false;

  constructor() {
    this.prefix = `rl:${prefixCounter++}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    void ensureInfraTables();
    startSpamProtectionCleanupTimer();
  }

  private prefixed(key: string): string {
    return this.prefix + key;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    await ensureInfraTables();
    // Opportunistically purge expired rows (DB-gated so it actually runs at
    // most once per interval across instances). Fire-and-forget: never blocks
    // the rate-limit decision.
    triggerSpamProtectionCleanup();
    const ms = this.windowMs;
    const result = await pool.query<{ hits: number; reset_time: Date }>(
      `INSERT INTO rate_limit_store (key, hits, reset_time)
       VALUES ($1, 1, now() + ($2::bigint * interval '1 millisecond'))
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE WHEN rate_limit_store.reset_time <= now() THEN 1
                     ELSE rate_limit_store.hits + 1 END,
         reset_time = CASE WHEN rate_limit_store.reset_time <= now()
                           THEN now() + ($2::bigint * interval '1 millisecond')
                           ELSE rate_limit_store.reset_time END
       RETURNING hits, reset_time`,
      [this.prefixed(key), ms],
    );
    const row = result.rows[0];
    return { totalHits: Number(row.hits), resetTime: new Date(row.reset_time) };
  }

  async decrement(key: string): Promise<void> {
    await ensureInfraTables();
    await pool.query(
      `UPDATE rate_limit_store SET hits = GREATEST(hits - 1, 0)
       WHERE key = $1 AND reset_time > now()`,
      [this.prefixed(key)],
    );
  }

  async resetKey(key: string): Promise<void> {
    await ensureInfraTables();
    await pool.query("DELETE FROM rate_limit_store WHERE key = $1", [
      this.prefixed(key),
    ]);
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    await ensureInfraTables();
    const result = await pool.query<{ hits: number; reset_time: Date }>(
      `SELECT hits, reset_time FROM rate_limit_store
       WHERE key = $1 AND reset_time > now()`,
      [this.prefixed(key)],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return { totalHits: Number(row.hits), resetTime: new Date(row.reset_time) };
  }
}
