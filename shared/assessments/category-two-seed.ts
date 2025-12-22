import type { TraitConfig, ScoringAlgorithm, InputType, ScoringType } from '../schema';

export interface AssessmentSeedData {
  slug: string;
  category: string;
  name: string;
  popularEquivalent: string;
  scientificReference: string;
  description: string;
  questionCount: number;
  estimatedTime: string;
  scoringAlgorithm: ScoringAlgorithm;
  scoringType: ScoringType;
  inputType: InputType;
  traitConfig: TraitConfig;
  questions: QuestionSeedData[];
}

export interface QuestionSeedData {
  questionNumber: number;
  text: string;
  traitKey: string;
  facetKey?: string;
  subCategory?: string;
  reverseCoded: boolean;
  correctOption?: string;
  options?: { value: string; label: string }[];
}

export const COGNITIVE_TRAIT_CONFIG: TraitConfig = {
  traits: [
    { key: 'IQ', name: 'Cognitive Ability', description: 'General mental ability and reasoning', color: '#3b82f6' },
  ],
  populationAverages: {
    IQ: 50,
  },
};

export const ICAR_16: AssessmentSeedData = {
  slug: 'icar-16',
  category: 'How I Think',
  name: 'ICAR-16 Cognitive Assessment',
  popularEquivalent: 'Similar to IQ Tests',
  scientificReference: 'Condon & Revelle (2014)',
  description: 'A brief, reliable measure of cognitive ability using verbal reasoning and number series problems. Used in research settings worldwide.',
  questionCount: 16,
  estimatedTime: '8-12 mins',
  scoringAlgorithm: 'binary_correct',
  scoringType: 'binary_correct',
  inputType: 'multiple_choice',
  traitConfig: COGNITIVE_TRAIT_CONFIG,
  questions: [
    {
      questionNumber: 1,
      text: "What number comes next in this series? 2, 4, 8, 16, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '32',
      options: [
        { value: '24', label: '24' },
        { value: '32', label: '32' },
        { value: '30', label: '30' },
        { value: '28', label: '28' },
      ],
    },
    {
      questionNumber: 2,
      text: "What number comes next? 1, 4, 9, 16, 25, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '36',
      options: [
        { value: '30', label: '30' },
        { value: '36', label: '36' },
        { value: '49', label: '49' },
        { value: '34', label: '34' },
      ],
    },
    {
      questionNumber: 3,
      text: "What number comes next? 3, 6, 11, 18, 27, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '38',
      options: [
        { value: '36', label: '36' },
        { value: '38', label: '38' },
        { value: '40', label: '40' },
        { value: '35', label: '35' },
      ],
    },
    {
      questionNumber: 4,
      text: "What number comes next? 1, 1, 2, 3, 5, 8, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '13',
      options: [
        { value: '11', label: '11' },
        { value: '12', label: '12' },
        { value: '13', label: '13' },
        { value: '14', label: '14' },
      ],
    },
    {
      questionNumber: 5,
      text: "What number comes next? 64, 32, 16, 8, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '4',
      options: [
        { value: '2', label: '2' },
        { value: '4', label: '4' },
        { value: '6', label: '6' },
        { value: '0', label: '0' },
      ],
    },
    {
      questionNumber: 6,
      text: "What number comes next? 2, 6, 12, 20, 30, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '42',
      options: [
        { value: '40', label: '40' },
        { value: '42', label: '42' },
        { value: '44', label: '44' },
        { value: '38', label: '38' },
      ],
    },
    {
      questionNumber: 7,
      text: "What number comes next? 1, 3, 7, 15, 31, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '63',
      options: [
        { value: '47', label: '47' },
        { value: '55', label: '55' },
        { value: '63', label: '63' },
        { value: '62', label: '62' },
      ],
    },
    {
      questionNumber: 8,
      text: "What number comes next? 5, 10, 20, 40, __",
      traitKey: 'IQ',
      subCategory: 'number_series',
      reverseCoded: false,
      correctOption: '80',
      options: [
        { value: '60', label: '60' },
        { value: '70', label: '70' },
        { value: '80', label: '80' },
        { value: '100', label: '100' },
      ],
    },
    {
      questionNumber: 9,
      text: "HAND is to GLOVE as FOOT is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'SOCK',
      options: [
        { value: 'LEG', label: 'LEG' },
        { value: 'SHOE', label: 'SHOE' },
        { value: 'SOCK', label: 'SOCK' },
        { value: 'TOE', label: 'TOE' },
      ],
    },
    {
      questionNumber: 10,
      text: "BIRD is to NEST as BEE is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'HIVE',
      options: [
        { value: 'HONEY', label: 'HONEY' },
        { value: 'HIVE', label: 'HIVE' },
        { value: 'FLOWER', label: 'FLOWER' },
        { value: 'STING', label: 'STING' },
      ],
    },
    {
      questionNumber: 11,
      text: "BOOK is to READ as SONG is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'LISTEN',
      options: [
        { value: 'SING', label: 'SING' },
        { value: 'LISTEN', label: 'LISTEN' },
        { value: 'MUSIC', label: 'MUSIC' },
        { value: 'WRITE', label: 'WRITE' },
      ],
    },
    {
      questionNumber: 12,
      text: "DOCTOR is to HOSPITAL as TEACHER is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'SCHOOL',
      options: [
        { value: 'STUDENT', label: 'STUDENT' },
        { value: 'CLASSROOM', label: 'CLASSROOM' },
        { value: 'SCHOOL', label: 'SCHOOL' },
        { value: 'EDUCATION', label: 'EDUCATION' },
      ],
    },
    {
      questionNumber: 13,
      text: "HOT is to COLD as FAST is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'SLOW',
      options: [
        { value: 'QUICK', label: 'QUICK' },
        { value: 'SLOW', label: 'SLOW' },
        { value: 'SPEED', label: 'SPEED' },
        { value: 'RACE', label: 'RACE' },
      ],
    },
    {
      questionNumber: 14,
      text: "PEN is to WRITE as KNIFE is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'CUT',
      options: [
        { value: 'SHARP', label: 'SHARP' },
        { value: 'SLICE', label: 'SLICE' },
        { value: 'CUT', label: 'CUT' },
        { value: 'FORK', label: 'FORK' },
      ],
    },
    {
      questionNumber: 15,
      text: "PAINTER is to BRUSH as WRITER is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'PEN',
      options: [
        { value: 'BOOK', label: 'BOOK' },
        { value: 'PEN', label: 'PEN' },
        { value: 'PAPER', label: 'PAPER' },
        { value: 'WORDS', label: 'WORDS' },
      ],
    },
    {
      questionNumber: 16,
      text: "WATER is to THIRST as FOOD is to ___",
      traitKey: 'IQ',
      subCategory: 'verbal_reasoning',
      reverseCoded: false,
      correctOption: 'HUNGER',
      options: [
        { value: 'EAT', label: 'EAT' },
        { value: 'HUNGER', label: 'HUNGER' },
        { value: 'MEAL', label: 'MEAL' },
        { value: 'DRINK', label: 'DRINK' },
      ],
    },
  ],
};

