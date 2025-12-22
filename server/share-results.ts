import type { Express } from "express";
import { supabase } from "./db";
import crypto from 'crypto';

const shareTokenCache = new Map<string, { resultId: string; expiresAt: Date }>();
const resultToTokenCache = new Map<string, string>();

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
  app.post("/api/share-result", async (req, res) => {
    try {
      const { resultId, userId } = req.body;

      if (!resultId || !userId) {
        return res.status(400).json({ error: "resultId and userId are required" });
      }

      if (resultToTokenCache.has(resultId)) {
        const existingToken = resultToTokenCache.get(resultId)!;
        const cached = shareTokenCache.get(existingToken);
        if (cached && cached.expiresAt > new Date()) {
          return res.json({ token: existingToken, expiresAt: cached.expiresAt });
        }
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

      const token = generateShareToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      shareTokenCache.set(token.toLowerCase(), { resultId, expiresAt });
      resultToTokenCache.set(resultId, token.toLowerCase());

      res.json({ token, expiresAt });
    } catch (error) {
      console.error('Share result error:', error);
      res.status(500).json({ error: "Failed to generate share link" });
    }
  });

  app.get("/api/shared-result/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const normalizedToken = token.toLowerCase();

      const cached = shareTokenCache.get(normalizedToken);
      if (!cached) {
        return res.status(404).json({ error: "Share link not found or expired" });
      }

      if (cached.expiresAt < new Date()) {
        shareTokenCache.delete(normalizedToken);
        return res.status(410).json({ error: "Share link has expired" });
      }

      const { data: result, error } = await supabase
        .from('results_log')
        .select('id, assessment_type, scores, completed_at')
        .eq('id', cached.resultId)
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
        expiresAt: cached.expiresAt,
      });
    } catch (error) {
      console.error('Get shared result error:', error);
      res.status(500).json({ error: "Failed to retrieve shared result" });
    }
  });
}
