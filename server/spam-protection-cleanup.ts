import { pool, ensureInfraTables } from "./pg-pool";

// Reliable cleanup of expired spam-protection rows (peer_feedback_dedup and
// rate_limit_store). Instead of relying on a single process's setInterval
// surviving, the schedule lives in the database: an atomic claim on the
// single-row spam_protection_cleanup table lets exactly one instance run the
// purge per interval. Triggered opportunistically from the hot request paths
// (and a best-effort per-process timer), so as long as ANY instance is alive
// and serving traffic, expired rows get removed on a dependable cadence.

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

let inFlight: Promise<void> | null = null;

async function run(): Promise<void> {
  await ensureInfraTables();
  // Atomically claim the cleanup slot: the UPDATE only matches (and locks) the
  // row when the interval has elapsed. Concurrent instances serialize on the
  // row lock, so only the first to commit sees a matching row — the rest get
  // rowCount 0 and skip. No explicit transaction needed.
  const claim = await pool.query(
    `UPDATE spam_protection_cleanup
     SET last_run = now()
     WHERE id = 1
       AND last_run <= now() - ($1::bigint * interval '1 millisecond')
     RETURNING id`,
    [CLEANUP_INTERVAL_MS],
  );
  if (claim.rowCount === 0) return;
  await pool.query("DELETE FROM rate_limit_store WHERE reset_time <= now()");
  await pool.query("DELETE FROM peer_feedback_dedup WHERE expires_at <= now()");
}

// Run a cleanup pass if the shared interval has elapsed. Safe to call often and
// concurrently; the DB gate ensures the purge runs at most once per interval
// across all instances. De-duplicates concurrent in-process calls too.
export async function maybeCleanupSpamProtection(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

// Fire-and-forget variant for hot request paths: never blocks the request and
// swallows/logs errors so a cleanup hiccup can't fail a user action.
export function triggerSpamProtectionCleanup(): void {
  void maybeCleanupSpamProtection().catch((err) =>
    console.error("[spam-protection] cleanup error:", err),
  );
}

// Best-effort per-process timer so cleanup still happens during idle periods
// with no traffic. This is a backup, not the source of truth — the DB gate
// above is what makes cleanup dependable regardless of which instance is alive.
let timerStarted = false;
export function startSpamProtectionCleanupTimer(): void {
  if (timerStarted) return;
  timerStarted = true;
  const timer = setInterval(triggerSpamProtectionCleanup, CLEANUP_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}
