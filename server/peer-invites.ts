import type { Express, Request, Response } from "express";
import { supabase } from "./db";
import { requireAuth, getUserId } from "./auth";
import { writeLimiter } from "./rate-limit";
import { relationshipValues } from "@shared/peer-feedback-questions";
import { sendInviteEmail, isEmailConfigured } from "./email";
import crypto from "crypto";

const VALID_INSTRUMENTS = ["big-five", "peer-360"] as const;
type Instrument = (typeof VALID_INSTRUMENTS)[number];

const INVITE_TTL_DAYS = 30;
const MAX_INVITES_PER_REQUEST = 25;

function generateToken(): string {
  const bytes = crypto.randomBytes(8);
  const base64 = bytes.toString("base64url");
  return [base64.slice(0, 4), base64.slice(4, 6), base64.slice(6, 8)].join("-").toLowerCase();
}

function normalizeInstrument(value: unknown): Instrument {
  return VALID_INSTRUMENTS.includes(value as Instrument) ? (value as Instrument) : "big-five";
}

function normalizeRelationship(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return relationshipValues.includes(value as any) ? value : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Build the public origin for invite links from a configured app URL or the
// (proxy-aware) request headers. We deliberately do NOT trust a client-supplied
// origin: these links are emailed from a verified sender, so an attacker-
// controlled origin would turn an official invite into a phishing link riding on
// our domain's reputation.
function resolveOrigin(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured && /^https?:\/\/[^\s/]+/.test(configured)) {
    return configured.replace(/\/+$/, "");
  }
  const host = req.get("host") ?? "";
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || req.protocol || "https";
  return `${proto}://${host}`;
}

export function inviteStatus(row: { used_at: string | null; expires_at: string | null }): "valid" | "used" | "expired" {
  if (row.used_at) return "used";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "valid";
}

export function registerPeerInviteRoutes(app: Express): void {
  // Create one or more one-time invite tokens for the authenticated user.
  app.post("/api/peer-invites", requireAuth, writeLimiter, async (req: Request, res: Response) => {
    try {
      const targetUserId = getUserId(req);
      const instrument = normalizeInstrument(req.body?.instrument);
      const relationship = normalizeRelationship(req.body?.relationship);
      const customMessage = typeof req.body?.message === "string" ? req.body.message : undefined;
      const fromName =
        typeof req.body?.fromName === "string" && req.body.fromName.trim()
          ? req.body.fromName.trim()
          : "Someone";

      // When `recipients` (emails) are supplied we create one unique invite per
      // recipient and email it server-side. Otherwise fall back to the legacy
      // link-only flow driven by `count`.
      const rawRecipients: unknown[] | null = Array.isArray(req.body?.recipients) ? req.body.recipients : null;
      let recipients: string[] = [];
      if (rawRecipients) {
        const normalized: string[] = rawRecipients
          .map((e) => String(e ?? "").trim().toLowerCase())
          .filter((e) => isValidEmail(e));
        recipients = Array.from(new Set(normalized)).slice(0, MAX_INVITES_PER_REQUEST);

        if (recipients.length === 0) {
          return res.status(400).json({ error: "No valid email addresses provided" });
        }
      }

      const count = rawRecipients
        ? recipients.length
        : Math.min(Math.max(parseInt(String(req.body?.count ?? 1), 10) || 1, 1), MAX_INVITES_PER_REQUEST);

      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const rows = Array.from({ length: count }, () => ({
        token: generateToken(),
        target_user_id: targetUserId,
        relationship,
        instrument,
        expires_at: expiresAt,
      }));

      const { data, error } = await supabase
        .from("peer_invites")
        .insert(rows)
        .select("token, relationship, instrument, expires_at");

      if (error || !data) {
        console.error("Peer invite creation error:", error);
        return res.status(500).json({ error: "Failed to create invites" });
      }

      // Legacy link-only flow: just return the freshly minted tokens.
      if (!rawRecipients) {
        return res.json({ invites: data });
      }

      // Email flow: send each recipient their own single-use link.
      const origin = resolveOrigin(req);
      const emailConfigured = await isEmailConfigured();

      const invites = await Promise.all(
        data.map(async (row, i) => {
          const email = recipients[i];
          const link = `${origin}/feedback/${row.token}`;
          let sent = false;
          let sendError: string | undefined = "Email delivery is not configured.";

          if (emailConfigured) {
            const result = await sendInviteEmail({ to: email, fromName, link, customMessage });
            sent = result.sent;
            sendError = result.error;
          }

          return { ...row, email, link, sent, error: sendError };
        }),
      );

      const sentCount = invites.filter((i) => i.sent).length;

      res.json({
        invites,
        emailConfigured,
        sentCount,
        failedCount: invites.length - sentCount,
      });
    } catch (error) {
      console.error("Peer invite creation error:", error);
      res.status(500).json({ error: "Failed to create invites" });
    }
  });

  // Public: resolve an invite token to its target + status (no PII).
  app.get("/api/peer-invite/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token.trim().toLowerCase();

      const { data, error } = await supabase
        .from("peer_invites")
        .select("target_user_id, relationship, instrument, used_at, expires_at")
        .eq("token", token)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Invalid invite" });
      }

      res.json({
        userId: data.target_user_id,
        relationship: data.relationship,
        instrument: data.instrument || "big-five",
        status: inviteStatus(data),
      });
    } catch (error) {
      console.error("Peer invite lookup error:", error);
      res.status(404).json({ error: "Invalid invite" });
    }
  });
}
