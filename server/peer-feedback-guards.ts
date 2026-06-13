import { ATTENTION_CHECK } from "@shared/peer-feedback-questions";

// Server-side quality and anti-spam guards for the public peer-feedback submit
// endpoint. The client enforces the same attention check / straight-lining
// rules, but those are bypassable, so we re-check authoritatively here.

// In-memory dedup of recently-submitted feedback to block accidental or
// malicious rapid re-submissions of the same content. Keyed by target user +
// client IP + a fingerprint of the responses. Entries expire after DEDUP_TTL_MS.
const DEDUP_TTL_MS = 10 * 60 * 1000;
const recentSubmissions = new Map<string, number>();

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

export function isDuplicateSubmission(key: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded.
  Array.from(recentSubmissions.entries()).forEach(([k, ts]) => {
    if (now - ts > DEDUP_TTL_MS) recentSubmissions.delete(k);
  });
  const seen = recentSubmissions.get(key);
  return seen !== undefined && now - seen < DEDUP_TTL_MS;
}

export function rememberSubmission(key: string): void {
  recentSubmissions.set(key, Date.now());
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
