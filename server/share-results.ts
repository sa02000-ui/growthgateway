import type { Express } from "express";
import pg from "pg";
import { supabase } from "./db";
import { requireAuth, getUserId } from "./auth";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS shared_results (
          token TEXT PRIMARY KEY,
          result_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        )`,
      )
      .then(() => undefined);
  }
  return tableReady;
}

function generateShareToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 4; i++) token += chars[Math.floor(Math.random() * chars.length)];
  token += '-';
  for (let i = 0; i < 2; i++) token += chars[Math.floor(Math.random() * chars.length)];
  token += '-';
  for (let i = 0; i < 2; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

export function registerShareResultsRoutes(app: Express) {
  app.post("/api/share-result", requireAuth, async (req, res) => {
    try {
      await ensureTable();
      const userId = getUserId(req);
      const { resultId } = req.body;

      if (!resultId) {
        return res.status(400).json({ error: "resultId is required" });
      }

      const { data: result, error: resultError } = await supabase
        .from('results_log')
        .select('id, user_id')
        .eq('id', resultId)
        .single();

      if (resultError || !result) {
        return res.status(404).json({ error: "Assessment result not found" });
      }

      if (result.user_id !== userId) {
        return res.status(403).json({ error: "You can only share your own results" });
      }

      const existing = await pool.query(
        "SELECT token, expires_at FROM shared_results WHERE result_id = $1 AND user_id = $2 AND expires_at > NOW()",
        [resultId, userId],
      );

      if (existing.rows.length > 0) {
        return res.json({
          token: existing.rows[0].token,
          expiresAt: existing.rows[0].expires_at,
        });
      }

      const token = generateShareToken().toLowerCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await pool.query(
        "INSERT INTO shared_results (token, result_id, user_id, expires_at) VALUES ($1, $2, $3, $4)",
        [token, resultId, userId, expiresAt],
      );

      res.json({ token, expiresAt });
    } catch (error) {
      console.error('Share result error:', error);
      res.status(500).json({ error: "Failed to generate share link" });
    }
  });

  app.get("/api/shared-result/:token", async (req, res) => {
    try {
      await ensureTable();
      const normalizedToken = req.params.token.toLowerCase();

      const tokenRow = await pool.query(
        "SELECT result_id, expires_at FROM shared_results WHERE token = $1",
        [normalizedToken],
      );

      if (tokenRow.rows.length === 0) {
        return res.status(404).json({ error: "Share link not found or expired" });
      }

      const { result_id: resultId, expires_at: expiresAt } = tokenRow.rows[0];

      if (new Date(expiresAt) < new Date()) {
        await pool.query("DELETE FROM shared_results WHERE token = $1", [normalizedToken]);
        return res.status(410).json({ error: "Share link has expired" });
      }

      const { data: result, error } = await supabase
        .from('results_log')
        .select('id, assessment_type, scores, completed_at')
        .eq('id', resultId)
        .single();

      if (error || !result) {
        return res.status(404).json({ error: "Assessment result not found" });
      }

      res.json({
        result: {
          assessmentType: result.assessment_type,
          scores: result.scores,
          completedAt: result.completed_at,
        },
        expiresAt,
      });
    } catch (error) {
      console.error('Get shared result error:', error);
      res.status(500).json({ error: "Failed to retrieve shared result" });
    }
  });
}
