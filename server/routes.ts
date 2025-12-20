import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabase } from "./db";
import { calculateAllTraitScores, validateResponses } from "@shared/scoring";
import { assessmentResponsesSchema } from "@shared/schema";
import { questions } from "@shared/ipip-neo-120";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Supabase configuration endpoint for frontend
  app.get("/api/config", (_req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_KEY,
    });
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get IPIP-NEO-120 questions
  app.get("/api/assessment/questions", (_req, res) => {
    res.json({ questions });
  });

  // Submit assessment responses and get scores
  app.post("/api/assessment/submit", async (req, res) => {
    try {
      const { userId, responses } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const parsedResponses = assessmentResponsesSchema.safeParse(responses);
      if (!parsedResponses.success) {
        return res.status(400).json({ 
          error: "Invalid responses format", 
          details: parsedResponses.error.errors 
        });
      }

      const validation = validateResponses(parsedResponses.data);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Incomplete assessment", 
          details: validation.errors 
        });
      }

      const scores = calculateAllTraitScores(parsedResponses.data);

      const { data, error } = await supabase
        .from('results_log')
        .insert({
          user_id: userId,
          assessment_type: 'IPIP-NEO-120',
          responses: parsedResponses.data,
          scores: scores,
          neuroticism_score: scores.N,
          extraversion_score: scores.E,
          openness_score: scores.O,
          agreeableness_score: scores.A,
          conscientiousness_score: scores.C,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ error: "Failed to save assessment results" });
      }

      res.json({ 
        success: true, 
        resultId: data.id,
        scores 
      });
    } catch (error) {
      console.error('Assessment submission error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's assessment history
  app.get("/api/assessment/results/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const { data, error } = await supabase
        .from('results_log')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        return res.status(500).json({ error: "Failed to fetch assessment results" });
      }

      res.json({ results: data });
    } catch (error) {
      console.error('Assessment results fetch error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single assessment result
  app.get("/api/assessment/result/:resultId", async (req, res) => {
    try {
      const { resultId } = req.params;

      const { data, error } = await supabase
        .from('results_log')
        .select('*')
        .eq('id', resultId)
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        return res.status(404).json({ error: "Assessment result not found" });
      }

      res.json({ result: data });
    } catch (error) {
      console.error('Assessment result fetch error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
