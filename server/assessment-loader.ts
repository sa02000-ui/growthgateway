import { IPIP_NEO_120, SCHWARTZ_PVQ_21, SHORT_DARK_TRIAD_SD3, LIKERT_SCALES } from '../shared/assessments/category-one-seed';
import { ICAR_16, GRIT_SCALE_8 } from '../shared/assessments/category-two-seed';
import { RIASEC_30, TEIQUE_SF_30 } from '../shared/assessments/category-three-seed';
import { PSS_10_CONFIG, PSS_10_QUESTIONS, SWLS_CONFIG, SWLS_QUESTIONS, BRS_CONFIG, BRS_QUESTIONS, FS_CONFIG, FS_QUESTIONS } from '../shared/assessments/category-four-seed';
import type { TraitConfig, ScoringAlgorithm, ScoringType, InputType } from '../shared/schema';

export interface AssessmentData {
  slug: string;
  name: string;
  category: string;
  description: string;
  questionCount: number;
  estimatedTime: string;
  scoringAlgorithm: ScoringAlgorithm;
  scoringType: ScoringType;
  inputType: InputType;
  traitConfig: TraitConfig;
  questions: QuestionData[];
  likertScale?: { value: number; label: string }[];
}

export interface QuestionData {
  questionNumber: number;
  text: string;
  traitKey: string;
  facetKey?: string;
  subCategory?: string;
  reverseCoded: boolean;
  correctOption?: string;
  options?: { value: string; label: string }[];
}

const CATEGORY_FOUR_ASSESSMENTS = [
  {
    ...PSS_10_CONFIG,
    slug: 'pss-10',
    questions: PSS_10_QUESTIONS,
  },
  {
    ...SWLS_CONFIG,
    slug: 'swls-5',
    questions: SWLS_QUESTIONS,
  },
  {
    ...BRS_CONFIG,
    slug: 'brs-6',
    questions: BRS_QUESTIONS,
  },
  {
    ...FS_CONFIG,
    slug: 'flourishing-8',
    questions: FS_QUESTIONS,
  },
];

const ALL_ASSESSMENTS = [
  IPIP_NEO_120,
  SCHWARTZ_PVQ_21,
  SHORT_DARK_TRIAD_SD3,
  ICAR_16,
  GRIT_SCALE_8,
  RIASEC_30,
  TEIQUE_SF_30,
  ...CATEGORY_FOUR_ASSESSMENTS,
];

export function getAssessmentBySlug(slug: string): AssessmentData | null {
  const normalizedSlug = slug.toLowerCase();
  
  const assessment = ALL_ASSESSMENTS.find(a => 
    a.slug.toLowerCase() === normalizedSlug
  );
  
  if (!assessment) {
    return null;
  }
  
  const inputType = (assessment as any).inputType || (assessment as any).input_type || 'likert_5';
  const likertScale = getLikertScale(inputType);
  
  return {
    slug: assessment.slug,
    name: (assessment as any).name || '',
    category: (assessment as any).category || '',
    description: (assessment as any).description || '',
    questionCount: (assessment as any).questionCount || assessment.questions?.length || 0,
    estimatedTime: (assessment as any).estimatedTime || (assessment as any).estimated_time || '',
    scoringAlgorithm: (assessment as any).scoringAlgorithm || (assessment as any).scoring_algorithm || 'average',
    scoringType: (assessment as any).scoringType || (assessment as any).scoring_type || 'likert_average',
    inputType: inputType,
    traitConfig: (assessment as any).traitConfig || (assessment as any).trait_config || { traits: [] },
    questions: assessment.questions.map((q: any) => ({
      questionNumber: q.questionNumber || q.question_number,
      text: q.text,
      traitKey: q.traitKey || q.trait_key,
      facetKey: q.facetKey || q.facet_key,
      subCategory: q.subCategory || q.sub_category,
      reverseCoded: q.reverseCoded ?? q.reverse_coded ?? false,
      correctOption: q.correctOption || q.correct_option,
      options: q.options,
    })),
    likertScale,
  };
}

export function getLikertScale(inputType: string): { value: number; label: string }[] {
  switch (inputType) {
    case 'likert_5':
      return LIKERT_SCALES.likert_5;
    case 'likert_6':
      return LIKERT_SCALES.likert_6;
    case 'likert_7':
      return LIKERT_SCALES.likert_7;
    case 'likert_0_4':
      return [
        { value: 0, label: 'Never' },
        { value: 1, label: 'Almost Never' },
        { value: 2, label: 'Sometimes' },
        { value: 3, label: 'Fairly Often' },
        { value: 4, label: 'Very Often' },
      ];
    case 'multiple_choice':
      return [];
    default:
      return LIKERT_SCALES.likert_5;
  }
}

export function getAllAssessmentSlugs(): string[] {
  return ALL_ASSESSMENTS.map(a => a.slug);
}
