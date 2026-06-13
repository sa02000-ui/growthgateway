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
  measurementClass: 'trait' | 'state';
  retestIntervalDays: number;
  oneTime?: boolean;
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

export const RIASEC_TRAIT_CONFIG: TraitConfig = {
  traits: [
    { key: 'R', name: 'Realistic', description: 'Practical, hands-on, mechanical activities', color: '#78716c' },
    { key: 'I', name: 'Investigative', description: 'Analytical, intellectual, scientific activities', color: '#3b82f6' },
    { key: 'A', name: 'Artistic', description: 'Creative, expressive, unstructured activities', color: '#a855f7' },
    { key: 'S', name: 'Social', description: 'Helping, teaching, caregiving activities', color: '#10b981' },
    { key: 'E', name: 'Enterprising', description: 'Leading, persuading, business activities', color: '#f59e0b' },
    { key: 'C', name: 'Conventional', description: 'Organizing, detail-oriented, data activities', color: '#06b6d4' },
  ],
};

export const RIASEC_30: AssessmentSeedData = {
  slug: 'onet-riasec-30',
  measurementClass: 'trait',
  retestIntervalDays: 365,
  category: 'How I Interact',
  name: 'O*NET Interest Profiler (Mini)',
  popularEquivalent: 'Holland Career Test',
  scientificReference: 'Rounds et al. (1999)',
  description: 'Identifies your career interests across six dimensions: Realistic, Investigative, Artistic, Social, Enterprising, and Conventional.',
  questionCount: 30,
  estimatedTime: '5-7 mins',
  scoringAlgorithm: 'multi_category',
  scoringType: 'multi_category',
  inputType: 'likert_5',
  traitConfig: RIASEC_TRAIT_CONFIG,
  questions: [
    { questionNumber: 1, text: "Build kitchen cabinets", traitKey: 'R', subCategory: 'Realistic', reverseCoded: false },
    { questionNumber: 2, text: "Lay brick or tile", traitKey: 'R', subCategory: 'Realistic', reverseCoded: false },
    { questionNumber: 3, text: "Repair household appliances", traitKey: 'R', subCategory: 'Realistic', reverseCoded: false },
    { questionNumber: 4, text: "Assemble electronic parts", traitKey: 'R', subCategory: 'Realistic', reverseCoded: false },
    { questionNumber: 5, text: "Drive a truck to deliver packages", traitKey: 'R', subCategory: 'Realistic', reverseCoded: false },
    { questionNumber: 6, text: "Study ways to reduce water pollution", traitKey: 'I', subCategory: 'Investigative', reverseCoded: false },
    { questionNumber: 7, text: "Conduct chemical experiments", traitKey: 'I', subCategory: 'Investigative', reverseCoded: false },
    { questionNumber: 8, text: "Study the movement of planets", traitKey: 'I', subCategory: 'Investigative', reverseCoded: false },
    { questionNumber: 9, text: "Examine blood samples using a microscope", traitKey: 'I', subCategory: 'Investigative', reverseCoded: false },
    { questionNumber: 10, text: "Investigate the cause of a fire", traitKey: 'I', subCategory: 'Investigative', reverseCoded: false },
    { questionNumber: 11, text: "Design artwork for magazines", traitKey: 'A', subCategory: 'Artistic', reverseCoded: false },
    { questionNumber: 12, text: "Write books or plays", traitKey: 'A', subCategory: 'Artistic', reverseCoded: false },
    { questionNumber: 13, text: "Play a musical instrument", traitKey: 'A', subCategory: 'Artistic', reverseCoded: false },
    { questionNumber: 14, text: "Perform stunts for a movie or TV show", traitKey: 'A', subCategory: 'Artistic', reverseCoded: false },
    { questionNumber: 15, text: "Design sets for plays", traitKey: 'A', subCategory: 'Artistic', reverseCoded: false },
    { questionNumber: 16, text: "Teach children how to read", traitKey: 'S', subCategory: 'Social', reverseCoded: false },
    { questionNumber: 17, text: "Help people with personal or emotional problems", traitKey: 'S', subCategory: 'Social', reverseCoded: false },
    { questionNumber: 18, text: "Give career guidance to people", traitKey: 'S', subCategory: 'Social', reverseCoded: false },
    { questionNumber: 19, text: "Perform rehabilitation therapy", traitKey: 'S', subCategory: 'Social', reverseCoded: false },
    { questionNumber: 20, text: "Do volunteer work at a non-profit organization", traitKey: 'S', subCategory: 'Social', reverseCoded: false },
    { questionNumber: 21, text: "Sell restaurant franchises to individuals", traitKey: 'E', subCategory: 'Enterprising', reverseCoded: false },
    { questionNumber: 22, text: "Manage a retail store", traitKey: 'E', subCategory: 'Enterprising', reverseCoded: false },
    { questionNumber: 23, text: "Operate your own service business", traitKey: 'E', subCategory: 'Enterprising', reverseCoded: false },
    { questionNumber: 24, text: "Manage a department within a large company", traitKey: 'E', subCategory: 'Enterprising', reverseCoded: false },
    { questionNumber: 25, text: "Negotiate business contracts", traitKey: 'E', subCategory: 'Enterprising', reverseCoded: false },
    { questionNumber: 26, text: "Generate the monthly payroll checks for an office", traitKey: 'C', subCategory: 'Conventional', reverseCoded: false },
    { questionNumber: 27, text: "Inventory supplies using a hand-held computer", traitKey: 'C', subCategory: 'Conventional', reverseCoded: false },
    { questionNumber: 28, text: "Keep shipping and receiving records", traitKey: 'C', subCategory: 'Conventional', reverseCoded: false },
    { questionNumber: 29, text: "Calculate the wages of employees", traitKey: 'C', subCategory: 'Conventional', reverseCoded: false },
    { questionNumber: 30, text: "Proofread records or forms", traitKey: 'C', subCategory: 'Conventional', reverseCoded: false },
  ],
};

