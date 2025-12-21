import type { Express, Request, Response } from "express";
import { supabase } from "./db";
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

      const { data, error } = await supabase
        .from('feedback_tokens')
        .select('user_id')
        .eq('token', token)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Invalid token" });
      }

      res.json({ userId: data.user_id });
    } catch (error) {
      console.error("Token lookup error:", error);
      res.status(404).json({ error: "Invalid token" });
    }
  });

  app.get("/api/my-feedback-token/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

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
          return res.status(500).json({ error: "Failed to generate token" });
        }
        data = newData;
      }

      res.json({ token: data?.token });
    } catch (error) {
      console.error("Token fetch error:", error);
      res.status(500).json({ error: "Failed to get token" });
    }
  });
}
