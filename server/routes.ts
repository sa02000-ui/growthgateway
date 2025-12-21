import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabase } from "./db";
import { calculateAllTraitScores, validateResponses } from "@shared/scoring";
import { assessmentResponsesSchema, traitScoresSchema } from "@shared/schema";
import { questions } from "@shared/ipip-neo-120";
import { peerQuestions, calculatePeerScores } from "@shared/peer-feedback-questions";
import { registerAIInsightsRoutes } from "./ai-insights";
import { registerFeedbackTokenRoutes } from "./feedback-tokens";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAIInsightsRoutes(app);
  registerFeedbackTokenRoutes(app);

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
        console.error('Supabase insert error - Full details:', JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId,
          userIdType: typeof userId
        }, null, 2));
        return res.status(500).json({ 
          error: "Failed to save assessment results",
          code: error.code,
          message: error.message
        });
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

  // Get peer feedback questions (public)
  app.get("/api/peer-feedback/questions", (_req, res) => {
    res.json({ questions: peerQuestions });
  });

  // Get user info for peer feedback page (public, limited info - no PII)
  app.get("/api/peer-feedback/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Check if user has any self-assessments (proves user exists without exposing PII)
      const { data: results, error } = await supabase
        .from('results_log')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      if (error || !results || results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return generic name - no PII exposed
      res.json({ userName: 'This person', userId });
    } catch (error) {
      console.error('User lookup error:', error);
      res.status(404).json({ error: "User not found" });
    }
  });

  // Submit peer feedback (public)
  app.post("/api/peer-feedback/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { responses, peerName, isAnonymous } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({ error: "responses are required" });
      }

      const scores = calculatePeerScores(responses);
      
      const parsedScores = traitScoresSchema.safeParse(scores);
      if (!parsedScores.success) {
        return res.status(400).json({ error: "Invalid scores calculated" });
      }

      const { data, error } = await supabase
        .from('peer_feedback')
        .insert({
          target_user_id: userId,
          scores: scores,
          peer_name: isAnonymous ? null : peerName || null,
          is_anonymous: isAnonymous ? 'true' : 'false',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase peer feedback insert error - Full details:', JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          targetUserId: userId
        }, null, 2));
        return res.status(500).json({ 
          error: "Failed to save peer feedback", 
          code: error.code,
          message: error.message 
        });
      }

      res.json({ success: true, feedbackId: data.id });
    } catch (error) {
      console.error('Peer feedback submission error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all peer feedback for a user (authenticated)
  app.get("/api/peer-feedback/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const { data, error } = await supabase
        .from('peer_feedback')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        return res.status(500).json({ error: "Failed to fetch peer feedback" });
      }

      // Calculate average scores across all feedback
      let averageScores = null;
      if (data && data.length > 0) {
        const traits = ['N', 'E', 'O', 'A', 'C'] as const;
        averageScores = {} as Record<string, number>;
        
        for (const trait of traits) {
          const sum = data.reduce((acc, fb) => {
            const scores = fb.scores as Record<string, number>;
            return acc + (scores[trait] || 0);
          }, 0);
          averageScores[trait] = sum / data.length;
        }
      }

      res.json({ 
        feedback: data,
        count: data?.length || 0,
        averageScores 
      });
    } catch (error) {
      console.error('Peer feedback fetch error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save profile history snapshot
  app.post("/api/profile-history", async (req, res) => {
    try {
      const { userId, snapshot } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      if (!snapshot) {
        return res.status(400).json({ error: "snapshot is required" });
      }

      const { data, error } = await supabase
        .from('profile_history')
        .insert({
          user_id: userId,
          snapshot: snapshot,
        })
        .select()
        .single();

      if (error) {
        console.error('Profile history save error:', error);
        return res.status(500).json({ 
          error: "Failed to save profile history",
          message: error.message
        });
      }

      res.json({ success: true, historyId: data.id });
    } catch (error) {
      console.error('Profile history error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DEBUG: Inject test data (temporary endpoint for testing)
  app.post("/api/debug/inject-test-data", async (req, res) => {
    try {
      const { userId, accessToken } = req.body;

      if (!userId || !accessToken) {
        return res.status(400).json({ error: "userId and accessToken are required" });
      }

      // Create an authenticated Supabase client using the user's access token
      const { createClient } = await import('@supabase/supabase-js');
      const authenticatedClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        }
      );

      // Verify the user
      const { data: { user }, error: authError } = await authenticatedClient.auth.getUser();
      if (authError || !user) {
        return res.status(401).json({ error: "Invalid access token", details: authError?.message });
      }

      if (user.id !== userId) {
        return res.status(403).json({ error: "User ID mismatch" });
      }

      const testScores = { O: 80, C: 40, E: 70, A: 60, N: 30 };
      const mockResponses: Record<string, number> = {};
      for (let i = 1; i <= 120; i++) {
        mockResponses[i.toString()] = 3;
      }

      const { data, error } = await authenticatedClient
        .from('results_log')
        .insert({
          user_id: user.id,
          assessment_type: 'IPIP-NEO-120',
          responses: mockResponses,
          scores: testScores,
          neuroticism_score: testScores.N,
          extraversion_score: testScores.E,
          openness_score: testScores.O,
          agreeableness_score: testScores.A,
          conscientiousness_score: testScores.C,
        })
        .select()
        .single();

      if (error) {
        console.error('Debug inject error - Full details:', JSON.stringify({
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: user.id
        }, null, 2));
        return res.status(500).json({ 
          error: "Failed to inject test data",
          code: error.code,
          message: error.message
        });
      }

      res.json({ success: true, resultId: data.id, scores: testScores });
    } catch (error) {
      console.error('Debug inject error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
