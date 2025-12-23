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
import { registerEmailRoutes } from "./email";
import { registerShareResultsRoutes } from "./share-results";
import { getAssessmentBySlug } from "./assessment-loader";
import { calculateAssessmentScore } from "@shared/scoring-engine";

const ASSESSMENTS_SEED_DATA = [
  { category: "Who Am I", name: "IPIP-NEO-120", popular_equivalent: "Similar to MBTI / 16 Personalities", scientific_reference: "Goldberg (1999)", description: "The scientific gold standard for personality profiling. Measures the Big Five traits: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.", question_count: 120, estimated_time: "15-20 mins" },
  { category: "Who Am I", name: "Schwartz Portrait Values (PVQ)", popular_equivalent: "Similar to Enneagram", scientific_reference: "Schwartz (1992)", description: "Identifies your core drivers and motivations (e.g., Tradition, Power, Benevolence) rather than just behavior.", question_count: 21, estimated_time: "5-7 mins" },
  { category: "Who Am I", name: "VIA Inventory of Strengths", popular_equivalent: "Similar to CliftonStrengths", scientific_reference: "Peterson & Seligman (2004)", description: "Focuses on positive psychology to identify your top character strengths and virtues.", question_count: 24, estimated_time: "5-8 mins" },
  { category: "Who Am I", name: "Short Dark Triad (SD3)", popular_equivalent: "Dark Side Profiling", scientific_reference: "Paulhus & Jones (2011)", description: "Measures the three socially aversive traits: Machiavellianism, Narcissism, and Psychopathy. Useful for leadership derailer awareness.", question_count: 27, estimated_time: "5-7 mins" },
  { category: "How I Think", name: "ICAR-16 Cognitive Ability", popular_equivalent: "Similar to IQ Test", scientific_reference: "Condon & Revelle (2014)", description: "An objective measure of Matrix Reasoning, 3D Rotation, and Verbal Reasoning skills.", question_count: 16, estimated_time: "10-12 mins" },
  { category: "How I Think", name: "Short Grit Scale (Grit-S)", popular_equivalent: "Hustle / Perseverance Score", scientific_reference: "Duckworth & Quinn (2009)", description: "Measures your passion and perseverance for long-term goals, a key predictor of success.", question_count: 8, estimated_time: "2-3 mins" },
  { category: "How I Think", name: "Need for Cognition (NCS-6)", popular_equivalent: "Curiosity Quotient", scientific_reference: "Cacioppo & Petty (1982)", description: "Measures the tendency to engage in and enjoy thinking. Distinguishes 'Deep Thinkers' from 'Shortcut Takers'.", question_count: 6, estimated_time: "2 mins" },
  { category: "How I Think", name: "General Decision Making Style", popular_equivalent: "Decision Style Profile", scientific_reference: "Scott & Bruce (1995)", description: "Analyzes how you make decisions: Rational, Intuitive, Dependent, Avoidant, or Spontaneous.", question_count: 25, estimated_time: "5-8 mins" },
  { category: "How I Interact", name: "TEIQue-SF", popular_equivalent: "Emotional Intelligence (EQ)", scientific_reference: "Petrides (2009)", description: "Measures global emotional intelligence, including well-being, self-control, and sociability.", question_count: 30, estimated_time: "7-10 mins" },
  { category: "How I Interact", name: "O*NET Interest Profiler", popular_equivalent: "Holland Codes / Career Aptitude", scientific_reference: "Rounds et al. (1999)", description: "Maps your interests to the 6 RIASEC themes (Realistic, Investigative, Artistic, etc.) to find vocational fit.", question_count: 60, estimated_time: "10-15 mins" },
  { category: "How I Interact", name: "Experiences in Close Relationships", popular_equivalent: "Similar to Love Languages / Attachment", scientific_reference: "Fraley et al. (2000)", description: "Measures Attachment Style (Secure, Anxious, Avoidant) in close relationships.", question_count: 12, estimated_time: "3-5 mins" },
  { category: "How I Interact", name: "Rahim Organizational Conflict", popular_equivalent: "Conflict Style (Thomas-Kilmann)", scientific_reference: "Rahim (1983)", description: "Identifies how you handle conflict: Competing, Collaborating, Compromising, Avoiding, or Accommodating.", question_count: 28, estimated_time: "6-8 mins" },
  { category: "How I Feel", name: "Perceived Stress Scale (PSS-10)", popular_equivalent: "Stress Level Test", scientific_reference: "Cohen (1983)", description: "The most widely used instrument for measuring the perception of stress in daily life.", question_count: 10, estimated_time: "3 mins" },
  { category: "How I Feel", name: "Satisfaction With Life Scale", popular_equivalent: "Happiness Index", scientific_reference: "Diener (1985)", description: "A short, valid measure of global life satisfaction and subjective well-being.", question_count: 5, estimated_time: "1-2 mins" },
  { category: "How I Feel", name: "Brief Resilience Scale", popular_equivalent: "Bounce-Back Factor", scientific_reference: "Smith et al. (2008)", description: "Measures the ability to bounce back or recover from stress and adversity.", question_count: 6, estimated_time: "2 mins" },
  { category: "How I Feel", name: "Flourishing Scale", popular_equivalent: "Well-being Index", scientific_reference: "Diener (2009)", description: "Measures self-perceived success in relationships, self-esteem, purpose, and optimism.", question_count: 8, estimated_time: "2-3 mins" },
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAIInsightsRoutes(app);
  registerFeedbackTokenRoutes(app);
  registerEmailRoutes(app);
  registerShareResultsRoutes(app);

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

  // Get all assessments from library
  app.get("/api/assessments-library", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('assessments_library')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('Assessments library fetch error:', error);
        // Fallback to seed data if database schema cache not ready
        const fallbackData = ASSESSMENTS_SEED_DATA.map((a, index) => ({
          id: `seed-${index}`,
          ...a,
          is_active: true,
        }));
        return res.json({ assessments: fallbackData });
      }

      res.json({ assessments: data || [] });
    } catch (error) {
      console.error('Assessments library error:', error);
      // Fallback to seed data on any error
      const fallbackData = ASSESSMENTS_SEED_DATA.map((a, index) => ({
        id: `seed-${index}`,
        ...a,
        is_active: true,
      }));
      res.json({ assessments: fallbackData });
    }
  });

  // Seed assessments library (run once)
  app.post("/api/assessments-library/seed", async (_req, res) => {
    try {
      const { data: existing } = await supabase
        .from('assessments_library')
        .select('id')
        .limit(1);

      if (existing && existing.length > 0) {
        return res.json({ message: "Already seeded", count: existing.length });
      }

      const { data, error } = await supabase
        .from('assessments_library')
        .insert(ASSESSMENTS_SEED_DATA)
        .select();

      if (error) {
        console.error('Seed error:', error);
        return res.status(500).json({ error: "Failed to seed assessments", details: error.message });
      }

      res.json({ success: true, count: data?.length || 0 });
    } catch (error) {
      console.error('Seed error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get questions for any assessment by slug
  app.get("/api/assessments/:slug/questions", (req, res) => {
    const { slug } = req.params;
    const assessment = getAssessmentBySlug(slug);
    
    if (!assessment) {
      return res.status(404).json({ error: `Assessment '${slug}' not found` });
    }
    
    res.json(assessment);
  });

  // Get IPIP-NEO-120 questions (legacy endpoint)
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

  // Submit any assessment - generic endpoint
  app.post("/api/assessments/:slug/submit", async (req, res) => {
    try {
      const { slug } = req.params;
      const { userId, responses } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const assessment = getAssessmentBySlug(slug);
      if (!assessment) {
        return res.status(404).json({ error: `Assessment '${slug}' not found` });
      }

      const questionData = assessment.questions.map(q => ({
        questionNumber: q.questionNumber,
        text: q.text,
        traitKey: q.traitKey,
        facetKey: q.facetKey,
        reverseCoded: q.reverseCoded,
        correctOption: q.correctOption,
        options: q.options,
        inputType: assessment.inputType,
      }));

      const config = {
        slug: assessment.slug,
        scoringAlgorithm: assessment.scoringAlgorithm,
        scoringType: assessment.scoringType,
        inputType: assessment.inputType,
        traitConfig: assessment.traitConfig,
        questions: questionData,
      };

      const result = calculateAssessmentScore(config, responses);

      const scoresObject = result.traitScores.reduce((acc, ts) => {
        acc[ts.key] = ts.score;
        return acc;
      }, {} as Record<string, number>);

      const { data, error } = await supabase
        .from('results_log')
        .insert({
          user_id: userId,
          assessment_type: assessment.name,
          assessment_slug: slug,
          responses: responses,
          scores: scoresObject,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ 
          error: "Failed to save assessment results",
          code: error.code,
          message: error.message
        });
      }

      res.json({ 
        success: true, 
        resultId: data.id,
        result: {
          ...result,
          assessmentName: assessment.name,
          category: assessment.category,
          traitConfig: assessment.traitConfig,
        }
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

  // ==================== GROUP ENDPOINTS ====================

  // Create a new group
  app.post("/api/groups", async (req, res) => {
    try {
      const { name, type, privacyLevel, createdBy } = req.body;

      if (!name || !createdBy) {
        return res.status(400).json({ error: "name and createdBy are required" });
      }

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          type: type || 'team',
          privacy_level: privacyLevel || 'anonymous',
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        console.error('Group creation error:', error);
        return res.status(500).json({ error: "Failed to create group", details: error.message });
      }

      res.json({ success: true, group: data });
    } catch (error) {
      console.error('Group creation error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // List groups for a user
  app.get("/api/groups/:userId", async (req, res) => {
    try {
      const { userId } = req.params;

      const { data: ownedGroups, error: ownedError } = await supabase
        .from('groups')
        .select('*')
        .eq('created_by', userId);

      if (ownedError) {
        console.error('Groups fetch error:', ownedError);
        return res.status(500).json({ error: "Failed to fetch groups" });
      }

      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberError) {
        console.error('Group members fetch error:', memberError);
      }

      const memberGroupIds = memberGroups?.map(m => m.group_id) || [];
      
      let allGroups = ownedGroups || [];
      if (memberGroupIds.length > 0) {
        const { data: additionalGroups } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds);
        
        if (additionalGroups) {
          const existingIds = new Set(allGroups.map(g => g.id));
          additionalGroups.forEach(g => {
            if (!existingIds.has(g.id)) {
              allGroups.push(g);
            }
          });
        }
      }

      res.json({ groups: allGroups });
    } catch (error) {
      console.error('Groups fetch error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add member to a group
  app.post("/api/groups/:groupId/members", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { email, name, role, userId } = req.body;

      if (!email && !userId) {
        return res.status(400).json({ error: "email or userId is required" });
      }

      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId || null,
          email: email || null,
          name: name || null,
          role: role || 'member',
        })
        .select()
        .single();

      if (error) {
        console.error('Add member error:', error);
        return res.status(500).json({ error: "Failed to add member", details: error.message });
      }

      res.json({ success: true, member: data });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get members of a group
  app.get("/api/groups/:groupId/members", async (req, res) => {
    try {
      const { groupId } = req.params;

      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) {
        console.error('Group members fetch error:', error);
        return res.status(500).json({ error: "Failed to fetch group members" });
      }

      res.json({ members: data });
    } catch (error) {
      console.error('Group members fetch error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Remove member from a group
  app.delete("/api/groups/:groupId/members/:memberId", async (req, res) => {
    try {
      const { groupId, memberId } = req.params;

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId)
        .eq('group_id', groupId);

      if (error) {
        console.error('Remove member error:', error);
        return res.status(500).json({ error: "Failed to remove member" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete a group
  app.delete("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;

      await supabase.from('group_members').delete().eq('group_id', groupId);

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Delete group error:', error);
        return res.status(500).json({ error: "Failed to delete group" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete group error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
