import { ATTENTION_CHECK } from "@shared/peer-feedback-questions";
import { pool, ensureInfraTables } from "./pg-pool";
import { triggerSpamProtectionCleanup } from "./spam-protection-cleanup";

// Server-side quality and anti-spam guards for the public peer-feedback submit
// endpoint. The client enforces the same attention check / straight-lining
// rules, but those are bypassable, so we re-check authoritatively here.

// Durable dedup of recently-submitted feedback to block accidental or malicious
// rapid re-submissions of the same content. Keyed by target user + client IP +
// a fingerprint of the responses. Backed by PostgreSQL (peer_feedback_dedup)
// so the guard survives restarts and is shared across instances; entries expire
// after DEDUP_TTL_MS.
const DEDUP_TTL_MS = 10 * 60 * 1000;

function fingerprint(responses: Record<string, unknown>): string {
  return Object.keys(responses)
    .sort()
    .map((k) => `${k}=${responses[k]}`)
    .join("|");
}

export function dedupKey(
  userId: string,
  ip: string,
  responses: Record<string, unknown>,
): string {
  return `${userId}::${ip}::${fingerprint(responses)}`;
}

export async function isDuplicateSubmission(key: string): Promise<boolean> {
  await ensureInfraTables();
  // Opportunistically purge expired rows. DB-gated and fire-and-forget so it
  // runs at most once per interval across instances and never blocks the
  // duplicate check (which already ignores expired rows via expires_at > now()).
  triggerSpamProtectionCleanup();
  const result = await pool.query(
    "SELECT 1 FROM peer_feedback_dedup WHERE key = $1 AND expires_at > now()",
    [key],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function rememberSubmission(key: string): Promise<void> {
  await ensureInfraTables();
  await pool.query(
    `INSERT INTO peer_feedback_dedup (key, expires_at)
     VALUES ($1, now() + ($2::bigint * interval '1 millisecond'))
     ON CONFLICT (key) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
    [key, DEDUP_TTL_MS],
  );
}

// Authoritative check of the instructed-response attention item.
export function passesAttentionCheck(attentionResponse: unknown): boolean {
  return Number(attentionResponse) === ATTENTION_CHECK.expected;
}

// Straight-lining: every answered item shares a single raw value. Honest
// respondents vary because items are reverse-worded, so an identical raw answer
// across all items is a strong low-quality signal.
export function isStraightLined(responses: Record<string, unknown>): boolean {
  const vals = Object.values(responses).filter(
    (v): v is number => typeof v === "number",
  );
  if (vals.length < 5) return false;
  return new Set(vals).size === 1;
}
