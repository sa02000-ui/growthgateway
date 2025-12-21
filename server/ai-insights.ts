import OpenAI from "openai";
import type { Express, Request, Response } from "express";
import { supabase } from "./db";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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
  app.get("/api/ai-insights/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

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

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const { data: lifeEvents } = await supabase
        .from('life_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

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

      if (lifeEvents) {
        const recentEvents = [];
        if (lifeEvents.new_job) recentEvents.push('Career change');
        if (lifeEvents.relocation) recentEvents.push('Relocation');
        if (lifeEvents.marriage) recentEvents.push('Marriage/Partnership');
        if (lifeEvents.divorce) recentEvents.push('Divorce/Separation');
        if (lifeEvents.loss_of_loved_one) recentEvents.push('Loss of loved one');
        if (lifeEvents.new_child) recentEvents.push('New child');
        if (lifeEvents.health_change) recentEvents.push('Health change');
        if (lifeEvents.retirement) recentEvents.push('Retirement');
        
        if (recentEvents.length > 0) {
          analysisPrompt += `

RECENT LIFE EVENTS (past 12 months):
${recentEvents.join(', ')}`;
        }
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
