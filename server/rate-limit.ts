import rateLimit from "express-rate-limit";
import { PostgresRateLimitStore } from "./pg-rate-limit-store";

// All limiters use a PostgreSQL-backed store so their counters survive server
// restarts and are shared across instances (the default MemoryStore is
// per-process and resets on restart). Each limiter needs its own store instance
// so their keyspaces stay isolated.

// General API limiter — protects every /api route from abuse.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PostgresRateLimitStore(),
  message: { error: "Too many requests, please try again later." },
});

// Strict limiter for the paid AI endpoint.
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PostgresRateLimitStore(),
  message: { error: "Too many AI requests, please slow down." },
});

// Limiter for public write endpoints (e.g. anonymous peer feedback submission).
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PostgresRateLimitStore(),
  message: { error: "Too many submissions, please slow down." },
});

// Strict per-IP limiter for the OPEN (reusable, non-invited) peer-feedback link.
// One-time invited submissions are self-limiting (the token can only be used
// once), so they are skipped here. This blunts the open link as a spam vector
// while keeping invited feedback unrestricted.
export const openFeedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PostgresRateLimitStore(),
  message: {
    error:
      "Too many feedback submissions from this network. Please use a personal invite link or try again later.",
  },
  skip: (req) => {
    const token = (req.body as { inviteToken?: unknown } | undefined)?.inviteToken;
    return typeof token === "string" && token.trim().length > 0;
  },
});
