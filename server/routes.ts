import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabase } from "./db";
import { calculateAllTraitScores, validateResponses } from "@shared/scoring";
import { assessmentResponsesSchema, traitScoresSchema, engineResponsesSchema, assessmentScoresSchema } from "@shared/schema";
import { questions } from "@shared/ipip-neo-120";
import { peerQuestions, calculatePeerScores, relationshipValues } from "@shared/peer-feedback-questions";
import { calculatePeer360Scores } from "@shared/assessments/category-five-seed";
import { registerAIInsightsRoutes } from "./ai-insights";
import { registerFeedbackTokenRoutes } from "./feedback-tokens";
import { registerPeerInviteRoutes, inviteStatus } from "./peer-invites";
import { registerEmailRoutes } from "./email";
import { registerShareResultsRoutes } from "./share-results";
import { registerProfileRoutes } from "./profile-routes";
import { calculateAssessmentScore, type QuestionData } from "@shared/scoring-engine";
import { requireAuth, getUserId } from "./auth";
import { writeLimiter, openFeedbackLimiter } from "./rate-limit";
import {
  dedupKey,
  isDuplicateSubmission,
  rememberSubmission,
  passesAttentionCheck,
  isStraightLined,
} from "./peer-feedback-guards";

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
import {
  WHO_5_CONFIG, WHO_5_QUESTIONS,
  I_PANAS_SF_CONFIG, I_PANAS_SF_QUESTIONS,
  UCLA_3_CONFIG, UCLA_3_QUESTIONS,
  CANTRIL_CONFIG, CANTRIL_QUESTIONS,
  RSES_CONFIG, RSES_QUESTIONS,
  GSE_CONFIG, GSE_QUESTIONS
} from "@shared/assessments/category-five-seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAIInsightsRoutes(app);
  registerFeedbackTokenRoutes(app);
  registerPeerInviteRoutes(app);
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
    const cat4Configs = [
      PSS_10_CONFIG, SWLS_CONFIG, BRS_CONFIG, FS_CONFIG,
      WHO_5_CONFIG, I_PANAS_SF_CONFIG, UCLA_3_CONFIG, CANTRIL_CONFIG, RSES_CONFIG, GSE_CONFIG,
    ];
    
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
        measurement_class: a.measurementClass,
        retest_interval_days: a.retestIntervalDays,
        one_time: a.oneTime === true,
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
        measurement_class: c.measurement_class,
        retest_interval_days: c.retest_interval_days,
        sd: c.sd,
        one_time: false,
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
      
      // Build the set of assessments that already have questions so re-running the
      // seed never duplicates questions — it only inserts questions for NEW
      // assessments while still refreshing metadata on existing ones.
      const { data: existingQ, error: checkError } = await supabase
        .from('assessment_questions')
        .select('assessment_id');

      if (checkError) {
        console.log('[Seed] Questions table check error (may not exist yet):', checkError.message);
      }

      const assessmentsWithQuestions = new Set(
        (existingQ || []).map((q: { assessment_id: string }) => q.assessment_id)
      );
      console.log(`[Seed] ${assessmentsWithQuestions.size} assessments already have questions; inserting questions only for new ones.`);

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

      // Category 4 & 5 assessments have the snake_case config structure
      const category4Configs = [
        { config: PSS_10_CONFIG, questions: PSS_10_QUESTIONS },
        { config: SWLS_CONFIG, questions: SWLS_QUESTIONS },
        { config: BRS_CONFIG, questions: BRS_QUESTIONS },
        { config: FS_CONFIG, questions: FS_QUESTIONS },
        { config: WHO_5_CONFIG, questions: WHO_5_QUESTIONS },
        { config: I_PANAS_SF_CONFIG, questions: I_PANAS_SF_QUESTIONS },
        { config: UCLA_3_CONFIG, questions: UCLA_3_QUESTIONS },
        { config: CANTRIL_CONFIG, questions: CANTRIL_QUESTIONS },
        { config: RSES_CONFIG, questions: RSES_QUESTIONS },
        { config: GSE_CONFIG, questions: GSE_QUESTIONS },
      ];

      let totalQuestions = 0;
      let assessmentsUpdated = 0;

      // Get all existing assessments and match strictly by slug. Slugs are unique
      // and stable per assessment; the previous fuzzy name matching could collide
      // distinct assessments (e.g. "Cantril ladder" matched "...with Life Scale")
      // and overwrite the wrong row, so we never fall back to name matching.
      const { data: allExisting } = await supabase.from('assessments_library').select('id, name, slug');
      type ExistingAssessment = { id: string; name: string; slug: string | null };
      const existingBySlug = new Map<string, ExistingAssessment>(
        ((allExisting || []) as ExistingAssessment[])
          .filter((a) => !!a.slug)
          .map((a) => [a.slug as string, a])
      );

      const findBySlug = (slug: string) => existingBySlug.get(slug) || null;

      // Process category 1-3 assessments
      for (const assessment of allAssessments) {
        // Find existing assessment by exact slug
        const existing = findBySlug(assessment.slug);

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

        // Insert questions only if this assessment doesn't already have them.
        if (!assessmentsWithQuestions.has(assessmentId)) {
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
      }

      // Process category 4 & 5 assessments (different structure)
      for (const { config, questions } of category4Configs) {
        // Find existing assessment by exact slug
        const existing = findBySlug(config.slug);

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

        // Insert questions only if this assessment doesn't already have them.
        if (!assessmentsWithQuestions.has(assessmentId)) {
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
      { config: WHO_5_CONFIG, questions: WHO_5_QUESTIONS },
      { config: I_PANAS_SF_CONFIG, questions: I_PANAS_SF_QUESTIONS },
      { config: UCLA_3_CONFIG, questions: UCLA_3_QUESTIONS },
      { config: CANTRIL_CONFIG, questions: CANTRIL_QUESTIONS },
      { config: RSES_CONFIG, questions: RSES_QUESTIONS },
      { config: GSE_CONFIG, questions: GSE_QUESTIONS },
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
        } else if (inputType === 'likert_5' && aSlug === 'i-panas-sf') {
          likertScale = [
            { value: 1, label: 'Not at all' }, { value: 2, label: 'A little' },
            { value: 3, label: 'Moderately' }, { value: 4, label: 'Quite a bit' },
            { value: 5, label: 'Extremely' },
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
        } else if (inputType === 'likert_0_5') {
          likertScale = [
            { value: 0, label: 'At no time' }, { value: 1, label: 'Some of the time' },
            { value: 2, label: 'Less than half the time' }, { value: 3, label: 'More than half the time' },
            { value: 4, label: 'Most of the time' }, { value: 5, label: 'All of the time' },
          ];
        } else if (inputType === 'likert_4' && aSlug === 'gse-10') {
          likertScale = [
            { value: 1, label: 'Not at all true' }, { value: 2, label: 'Hardly true' },
            { value: 3, label: 'Moderately true' }, { value: 4, label: 'Exactly true' },
          ];
        } else if (inputType === 'likert_4') {
          likertScale = [
            { value: 1, label: 'Strongly Disagree' }, { value: 2, label: 'Disagree' },
            { value: 3, label: 'Agree' }, { value: 4, label: 'Strongly Agree' },
          ];
        } else if (inputType === 'likert_3') {
          likertScale = [
            { value: 1, label: 'Hardly ever' }, { value: 2, label: 'Some of the time' },
            { value: 3, label: 'Often' },
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
      } else if (inputType === 'likert_5' && slug === 'i-panas-sf') {
        likertScale = [
          { value: 1, label: 'Not at all' },
          { value: 2, label: 'A little' },
          { value: 3, label: 'Moderately' },
          { value: 4, label: 'Quite a bit' },
          { value: 5, label: 'Extremely' },
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
      } else if (inputType === 'likert_0_5') {
        likertScale = [
          { value: 0, label: 'At no time' },
          { value: 1, label: 'Some of the time' },
          { value: 2, label: 'Less than half the time' },
          { value: 3, label: 'More than half the time' },
          { value: 4, label: 'Most of the time' },
          { value: 5, label: 'All of the time' },
        ];
      } else if (inputType === 'likert_4' && slug === 'gse-10') {
        likertScale = [
          { value: 1, label: 'Not at all true' },
          { value: 2, label: 'Hardly true' },
          { value: 3, label: 'Moderately true' },
          { value: 4, label: 'Exactly true' },
        ];
      } else if (inputType === 'likert_4') {
        likertScale = [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Agree' },
          { value: 4, label: 'Strongly Agree' },
        ];
      } else if (inputType === 'likert_3') {
        likertScale = [
          { value: 1, label: 'Hardly ever' },
          { value: 2, label: 'Some of the time' },
          { value: 3, label: 'Often' },
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

      const parsedResponses = engineResponsesSchema.safeParse(req.body.responses);
      if (!parsedResponses.success) {
        return res.status(400).json({
          error: "Invalid responses format",
          details: parsedResponses.error.errors,
        });
      }
      const responses = parsedResponses.data;

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

      const missingQuestions = typedQuestions
        .map(q => q.questionNumber)
        .filter(questionNumber => responses[String(questionNumber)] === undefined);

      if (missingQuestions.length > 0) {
        return res.status(400).json({
          error: "Incomplete assessment",
          details: missingQuestions.map(questionNumber => `Missing response for question ${questionNumber}`),
        });
      }

      const config = {
        slug: slug,
        scoringAlgorithm: (assessment.scoring_algorithm as "average" | "summation" | "complex_centering" | "binary_correct" | "multi_category") || 'average',
        scoringType: (assessment.scoring_type as "likert_average" | "binary_correct" | "multi_category" | "likert_sum") || 'likert_average',
        inputType: inputType,
        traitConfig: traitConfig,
        questions: typedQuestions,
      };

      const result = calculateAssessmentScore(config, responses);

      const scoresObject = assessmentScoresSchema.parse(
        result.traitScores.reduce((acc, ts) => {
          acc[ts.key] = ts.score;
          return acc;
        }, {} as Record<string, number>)
      );

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
  app.post("/api/peer-feedback/:userId", writeLimiter, openFeedbackLimiter, async (req, res) => {
    try {
      const { userId } = req.params;
      const { responses, peerName, isAnonymous, inviteToken, attentionResponse } = req.body;
      let { relationship, instrument } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({ error: "responses are required" });
      }

      // Server-side quality gates (client enforces these too, but they're
      // bypassable). Enforced here so the aggregated self-vs-peer averages stay
      // trustworthy even against direct API calls.
      if (!passesAttentionCheck(attentionResponse)) {
        return res.status(400).json({ error: "Attention check failed. Please answer the quality-control item as instructed." });
      }
      if (isStraightLined(responses)) {
        return res.status(400).json({ error: "Responses look like straight-lining (identical answer to every item). Please provide honest, varied answers." });
      }

      // Block rapid duplicate re-submissions of identical content from the same
      // client (per target + IP + response fingerprint), within a short window.
      const ip = req.ip || "unknown";
      const submissionKey = dedupKey(userId, ip, responses as Record<string, unknown>);
      if (await isDuplicateSubmission(submissionKey)) {
        return res.status(429).json({ error: "Duplicate submission detected. This feedback was already received." });
      }

      // One-time invite: validate before doing anything else, and let the
      // invite be the server-side source of truth for relationship/instrument.
      let invite: { token: string } | null = null;
      if (inviteToken) {
        const token = String(inviteToken).trim().toLowerCase();
        const { data: inviteRow } = await supabase
          .from('peer_invites')
          .select('token, target_user_id, relationship, instrument, used_at, expires_at')
          .eq('token', token)
          .single();

        if (!inviteRow || inviteRow.target_user_id !== userId) {
          return res.status(404).json({ error: "Invalid invite link" });
        }
        const status = inviteStatus(inviteRow);
        if (status === 'used') {
          return res.status(409).json({ error: "This invite link has already been used." });
        }
        if (status === 'expired') {
          return res.status(410).json({ error: "This invite link has expired." });
        }
        if (inviteRow.relationship) relationship = inviteRow.relationship;
        if (inviteRow.instrument) instrument = inviteRow.instrument;
        invite = { token: inviteRow.token };
      }

      instrument = instrument === 'peer-360' ? 'peer-360' : 'big-five';

      if (!relationship || !relationshipValues.includes(relationship)) {
        return res.status(400).json({ error: "A valid relationship is required" });
      }

      let scores: Record<string, number>;
      if (instrument === 'peer-360') {
        scores = calculatePeer360Scores(responses);
        if (Object.keys(scores).length === 0) {
          return res.status(400).json({ error: "Invalid 360 responses" });
        }
      } else {
        scores = calculatePeerScores(responses);
        const parsedScores = traitScoresSchema.safeParse(scores);
        if (!parsedScores.success) {
          return res.status(400).json({ error: "Invalid scores calculated" });
        }
      }

      // One-time invite: burn the token atomically BEFORE inserting so two
      // concurrent submissions can't both succeed. The conditional update only
      // matches an unused token; a returned row proves we won the race.
      if (invite) {
        const { data: burned } = await supabase
          .from('peer_invites')
          .update({ used_at: new Date().toISOString() })
          .eq('token', invite.token)
          .is('used_at', null)
          .select('token');
        if (!burned || burned.length === 0) {
          return res.status(409).json({ error: "This invite link has already been used." });
        }
      }

      const { data, error } = await supabase
        .from('peer_feedback')
        .insert({
          target_user_id: userId,
          scores: scores,
          peer_name: isAnonymous ? null : peerName || null,
          is_anonymous: isAnonymous ? 'true' : 'false',
          relationship,
          instrument,
        })
        .select()
        .single();

      if (error) {
        // Insert failed after burning the token — release it so the invitee can retry.
        if (invite) {
          await supabase
            .from('peer_invites')
            .update({ used_at: null })
            .eq('token', invite.token);
        }
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

      await rememberSubmission(submissionKey);
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

      // Calculate Big Five average scores. Exclude 360 rows so their
      // competency-keyed scores don't pollute the NEOAC averages.
      let averageScores = null;
      const bigFive = (data || []).filter((fb) => (fb.instrument ?? 'big-five') !== 'peer-360');
      if (bigFive.length > 0) {
        const traits = ['N', 'E', 'O', 'A', 'C'] as const;
        averageScores = {} as Record<string, number>;

        for (const trait of traits) {
          const sum = bigFive.reduce((acc, fb) => {
            const scores = assessmentScoresSchema.parse(fb.scores);
            return acc + (scores[trait] || 0);
          }, 0);
          averageScores[trait] = sum / bigFive.length;
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

  // Delete user account (Right to be Forgotten)
  app.delete("/api/user/me", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log(`[Account Deletion] Starting deletion for user: ${userId}`);

      const deletionResults = {
        results_log: false,
        peer_feedback: false,
        feedback_tokens: false,
        user_profiles: false,
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
        await supabase.from('peer_invites').delete().eq('target_user_id', userId);
        console.log('[Account Deletion] Deleted peer_invites entries');
      } catch (e) { console.log('[Account Deletion] No peer_invites to delete or error:', e); }

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