export const TEIQUE_TRAIT_CONFIG: TraitConfig = {
  traits: [
    { key: 'WB', name: 'Well-being', description: 'Self-confidence and life satisfaction', color: '#22c55e' },
    { key: 'SC', name: 'Self-control', description: 'Regulation of emotions and impulses', color: '#3b82f6' },
    { key: 'EM', name: 'Emotionality', description: 'Perception and expression of emotions', color: '#ec4899' },
    { key: 'SO', name: 'Sociability', description: 'Social awareness and relationships', color: '#f59e0b' },
  ],
};

export const TEIQUE_SF_30: AssessmentSeedData = {
  slug: 'teique-sf-30',
  measurementClass: 'trait',
  retestIntervalDays: 365,
  category: 'How I Interact',
  name: 'TEIQue-SF (Emotional Intelligence)',
  popularEquivalent: 'EQ Assessment',
  scientificReference: 'Cooper & Petrides (2010)',
  description: 'Measures trait emotional intelligence across four factors: Well-being, Self-control, Emotionality, and Sociability.',
  questionCount: 30,
  estimatedTime: '5-7 mins',
  scoringAlgorithm: 'multi_category',
  scoringType: 'multi_category',
  inputType: 'likert_7',
  traitConfig: TEIQUE_TRAIT_CONFIG,
  questions: [
    { questionNumber: 1, text: "Expressing my emotions with words is not a problem for me.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: false },
    { questionNumber: 2, text: "I often find it difficult to see things from another person's viewpoint.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: true },
    { questionNumber: 3, text: "On the whole, I'm a highly motivated person.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: false },
    { questionNumber: 4, text: "I usually find it difficult to regulate my emotions.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: true },
    { questionNumber: 5, text: "I generally don't find life enjoyable.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: true },
    { questionNumber: 6, text: "I can deal effectively with people.", traitKey: 'SO', subCategory: 'Sociability', reverseCoded: false },
    { questionNumber: 7, text: "I tend to change my mind frequently.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: true },
    { questionNumber: 8, text: "Many times, I can't figure out what emotion I'm feeling.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: true },
    { questionNumber: 9, text: "I feel that I have a number of good qualities.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: false },
    { questionNumber: 10, text: "I often find it difficult to stand up for my rights.", traitKey: 'SO', subCategory: 'Sociability', reverseCoded: true },
    { questionNumber: 11, text: "I'm usually able to influence the way other people feel.", traitKey: 'SO', subCategory: 'Sociability', reverseCoded: false },
    { questionNumber: 12, text: "On the whole, I have a gloomy perspective on most things.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: true },
    { questionNumber: 13, text: "Those close to me often complain that I don't treat them right.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: true },
    { questionNumber: 14, text: "I often find it difficult to adjust my life according to circumstances.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: true },
    { questionNumber: 15, text: "On the whole, I'm able to deal with stress.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: false },
    { questionNumber: 16, text: "I often find it difficult to show my affection to those close to me.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: true },
    { questionNumber: 17, text: "I'm normally able to 'get into someone's shoes' and experience their emotions.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: false },
    { questionNumber: 18, text: "I normally find it difficult to keep myself motivated.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: true },
    { questionNumber: 19, text: "I'm usually able to find ways to control my emotions when I want to.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: false },
    { questionNumber: 20, text: "On the whole, I'm pleased with my life.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: false },
    { questionNumber: 21, text: "I would describe myself as a good negotiator.", traitKey: 'SO', subCategory: 'Sociability', reverseCoded: false },
    { questionNumber: 22, text: "I tend to get involved in things I later wish I could get out of.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: true },
    { questionNumber: 23, text: "I often pause and think about my feelings.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: false },
    { questionNumber: 24, text: "I believe I'm full of personal strengths.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: false },
    { questionNumber: 25, text: "I tend to 'back down' even if I know I'm right.", traitKey: 'SO', subCategory: 'Sociability', reverseCoded: true },
    { questionNumber: 26, text: "I don't seem to have any power at all over other people's feelings.", traitKey: 'SO', subCategory: 'Sociability', reverseCoded: true },
    { questionNumber: 27, text: "I generally believe that things will work out fine in my life.", traitKey: 'WB', subCategory: 'Well-being', reverseCoded: false },
    { questionNumber: 28, text: "I find it difficult to bond well even with those close to me.", traitKey: 'EM', subCategory: 'Emotionality', reverseCoded: true },
    { questionNumber: 29, text: "Generally, I'm able to adapt to new environments.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: false },
    { questionNumber: 30, text: "Others admire me for being relaxed.", traitKey: 'SC', subCategory: 'Self-control', reverseCoded: false },
  ],
};

export const CATEGORY_THREE_ASSESSMENTS: AssessmentSeedData[] = [
  RIASEC_30,
  TEIQUE_SF_30,
];