export const GRIT_TRAIT_CONFIG: TraitConfig = {
  traits: [
    { key: 'GRIT', name: 'Grit', description: 'Perseverance and passion for long-term goals', color: '#f59e0b' },
    { key: 'PE', name: 'Perseverance of Effort', description: 'Working hard despite setbacks', color: '#ef4444' },
    { key: 'CI', name: 'Consistency of Interest', description: 'Maintaining focus on goals over time', color: '#3b82f6' },
  ],
};

export const GRIT_SCALE_8: AssessmentSeedData = {
  slug: 'grit-s-8',
  category: 'How I Think',
  name: 'Short Grit Scale (Grit-S)',
  popularEquivalent: 'Perseverance Assessment',
  scientificReference: 'Duckworth & Quinn (2009)',
  description: 'Measures perseverance and passion for long-term goals. Predicts success in challenging environments like academia and careers.',
  questionCount: 8,
  estimatedTime: '2-3 mins',
  scoringAlgorithm: 'average',
  scoringType: 'likert_average',
  inputType: 'likert_5',
  traitConfig: GRIT_TRAIT_CONFIG,
  questions: [
    {
      questionNumber: 1,
      text: "New ideas and projects sometimes distract me from previous ones.",
      traitKey: 'CI',
      subCategory: 'consistency_of_interest',
      reverseCoded: true,
    },
    {
      questionNumber: 2,
      text: "Setbacks don't discourage me. I don't give up easily.",
      traitKey: 'PE',
      subCategory: 'perseverance_of_effort',
      reverseCoded: false,
    },
    {
      questionNumber: 3,
      text: "I often set a goal but later choose to pursue a different one.",
      traitKey: 'CI',
      subCategory: 'consistency_of_interest',
      reverseCoded: true,
    },
    {
      questionNumber: 4,
      text: "I am a hard worker.",
      traitKey: 'PE',
      subCategory: 'perseverance_of_effort',
      reverseCoded: false,
    },
    {
      questionNumber: 5,
      text: "I have difficulty maintaining my focus on projects that take more than a few months to complete.",
      traitKey: 'CI',
      subCategory: 'consistency_of_interest',
      reverseCoded: true,
    },
    {
      questionNumber: 6,
      text: "I finish whatever I begin.",
      traitKey: 'PE',
      subCategory: 'perseverance_of_effort',
      reverseCoded: false,
    },
    {
      questionNumber: 7,
      text: "My interests change from year to year.",
      traitKey: 'CI',
      subCategory: 'consistency_of_interest',
      reverseCoded: true,
    },
    {
      questionNumber: 8,
      text: "I am diligent. I never give up.",
      traitKey: 'PE',
      subCategory: 'perseverance_of_effort',
      reverseCoded: false,
    },
  ],
};

export const CATEGORY_TWO_ASSESSMENTS: AssessmentSeedData[] = [
  ICAR_16,
  GRIT_SCALE_8,
];
