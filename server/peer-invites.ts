import type { Express, Request, Response } from "express";
import { supabase } from "./db";
import { requireAuth, getUserId } from "./auth";
import { writeLimiter } from "./rate-limit";
import { relationshipValues } from "@shared/peer-feedback-questions";
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
      const count = Math.min(Math.max(parseInt(String(req.body?.count ?? 1), 10) || 1, 1), MAX_INVITES_PER_REQUEST);
      const instrument = normalizeInstrument(req.body?.instrument);
      const relationship = normalizeRelationship(req.body?.relationship);

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

      if (error) {
        console.error("Peer invite creation error:", error);
        return res.status(500).json({ error: "Failed to create invites" });
      }

      res.json({ invites: data });
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
