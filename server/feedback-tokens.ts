import type { Express, Request, Response } from "express";
import { supabase } from "./db";
import crypto from "crypto";

// In-memory fallback cache for when database schema cache is stale
const tokenCache: Map<string, string> = new Map(); // userId -> token
const reverseCache: Map<string, string> = new Map(); // token -> userId

function generateToken(): string {
  const bytes = crypto.randomBytes(8);
  const base64 = bytes.toString('base64url');
  const parts = [
    base64.slice(0, 4),
    base64.slice(4, 6),
    base64.slice(6, 8),
  ];
  return parts.join('-').toLowerCase();
}

export function registerFeedbackTokenRoutes(app: Express): void {
  app.post("/api/feedback-token/generate", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const { data: existing } = await supabase
        .from('feedback_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (existing) {
        return res.json({ token: existing.token });
      }

      const token = generateToken();

      const { data, error } = await supabase
        .from('feedback_tokens')
        .insert({ user_id: userId, token })
        .select()
        .single();

      if (error) {
        console.error('Token generation error:', error);
        return res.status(500).json({ error: "Failed to generate token" });
      }

      res.json({ token: data.token });
    } catch (error) {
      console.error("Token generation error:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  app.get("/api/feedback-token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const normalizedToken = token.trim().toLowerCase();
      
      console.log(`[Token Lookup] Searching for token: "${normalizedToken}"`);

      const { data, error } = await supabase
        .from('feedback_tokens')
        .select('user_id, token')
        .ilike('token', normalizedToken)
        .single();

      if (error) {
        console.log(`[Token Lookup] Database error:`, error.message);
        // Check in-memory cache as fallback
        const cachedUserId = reverseCache.get(normalizedToken);
        if (cachedUserId) {
          console.log(`[Token Lookup] Found in cache: ${cachedUserId}`);
          return res.json({ userId: cachedUserId });
        }
        return res.status(404).json({ error: "Invalid token" });
      }
      
      if (!data) {
        console.log(`[Token Lookup] No matching token found`);
        // Check in-memory cache as fallback
        const cachedUserId = reverseCache.get(normalizedToken);
        if (cachedUserId) {
          console.log(`[Token Lookup] Found in cache: ${cachedUserId}`);
          return res.json({ userId: cachedUserId });
        }
        return res.status(404).json({ error: "Invalid token" });
      }

      console.log(`[Token Lookup] Found user_id: ${data.user_id}`);
      res.json({ userId: data.user_id });
    } catch (error) {
      console.error("Token lookup error:", error);
      // Check in-memory cache as fallback
      const { token } = req.params;
      const normalizedToken = token.trim().toLowerCase();
      const cachedUserId = reverseCache.get(normalizedToken);
      if (cachedUserId) {
        return res.json({ userId: cachedUserId });
      }
      res.status(404).json({ error: "Invalid token" });
    }
  });

  app.get("/api/my-feedback-token/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Try database first
      let { data, error: selectError } = await supabase
        .from('feedback_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      // If database error (schema cache stale), use in-memory fallback
      if (selectError && selectError.code === 'PGRST205') {
        console.log('[Token] Database schema cache stale, using in-memory fallback');
        let cachedToken = tokenCache.get(userId);
        if (!cachedToken) {
          cachedToken = generateToken();
          tokenCache.set(userId, cachedToken);
          reverseCache.set(cachedToken, userId);
        }
        return res.json({ token: cachedToken });
      }

      if (!data) {
        const token = generateToken();
        const { data: newData, error } = await supabase
          .from('feedback_tokens')
          .insert({ user_id: userId, token })
          .select()
          .single();

        if (error || !newData) {
          // Fallback to in-memory if insert fails
          console.log('[Token] Insert failed, using in-memory fallback');
          let cachedToken = tokenCache.get(userId);
          if (!cachedToken) {
            cachedToken = token;
            tokenCache.set(userId, cachedToken);
            reverseCache.set(cachedToken, userId);
          }
          return res.json({ token: cachedToken });
        }
        data = newData;
      }

      res.json({ token: data?.token });
    } catch (error) {
      console.error("Token fetch error:", error);
      // Final fallback
      const { userId } = req.params;
      let cachedToken = tokenCache.get(userId);
      if (!cachedToken) {
        cachedToken = generateToken();
        tokenCache.set(userId, cachedToken);
        reverseCache.set(cachedToken, userId);
      }
      res.json({ token: cachedToken });
    }
  });
}
