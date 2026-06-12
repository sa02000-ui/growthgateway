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
import { registerProfileRoutes } from "./profile-routes";
import { calculateAssessmentScore, type QuestionData } from "@shared/scoring-engine";
import { requireAuth, getUserId } from "./auth";
import { writeLimiter } from "./rate-limit";

// Import all assessment seed data
import { IPIP_NEO_120, SCHWARTZ_PVQ_21, SHORT_DARK_TRIAD_SD3 } from "@shared/assessments/category-one-seed";
import { ICAR_16, GRIT_SCALE_8 } from "@shared/assessments/category-two-seed";
import { RIASEC_30, TEIQUE_SF_30 } from "@shared/assessments/category-three-seed";
import { 
  PSS_10_CONFIG, PSS_10_QUESTIONS,
  SWLS_CONFIG, SWLS_QUESTIONS,
  BRS_CONFIG, BRS_QUESTIONS,
  FS_CONFIG, FS_QUESTIONS
} from "@shared/assessments/category-four-seed";

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

async function userOwnsGroup(groupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('groups')
    .select('created_by')
    .eq('id', groupId)
    .single();
  if (error || !data) return false;
  return data.created_by === userId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAIInsightsRoutes(app);
  registerFeedbackTokenRoutes(app);
  registerEmailRoutes(app);
  registerShareResultsRoutes(app);
  registerProfileRoutes(app);

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

  // Build static assessment library with UUIDs from seed data
  const buildAssessmentLibrary = () => {
    const allSeedData = [
      IPIP_NEO_120, SCHWARTZ_PVQ_21, SHORT_DARK_TRIAD_SD3,
      ICAR_16, GRIT_SCALE_8, RIASEC_30, TEIQUE_SF_30,
    ];
    const cat4Configs = [PSS_10_CONFIG, SWLS_CONFIG, BRS_CONFIG, FS_CONFIG];
    
    // Use slug as deterministic UUID seed
    const generateId = (slug: string) => {
      const hash = slug.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
      return `${Math.abs(hash).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
    };
    
    const library: Record<string, unknown>[] = [];
    
    for (const a of allSeedData) {
      library.push({
        id: generateId(a.slug),
        slug: a.slug,
        category: a.category,
        name: a.name,
        popular_equivalent: a.popularEquivalent,
        scientific_reference: a.scientificReference,
        description: a.description,
        question_count: a.questionCount,
        estimated_time: a.estimatedTime,
        scoring_algorithm: a.scoringAlgorithm,
        scoring_type: a.scoringType,
        input_type: a.inputType,
        trait_config: a.traitConfig,
        is_active: true,
      });
    }
    
    for (const c of cat4Configs) {
      library.push({
        id: generateId(c.slug),
        slug: c.slug,
        category: c.category,
        name: c.name,
        popular_equivalent: c.popular_equivalent,
        scientific_reference: c.scientific_reference,
        description: c.description,
        question_count: c.question_count,
        estimated_time: c.estimated_time,
        scoring_algorithm: c.scoring_algorithm,
        scoring_type: c.scoring_type,
        input_type: c.input_type,
        trait_config: c.trait_config,
        cronbach_alpha: c.cronbach_alpha,
        validity_score: c.validity_score,
        is_active: true,
      });
    }
    
    return library;
  };

  // Get all assessments from library
  app.get("/api/assessments-library", async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('assessments_library')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error || !data || data.length === 0) {
        // Use static seed data with proper IDs
        return res.json({ assessments: buildAssessmentLibrary() });
      }

      res.json({ assessments: data });
    } catch (error) {
      console.error('Assessments library error:', error);
      res.json({ assessments: buildAssessmentLibrary() });
    }
  });

  // Seed assessments library and questions (comprehensive seed)
  app.post("/api/assessments-library/seed", async (_req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ error: "Not found" });
      }
      console.log('[Seed] Starting comprehensive database seed...');
      
      // Check if questions already seeded
      const { data: existingQuestions, error: checkError } = await supabase
        .from('assessment_questions')
        .select('id')
        .limit(1);

      if (checkError) {
        console.log('[Seed] Questions table check error (may not exist yet):', checkError.message);
      }

      if (existingQuestions && existingQuestions.length > 0) {
        return res.json({ message: "Already seeded with questions", count: existingQuestions.length });
      }
      
      console.log('[Seed] No existing questions found, proceeding with seed...');

      // Build comprehensive seed data with all metadata
      const allAssessments = [
        IPIP_NEO_120,
        SCHWARTZ_PVQ_21,
        SHORT_DARK_TRIAD_SD3,
        ICAR_16,
        GRIT_SCALE_8,
        RIASEC_30,
        TEIQUE_SF_30,
      ];

      // Category 4 assessments have different structure
      const category4Configs = [
        { config: PSS_10_CONFIG, questions: PSS_10_QUESTIONS },
        { config: SWLS_CONFIG, questions: SWLS_QUESTIONS },
        { config: BRS_CONFIG, questions: BRS_QUESTIONS },
        { config: FS_CONFIG, questions: FS_QUESTIONS },
      ];

      let totalQuestions = 0;
      let assessmentsUpdated = 0;

      // Get all existing assessments for flexible matching
      const { data: allExisting } = await supabase.from('assessments_library').select('id, name');
      const existingMap = new Map((allExisting || []).map(a => [a.name.toLowerCase(), a]));
      
      // Flexible name matching function
      const findAssessment = (seedName: string) => {
        const lower = seedName.toLowerCase();
        // Exact match
        if (existingMap.has(lower)) return existingMap.get(lower);
        // Keyword matching
        const entries = Array.from(existingMap.entries());
        for (const [key, val] of entries) {
          if (lower.includes(key) || key.includes(lower.split(' ')[0])) return val;
          // Match by key words
          const seedWords = lower.split(/[\s\-()]+/).filter((w: string) => w.length > 2);
          const dbWords = key.split(/[\s\-()]+/).filter((w: string) => w.length > 2);
          const commonWords = seedWords.filter((w: string) => dbWords.includes(w));
          if (commonWords.length >= 2) return val;
        }
        return null;
      };

      // Process category 1-3 assessments
      for (const assessment of allAssessments) {
        // Find existing assessment by flexible name matching
        const existing = findAssessment(assessment.name);

        let assessmentId: string;

        if (existing) {
          assessmentId = existing.id;
          console.log(`[Seed] Updating existing assessment: ${assessment.name}`);
          await supabase
            .from('assessments_library')
            .update({
              slug: assessment.slug,
              scoring_algorithm: assessment.scoringAlgorithm,
              scoring_type: assessment.scoringType,
              input_type: assessment.inputType,
              trait_config: assessment.traitConfig,
              is_active: true,
            })
            .eq('id', assessmentId);
          assessmentsUpdated++;
        } else {
          console.log(`[Seed] Inserting new assessment: ${assessment.name}`);
          const { data: newAssessment, error: insertErr } = await supabase
            .from('assessments_library')
            .insert({
              category: assessment.category,
              name: assessment.name,
              description: assessment.description,
              question_count: assessment.questionCount,
              estimated_time: assessment.estimatedTime,
              slug: assessment.slug,
              scoring_algorithm: assessment.scoringAlgorithm,
              scoring_type: assessment.scoringType,
              input_type: assessment.inputType,
              trait_config: assessment.traitConfig,
              is_active: true,
            })
            .select()
            .single();
          
          if (insertErr) {
            console.error(`[Seed] Insert error for ${assessment.name}:`, insertErr.message);
            continue;
          }
          
          if (newAssessment) {
            assessmentId = newAssessment.id;
            assessmentsUpdated++;
            console.log(`[Seed] Inserted ${assessment.name} with ID: ${assessmentId}`);
          } else continue;
        }

        // Insert questions
        const questionsToInsert = assessment.questions.map(q => ({
          assessment_id: assessmentId,
          question_number: q.questionNumber,
          text: q.text,
          trait_key: q.traitKey,
          facet_key: q.facetKey || null,
          sub_category: q.subCategory || null,
          reverse_coded: q.reverseCoded,
          correct_option: q.correctOption || null,
          options: q.options || null,
        }));

        const { error: insertError } = await supabase
          .from('assessment_questions')
          .insert(questionsToInsert);

        if (!insertError) {
          totalQuestions += questionsToInsert.length;
        }
      }

      // Process category 4 assessments (different structure)
      for (const { config, questions } of category4Configs) {
        // Find by flexible matching
        const existing = findAssessment(config.name);

        let assessmentId: string;

        if (existing) {
          assessmentId = existing.id;
          console.log(`[Seed] Updating existing Cat4 assessment: ${config.name}`);
          await supabase
            .from('assessments_library')
            .update({
              slug: config.slug,
              scoring_algorithm: config.scoring_algorithm,
              scoring_type: config.scoring_type,
              input_type: config.input_type,
              trait_config: config.trait_config,
              is_active: true,
            })
            .eq('id', assessmentId);
          assessmentsUpdated++;
        } else {
          console.log(`[Seed] Inserting new Cat4 assessment: ${config.name}`);
          const { data: newAssessment, error: cat4Err } = await supabase
            .from('assessments_library')
            .insert({
              category: config.category,
              name: config.name,
              description: config.description,
              question_count: config.question_count,
              estimated_time: config.estimated_time,
              slug: config.slug,
              scoring_algorithm: config.scoring_algorithm,
              scoring_type: config.scoring_type,
              input_type: config.input_type,
              trait_config: config.trait_config,
              is_active: true,
            })
            .select()
            .single();
          
          if (cat4Err) {
            console.error(`[Seed] Cat4 insert error for ${config.name}:`, cat4Err.message);
            continue;
          }
          
          if (newAssessment) {
            assessmentId = newAssessment.id;
            assessmentsUpdated++;
          } else continue;
        }

        // Insert questions
        const questionsToInsert = questions.map(q => ({
          assessment_id: assessmentId,
          question_number: q.question_number,
          text: q.text,
          trait_key: q.trait_key,
          facet_key: null,
          sub_category: null,
          reverse_coded: q.reverse_coded,
          correct_option: null,
          options: null,
        }));

        const { error: insertError } = await supabase
          .from('assessment_questions')
          .insert(questionsToInsert);

        if (!insertError) {
          totalQuestions += questionsToInsert.length;
        }
      }

      res.json({ 
        success: true, 
        assessmentsUpdated,
        totalQuestions,
        message: `Seeded ${assessmentsUpdated} assessments with ${totalQuestions} total questions`
      });
    } catch (error) {
      console.error('Seed error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Build static questions lookup from seed data
  const buildQuestionsLookup = () => {
    const allSeedData = [
      IPIP_NEO_120, SCHWARTZ_PVQ_21, SHORT_DARK_TRIAD_SD3,
      ICAR_16, GRIT_SCALE_8, RIASEC_30, TEIQUE_SF_30,
    ];
    const cat4Data = [
      { config: PSS_10_CONFIG, questions: PSS_10_QUESTIONS },
      { config: SWLS_CONFIG, questions: SWLS_QUESTIONS },
      { config: BRS_CONFIG, questions: BRS_QUESTIONS },
      { config: FS_CONFIG, questions: FS_QUESTIONS },
    ];
    
    const generateId = (slug: string) => {
      const hash = slug.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
      return `${Math.abs(hash).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`;
    };
    
    const lookup: Record<string, { assessment: Record<string, unknown>; questions: Record<string, unknown>[] }> = {};
    
    for (const a of allSeedData) {
      const id = generateId(a.slug);
      lookup[id] = {
        assessment: {
          id, slug: a.slug, name: a.name, category: a.category, description: a.description,
          question_count: a.questionCount, estimated_time: a.estimatedTime,
          scoring_algorithm: a.scoringAlgorithm, scoring_type: a.scoringType,
          input_type: a.inputType, trait_config: a.traitConfig,
        },
        questions: a.questions.map(q => ({
          questionNumber: q.questionNumber, text: q.text, traitKey: q.traitKey,
          facetKey: q.facetKey, subCategory: q.subCategory, reverseCoded: q.reverseCoded,
          correctOption: q.correctOption, options: q.options,
        })),
      };
    }
    
    for (const { config, questions: qs } of cat4Data) {
      const id = generateId(config.slug);
      lookup[id] = {
        assessment: {
          id, slug: config.slug, name: config.name, category: config.category,
          description: config.description, question_count: config.question_count,
          estimated_time: config.estimated_time, scoring_algorithm: config.scoring_algorithm,
          scoring_type: config.scoring_type, input_type: config.input_type,
          trait_config: config.trait_config,
        },
        questions: qs.map(q => ({
          questionNumber: q.question_number, text: q.text, traitKey: q.trait_key,
          reverseCoded: q.reverse_coded, options: null, correctOption: null,
        })),
      };
    }
    
    return lookup;
  };

  const staticQuestionsLookup = buildQuestionsLookup();

  // Get questions for any assessment by ID (UUID)
  app.get("/api/assessments/:id/questions", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Try static data first (works without database)
      if (staticQuestionsLookup[id]) {
        const { assessment, questions: mappedQuestions } = staticQuestionsLookup[id];
        const inputType = (assessment.input_type as string) || 'likert_5';
        let likertScale: { value: number; label: string }[] = [];
        
        const aSlug = assessment.slug as string;
        if (inputType === 'likert_5' && aSlug === 'onet-riasec-30') {
          likertScale = [
            { value: 1, label: 'Strongly Dislike' }, { value: 2, label: 'Dislike' },
            { value: 3, label: 'Unsure' }, { value: 4, label: 'Like' },
            { value: 5, label: 'Strongly Like' },
          ];
        } else if (inputType === 'likert_5' && aSlug === 'brs-6') {
          likertScale = [
            { value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' },
            { value: 3, label: 'Neutral' }, { value: 4, label: 'Agree' },
            { value: 5, label: 'Strongly Agree' },
          ];
        } else if (inputType === 'likert_5' && aSlug === 'grit-s-8') {
          likertScale = [
            { value: 1, label: 'Not Like Me At All' }, { value: 2, label: 'Not Much Like Me' },
            { value: 3, label: 'Somewhat Like Me' }, { value: 4, label: 'Mostly Like Me' },
            { value: 5, label: 'Very Much Like Me' },
          ];
        } else if (inputType === 'likert_5') {
          likertScale = [
            { value: 1, label: 'Very Inaccurate' }, { value: 2, label: 'Moderately Inaccurate' },
            { value: 3, label: 'Neither Accurate Nor Inaccurate' },
            { value: 4, label: 'Moderately Accurate' }, { value: 5, label: 'Very Accurate' },
          ];
        } else if (inputType === 'likert_7') {
          likertScale = [
            { value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' },
            { value: 3, label: 'Slightly Disagree' }, { value: 4, label: 'Neutral' },
            { value: 5, label: 'Slightly Agree' }, { value: 6, label: 'Agree' },
            { value: 7, label: 'Strongly Agree' },
          ];
        } else if (inputType === 'likert_6') {
          likertScale = [
            { value: 1, label: 'Not like me at all' }, { value: 2, label: 'Not like me' },
            { value: 3, label: 'A little like me' }, { value: 4, label: 'Somewhat like me' },
            { value: 5, label: 'Like me' }, { value: 6, label: 'Very much like me' },
          ];
        } else if (inputType === 'likert_0_4') {
          likertScale = [
            { value: 0, label: 'Never' }, { value: 1, label: 'Almost Never' },
            { value: 2, label: 'Sometimes' }, { value: 3, label: 'Fairly Often' },
            { value: 4, label: 'Very Often' },
          ];
        }
        
        return res.json({
          slug: assessment.slug, name: assessment.name, category: assessment.category,
          description: assessment.description, questionCount: assessment.question_count,
          estimatedTime: assessment.estimated_time,
          scoringAlgorithm: assessment.scoring_algorithm || 'average',
          scoringType: assessment.scoring_type || 'likert_average',
          inputType, traitConfig: assessment.trait_config || { traits: [] },
          questions: mappedQuestions,
          likertScale: likertScale.length > 0 ? likertScale : undefined,
        });
      }
      
      // Fallback to database query
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments_library')
        .select('*')
        .eq('id', id)
        .single();
      
      if (assessmentError || !assessment) {
        return res.status(404).json({ error: `Assessment not found` });
      }
      
      const { data: questions, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', id)
        .order('question_number', { ascending: true });
      
      if (questionsError) {
        console.error('Questions fetch error:', questionsError);
        return res.status(500).json({ error: 'Failed to fetch questions' });
      }
      
      const mappedQuestions = (questions || []).map(q => ({
        questionNumber: q.question_number, text: q.text, traitKey: q.trait_key,
        facetKey: q.facet_key, subCategory: q.sub_category,
        reverseCoded: q.reverse_coded || false, correctOption: q.correct_option, options: q.options,
      }));
      
      // Build the likert scale based on input type
      const inputType = assessment.input_type || 'likert_5';
      let likertScale: { value: number; label: string }[] = [];
      
      const slug = assessment.slug as string;

      if (inputType === 'likert_5' && slug === 'onet-riasec-30') {
        likertScale = [
          { value: 1, label: 'Strongly Dislike' },
          { value: 2, label: 'Dislike' },
          { value: 3, label: 'Unsure' },
          { value: 4, label: 'Like' },
          { value: 5, label: 'Strongly Like' },
        ];
      } else if (inputType === 'likert_5' && slug === 'brs-6') {
        likertScale = [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' },
        ];
      } else if (inputType === 'likert_5' && slug === 'grit-s-8') {
        likertScale = [
          { value: 1, label: 'Not Like Me At All' },
          { value: 2, label: 'Not Much Like Me' },
          { value: 3, label: 'Somewhat Like Me' },
          { value: 4, label: 'Mostly Like Me' },
          { value: 5, label: 'Very Much Like Me' },
        ];
      } else if (inputType === 'likert_5') {
        likertScale = [
          { value: 1, label: 'Very Inaccurate' },
          { value: 2, label: 'Moderately Inaccurate' },
          { value: 3, label: 'Neither Accurate Nor Inaccurate' },
          { value: 4, label: 'Moderately Accurate' },
          { value: 5, label: 'Very Accurate' },
        ];
      } else if (inputType === 'likert_7') {
        likertScale = [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Slightly Disagree' },
          { value: 4, label: 'Neutral' },
          { value: 5, label: 'Slightly Agree' },
          { value: 6, label: 'Agree' },
          { value: 7, label: 'Strongly Agree' },
        ];
      } else if (inputType === 'likert_6') {
        likertScale = [
          { value: 1, label: 'Not Like Me At All' },
          { value: 2, label: 'Not Like Me' },
          { value: 3, label: 'A Little Like Me' },
          { value: 4, label: 'Somewhat Like Me' },
          { value: 5, label: 'Like Me' },
          { value: 6, label: 'Very Much Like Me' },
        ];
      } else if (inputType === 'likert_0_4') {
        likertScale = [
          { value: 0, label: 'Never' },
          { value: 1, label: 'Almost Never' },
          { value: 2, label: 'Sometimes' },
          { value: 3, label: 'Fairly Often' },
          { value: 4, label: 'Very Often' },
        ];
      }
      
      res.json({
        slug: assessment.slug || assessment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: assessment.name,
        category: assessment.category,
        description: assessment.description,
        questionCount: assessment.question_count,
        estimatedTime: assessment.estimated_time,
        scoringAlgorithm: assessment.scoring_algorithm || 'average',
        scoringType: assessment.scoring_type || 'likert_average',
        inputType: inputType,
        traitConfig: assessment.trait_config || { traits: [] },
        questions: mappedQuestions,
        likertScale: likertScale.length > 0 ? likertScale : undefined,
      });
    } catch (error) {
      console.error('Assessment questions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get IPIP-NEO-120 questions (legacy endpoint)
  app.get("/api/assessment/questions", (_req, res) => {
    res.json({ questions });
  });

  // Submit assessment responses and get scores
  app.post("/api/assessment/submit", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { responses } = req.body;

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

  // Submit any assessment - generic endpoint using ID
  app.post("/api/assessments/:id/submit", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { responses } = req.body;

      // Try static data first
      let assessment: Record<string, unknown> | null = null;
      let questionData: Record<string, unknown>[] = [];
      let inputType = 'likert_5';
      let slug = '';

      if (staticQuestionsLookup[id]) {
        const staticData = staticQuestionsLookup[id];
        assessment = staticData.assessment;
        questionData = staticData.questions.map(q => ({
          ...q,
          inputType: assessment?.input_type || 'likert_5',
        }));
        inputType = (assessment.input_type as string) || 'likert_5';
        slug = (assessment.slug as string) || '';
      } else {
        // Fallback to database
        const { data: dbAssessment, error: assessmentError } = await supabase
          .from('assessments_library')
          .select('*')
          .eq('id', id)
          .single();
        
        if (assessmentError || !dbAssessment) {
          return res.status(404).json({ error: `Assessment not found` });
        }
        assessment = dbAssessment;

        const { data: dbQuestions, error: questionsError } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', id)
          .order('question_number', { ascending: true });
        
        if (questionsError) {
          console.error('Questions fetch error:', questionsError);
          return res.status(500).json({ error: 'Failed to fetch questions' });
        }

        inputType = dbAssessment.input_type || 'likert_5';
        slug = dbAssessment.slug || dbAssessment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        questionData = (dbQuestions || []).map(q => ({
          questionNumber: q.question_number,
          text: q.text,
          traitKey: q.trait_key,
          facetKey: q.facet_key,
          reverseCoded: q.reverse_coded || false,
          correctOption: q.correct_option,
          options: q.options,
          inputType: inputType,
        }));
      }

      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      const traitConfigRaw = assessment.trait_config as { traits: { key: string; name: string; color?: string }[] } | null;
      const traitConfig = traitConfigRaw || { traits: [] };

      const typedQuestions: QuestionData[] = questionData.map(q => ({
        questionNumber: (q.questionNumber as number) || 0,
        traitKey: (q.traitKey as string) || '',
        facetKey: q.facetKey as string | undefined,
        subCategory: q.subCategory as string | undefined,
        reverseCoded: (q.reverseCoded as boolean) || false,
        correctOption: q.correctOption as string | undefined,
        inputType: (q.inputType as string) || inputType,
      }));

      const config = {
        slug: slug,
        scoringAlgorithm: (assessment.scoring_algorithm as "average" | "summation" | "complex_centering" | "binary_correct" | "multi_category") || 'average',
        scoringType: (assessment.scoring_type as "likert_average" | "binary_correct" | "multi_category" | "likert_sum") || 'likert_average',
        inputType: inputType,
        traitConfig: traitConfig,
        questions: typedQuestions,
      };

      const result = calculateAssessmentScore(config, responses);

      const scoresObject = result.traitScores.reduce((acc, ts) => {
        acc[ts.key] = ts.score;
        return acc;
      }, {} as Record<string, number>);

      const assessmentName = assessment.name as string;
      const assessmentCategory = assessment.category as string;

      const { data, error } = await supabase
        .from('results_log')
        .insert({
          user_id: userId,
          assessment_type: assessmentName,
          assessment_slug: slug,
          responses: responses,
          scores: scoresObject,
          neuroticism_score: scoresObject['N'] ?? 0,
          extraversion_score: scoresObject['E'] ?? 0,
          openness_score: scoresObject['O'] ?? 0,
          agreeableness_score: scoresObject['A'] ?? 0,
          conscientiousness_score: scoresObject['C'] ?? 0,
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
          assessmentName: assessmentName,
          category: assessmentCategory,
          traitConfig: config.traitConfig,
        }
      });
    } catch (error) {
      console.error('Assessment submission error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's assessment history
  app.get("/api/assessment/results/:userId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);

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
  app.get("/api/assessment/result/:resultId", requireAuth, async (req, res) => {
    try {
      const { resultId } = req.params;
      const userId = getUserId(req);

      const { data, error } = await supabase
        .from('results_log')
        .select('*')
        .eq('id', resultId)
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        return res.status(404).json({ error: "Assessment result not found" });
      }

      if (data.user_id !== userId) {
        return res.status(403).json({ error: "You can only view your own results" });
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
  app.post("/api/peer-feedback/:userId", writeLimiter, async (req, res) => {
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
  app.get("/api/peer-feedback/:userId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);

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


  // DEBUG: Inject test data (temporary endpoint for testing)
  app.post("/api/debug/inject-test-data", async (req, res) => {
    try {
      if (process.env.NODE_ENV === "production") {
        return res.status(404).json({ error: "Not found" });
      }
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
  app.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const createdBy = getUserId(req);
      const { name, type, privacyLevel } = req.body;

      if (!name) {
        return res.status(400).json({ error: "name is required" });
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
  app.get("/api/groups/:userId", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);

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
  app.post("/api/groups/:groupId/members", requireAuth, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { email, name, role, userId } = req.body;

      if (!email && !userId) {
        return res.status(400).json({ error: "email or userId is required" });
      }

      if (!(await userOwnsGroup(groupId, getUserId(req)))) {
        return res.status(403).json({ error: "You do not have access to this group" });
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
  app.get("/api/groups/:groupId/members", requireAuth, async (req, res) => {
    try {
      const { groupId } = req.params;

      if (!(await userOwnsGroup(groupId, getUserId(req)))) {
        return res.status(403).json({ error: "You do not have access to this group" });
      }

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
  app.delete("/api/groups/:groupId/members/:memberId", requireAuth, async (req, res) => {
    try {
      const { groupId, memberId } = req.params;

      if (!(await userOwnsGroup(groupId, getUserId(req)))) {
        return res.status(403).json({ error: "You do not have access to this group" });
      }

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
  app.delete("/api/groups/:groupId", requireAuth, async (req, res) => {
    try {
      const { groupId } = req.params;

      if (!(await userOwnsGroup(groupId, getUserId(req)))) {
        return res.status(403).json({ error: "You do not have access to this group" });
      }

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

  // Delete user account (Right to be Forgotten)
  app.delete("/api/user/me", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log(`[Account Deletion] Starting deletion for user: ${userId}`);

      const deletionResults = {
        results_log: false,
        peer_feedback: false,
        feedback_tokens: false,
        group_members: false,
        user_profiles: false,
        shared_result_tokens: false,
      };

      try {
        await supabase.from('results_log').delete().eq('user_id', userId);
        deletionResults.results_log = true;
        console.log('[Account Deletion] Deleted results_log entries');
      } catch (e) { console.log('[Account Deletion] No results_log to delete or error:', e); }

      try {
        await supabase.from('peer_feedback').delete().eq('target_user_id', userId);
        deletionResults.peer_feedback = true;
        console.log('[Account Deletion] Deleted peer_feedback entries');
      } catch (e) { console.log('[Account Deletion] No peer_feedback to delete or error:', e); }

      try {
        await supabase.from('feedback_tokens').delete().eq('user_id', userId);
        deletionResults.feedback_tokens = true;
        console.log('[Account Deletion] Deleted feedback_tokens entries');
      } catch (e) { console.log('[Account Deletion] No feedback_tokens to delete or error:', e); }

      try {
        await supabase.from('group_members').delete().eq('user_id', userId);
        deletionResults.group_members = true;
        console.log('[Account Deletion] Deleted group_members entries');
      } catch (e) { console.log('[Account Deletion] No group_members to delete or error:', e); }

      try {
        const pg = await import('pg');
        const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query('DELETE FROM user_profiles WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM life_events_log WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM profile_history WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM shared_results WHERE user_id = $1', [userId]).catch(() => {});
        await pool.end();
        deletionResults.user_profiles = true;
        console.log('[Account Deletion] Deleted user_profiles, life_events_log, profile_history entries');
      } catch (e) { console.log('[Account Deletion] No profile data to delete or error:', e); }

      try {
        await supabase.from('shared_result_tokens').delete().eq('user_id', userId);
        deletionResults.shared_result_tokens = true;
        console.log('[Account Deletion] Deleted shared_result_tokens entries');
      } catch (e) { console.log('[Account Deletion] No shared_result_tokens to delete or error:', e); }

      // Right to be Forgotten: delete the Supabase auth user (requires service role)
      let authUserDeleted = false;
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.error('[Account Deletion] Failed to delete auth user:', authDeleteError.message);
        } else {
          authUserDeleted = true;
          console.log('[Account Deletion] Deleted Supabase auth user');
        }
      } catch (e) {
        console.error('[Account Deletion] Auth user deletion error:', e);
      }

      console.log(`[Account Deletion] Data deletion complete for user: ${userId}`, deletionResults);

      res.json({
        success: true,
        message: "All your data has been permanently deleted. Please sign out to complete the process.",
        note: authUserDeleted
          ? "Your account and login credentials have been permanently removed."
          : "Your data was removed, but the login record could not be fully deleted. Please contact support if you can still sign in.",
      });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: "Internal server error during account deletion" });
    }
  });

  return httpServer;
}
