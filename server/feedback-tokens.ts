import type { Express, Request, Response } from "express";
import { supabase } from "./db";
import { requireAuth, getUserId } from "./auth";
import crypto from "crypto";

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
  app.post("/api/feedback-token/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

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
      const cleanToken = token.trim();
      const normalizedToken = cleanToken.toLowerCase();
      const noHyphens = normalizedToken.replace(/-/g, '');
      
      console.log(`[Token Lookup] Searching for token: "${normalizedToken}"`);

      const { data: allTokens } = await supabase
        .from('feedback_tokens')
        .select('user_id, token');

      if (!allTokens || allTokens.length === 0) {
        console.log(`[Token Lookup] No tokens in database`);
        return res.status(404).json({ error: "Invalid token" });
      }

      const match = allTokens.find(t => {
        const dbToken = (t.token || '').toLowerCase();
        const dbNoHyphens = dbToken.replace(/-/g, '');
        return dbToken === normalizedToken || 
               dbNoHyphens === noHyphens || 
               dbToken === cleanToken.toLowerCase();
      });

      if (!match) {
        console.log(`[Token Lookup] No matching token found`);
        return res.status(404).json({ error: "Invalid token" });
      }

      console.log(`[Token Lookup] Found user_id: ${match.user_id}`);
      res.json({ userId: match.user_id });
    } catch (error) {
      console.error("Token lookup error:", error);
      res.status(404).json({ error: "Invalid token" });
    }
  });

  app.get("/api/my-feedback-token/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      let { data } = await supabase
        .from('feedback_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (!data) {
        const token = generateToken();
        const { data: newData, error } = await supabase
          .from('feedback_tokens')
          .insert({ user_id: userId, token })
          .select()
          .single();

        if (error || !newData) {
          console.error('Token insert error:', error);
          return res.status(500).json({ error: "Failed to create token" });
        }
        data = newData;
      }

      res.json({ token: data?.token });
    } catch (error) {
      console.error("Token fetch error:", error);
      res.status(500).json({ error: "Failed to fetch token" });
    }
  });
}
