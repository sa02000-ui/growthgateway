import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  acquireSubmission,
  dedupKey,
  isStraightLined,
  passesAttentionCheck,
  releaseSubmission,
} from "./peer-feedback-guards";
import { ATTENTION_CHECK } from "@shared/peer-feedback-questions";
import { pool, ensureInfraTables } from "./pg-pool";

// Unique namespace per run so concurrent/leftover rows from other runs can never
// collide with these assertions.
const NS = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const usedKeys: string[] = [];

function freshKey(label: string): string {
  const key = dedupKey(`${NS}-${label}`, "127.0.0.1", { q1: 1, q2: 2 });
  usedKeys.push(key);
  return key;
}

afterAll(async () => {
  if (usedKeys.length > 0) {
    await pool.query("DELETE FROM peer_feedback_dedup WHERE key = ANY($1)", [
      usedKeys,
    ]);
  }
  await pool.end();
});

describe("dedupKey / fingerprint", () => {
  it("is stable regardless of response key order", () => {
    const a = dedupKey("u1", "1.2.3.4", { q1: 5, q2: 3, q3: 1 });
    const b = dedupKey("u1", "1.2.3.4", { q3: 1, q1: 5, q2: 3 });
    expect(a).toBe(b);
  });

  it("differs when user, ip, or responses differ", () => {
    const base = dedupKey("u1", "1.2.3.4", { q1: 5 });
    expect(dedupKey("u2", "1.2.3.4", { q1: 5 })).not.toBe(base);
    expect(dedupKey("u1", "9.9.9.9", { q1: 5 })).not.toBe(base);
    expect(dedupKey("u1", "1.2.3.4", { q1: 4 })).not.toBe(base);
  });
});

describe("passesAttentionCheck", () => {
  it("accepts the expected value (including string coercion)", () => {
    expect(passesAttentionCheck(ATTENTION_CHECK.expected)).toBe(true);
    expect(passesAttentionCheck(String(ATTENTION_CHECK.expected))).toBe(true);
  });

  it("rejects other values", () => {
    expect(passesAttentionCheck(ATTENTION_CHECK.expected + 1)).toBe(false);
    expect(passesAttentionCheck(undefined)).toBe(false);
  });
});

describe("isStraightLined", () => {
  it("flags identical answers across all items", () => {
    expect(isStraightLined({ a: 3, b: 3, c: 3, d: 3, e: 3 })).toBe(true);
  });

  it("does not flag varied answers", () => {
    expect(isStraightLined({ a: 3, b: 1, c: 3, d: 4, e: 3 })).toBe(false);
  });

  it("does not flag short response sets", () => {
    expect(isStraightLined({ a: 2, b: 2 })).toBe(false);
  });
});

describe("acquireSubmission / releaseSubmission (Postgres-backed)", () => {
  beforeEach(async () => {
    await ensureInfraTables();
  });

  it("acquires once and blocks an immediate duplicate", async () => {
    const key = freshKey("dup");
    expect(await acquireSubmission(key)).toBe(true);
    expect(await acquireSubmission(key)).toBe(false);
  });

  it("releases a claim so a retry can re-acquire", async () => {
    const key = freshKey("release");
    expect(await acquireSubmission(key)).toBe(true);
    await releaseSubmission(key);
    expect(await acquireSubmission(key)).toBe(true);
  });

  it("lets exactly one of two concurrent identical claims win", async () => {
    const key = freshKey("concurrent");
    const results = await Promise.all([
      acquireSubmission(key),
      acquireSubmission(key),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("reclaims an expired key", async () => {
    const key = freshKey("expired");
    // Seed an already-expired row directly to simulate a claim past its TTL.
    await pool.query(
      `INSERT INTO peer_feedback_dedup (key, expires_at)
       VALUES ($1, now() - interval '1 minute')
       ON CONFLICT (key) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [key],
    );
    expect(await acquireSubmission(key)).toBe(true);
  });
});
