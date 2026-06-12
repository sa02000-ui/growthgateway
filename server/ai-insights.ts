import OpenAI from "openai";
import type { Express, Request, Response } from "express";
import pg from "pg";
import { supabase } from "./db";
import { requireAuth, getUserId } from "./auth";
import { aiLimiter } from "./rate-limit";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const SYSTEM_PROMPT = `You are a Senior Industrial-Organizational Psychologist specializing in personality assessment and personal development. You analyze personality data from the Big Five (OCEAN) model to provide growth insights.

Your analysis considers:
- Self-perception vs Network (peer) perception alignment
- Demographic and life context shifts that may influence personality expression
- Practical implications for personal and professional growth

Provide exactly 3 concise sentences:
1. Key insight about the alignment between self and peer perceptions
2. Contextual observation considering demographics or life circumstances
3. Actionable growth recommendation

Keep the tone warm, professional, and encouraging. Focus on growth opportunities rather than deficits. Use plain language accessible to non-psychologists.`;

interface TraitScores {
  N: number;
  E: number;
  O: number;
  A: number;
  C: number;
}

export function registerAIInsightsRoutes(app: Express): void {
  app.get("/api/ai-insights/:userId", aiLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const { data: latestResult, error: resultError } = await supabase
        .from('results_log')
        .select('scores, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (resultError || !latestResult) {
        return res.status(404).json({ error: "No assessment results found" });
      }

      const selfScores = latestResult.scores as TraitScores;

      const { data: peerFeedback, error: peerError } = await supabase
        .from('peer_feedback')
        .select('scores')
        .eq('target_user_id', userId);

      const validPeerFeedback = (peerError || !peerFeedback) ? [] : peerFeedback;

      let peerScores: TraitScores | null = null;
      if (validPeerFeedback.length >= 3) {
        const avgScores: TraitScores = { N: 0, E: 0, O: 0, A: 0, C: 0 };
        const traits: (keyof TraitScores)[] = ['N', 'E', 'O', 'A', 'C'];
        
        validPeerFeedback.forEach(fb => {
          const scores = fb.scores as TraitScores;
          traits.forEach(trait => {
            avgScores[trait] += scores[trait] || 0;
          });
        });
        
        traits.forEach(trait => {
          avgScores[trait] = Math.round(avgScores[trait] / validPeerFeedback.length);
        });
        
        peerScores = avgScores;
      }

      let profile: Record<string, any> | null = null;
      let lifeEvents: { event_type: string; year: number; significance: number }[] = [];
      try {
        const profileResult = await pool.query(
          "SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1",
          [userId]
        );
        profile = profileResult.rows[0] || null;

        const eventsResult = await pool.query(
          "SELECT event_type, year, significance FROM life_events_log WHERE user_id = $1 ORDER BY year DESC LIMIT 5",
          [userId]
        );
        lifeEvents = eventsResult.rows;
      } catch (e) {
        console.error("AI Insights profile/life-events fetch error:", e);
      }

      const traitNames: Record<keyof TraitScores, string> = {
        N: 'Neuroticism',
        E: 'Extraversion',
        O: 'Openness',
        A: 'Agreeableness',
        C: 'Conscientiousness'
      };

      let analysisPrompt = `Analyze this personality profile:

SELF-PERCEPTION (Big Five scores, 0-100 scale):
${Object.entries(selfScores).map(([trait, score]) => `- ${traitNames[trait as keyof TraitScores]}: ${Math.round(score)}%`).join('\n')}`;

      if (peerScores) {
        analysisPrompt += `

NETWORK PERCEPTION (Average of ${peerFeedback?.length} peers):
${Object.entries(peerScores).map(([trait, score]) => `- ${traitNames[trait as keyof TraitScores]}: ${score}%`).join('\n')}`;
      } else {
        analysisPrompt += `

NETWORK PERCEPTION: Not enough peer responses yet (minimum 3 required for privacy).`;
      }

      if (profile) {
        const contextItems = [];
        if (profile.profession) contextItems.push(`Profession: ${profile.profession}`);
        if (profile.education_level) contextItems.push(`Education: ${profile.education_level}`);
        if (profile.cultural_background) contextItems.push(`Cultural background: ${profile.cultural_background}`);
        
        if (contextItems.length > 0) {
          analysisPrompt += `

DEMOGRAPHIC CONTEXT:
${contextItems.join('\n')}`;
        }
      }

      if (lifeEvents.length > 0) {
        const recentEvents = lifeEvents.map(
          (e) => `${e.event_type} (${e.year})`
        );

        analysisPrompt += `

RECENT LIFE EVENTS (most recent first):
${recentEvents.join(', ')}`;
      }

      analysisPrompt += `

Provide your 3-sentence growth insight:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: analysisPrompt }
        ],
        max_completion_tokens: 300,
      });

      const insight = completion.choices[0]?.message?.content || "Unable to generate insight at this time.";

      res.json({
        insight,
        generatedAt: new Date().toISOString(),
        hasPeerData: !!peerScores,
        peerCount: validPeerFeedback.length,
      });

    } catch (error) {
      console.error("AI Insights error:", error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });
}
