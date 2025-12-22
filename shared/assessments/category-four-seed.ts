export const PSS_10_CONFIG = {
  slug: 'pss-10',
  name: 'Perceived Stress Scale (PSS-10)',
  category: 'How I Feel',
  description: 'The most widely used instrument for measuring the perception of stress in daily life.',
  scientific_reference: 'Cohen (1983)',
  popular_equivalent: 'Stress Level Test',
  question_count: 10,
  estimated_time: '3 mins',
  cronbach_alpha: 0.85,
  validity_score: 0.78,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_0_4',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'STRESS', name: 'Perceived Stress', color: 'hsl(0, 70%, 50%)' }
    ]
  }
};

export const PSS_10_QUESTIONS = [
  { question_number: 1, text: 'In the last month, how often have you been upset because of something that happened unexpectedly?', trait_key: 'STRESS', reverse_coded: false },
  { question_number: 2, text: 'In the last month, how often have you felt that you were unable to control the important things in your life?', trait_key: 'STRESS', reverse_coded: false },
  { question_number: 3, text: 'In the last month, how often have you felt nervous and stressed?', trait_key: 'STRESS', reverse_coded: false },
  { question_number: 4, text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?', trait_key: 'STRESS', reverse_coded: true },
  { question_number: 5, text: 'In the last month, how often have you felt that things were going your way?', trait_key: 'STRESS', reverse_coded: true },
  { question_number: 6, text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?', trait_key: 'STRESS', reverse_coded: false },
  { question_number: 7, text: 'In the last month, how often have you been able to control irritations in your life?', trait_key: 'STRESS', reverse_coded: true },
  { question_number: 8, text: 'In the last month, how often have you felt that you were on top of things?', trait_key: 'STRESS', reverse_coded: true },
  { question_number: 9, text: 'In the last month, how often have you been angered because of things that happened that were outside of your control?', trait_key: 'STRESS', reverse_coded: false },
  { question_number: 10, text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?', trait_key: 'STRESS', reverse_coded: false },
];

export const SWLS_CONFIG = {
  slug: 'swls-5',
  name: 'Satisfaction With Life Scale (SWLS)',
  category: 'How I Feel',
  description: 'A short, valid measure of global life satisfaction and subjective well-being.',
  scientific_reference: 'Diener (1985)',
  popular_equivalent: 'Happiness Index',
  question_count: 5,
  estimated_time: '1-2 mins',
  cronbach_alpha: 0.87,
  validity_score: 0.82,
  scoring_algorithm: 'summation' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_7',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'SATISFACTION', name: 'Life Satisfaction', color: 'hsl(142, 71%, 45%)' }
    ]
  }
};

export const SWLS_QUESTIONS = [
  { question_number: 1, text: 'In most ways my life is close to my ideal.', trait_key: 'SATISFACTION', reverse_coded: false },
  { question_number: 2, text: 'The conditions of my life are excellent.', trait_key: 'SATISFACTION', reverse_coded: false },
  { question_number: 3, text: 'I am satisfied with my life.', trait_key: 'SATISFACTION', reverse_coded: false },
  { question_number: 4, text: 'So far I have gotten the important things I want in life.', trait_key: 'SATISFACTION', reverse_coded: false },
  { question_number: 5, text: 'If I could live my life over, I would change almost nothing.', trait_key: 'SATISFACTION', reverse_coded: false },
];

export const BRS_CONFIG = {
  slug: 'brs-6',
  name: 'Brief Resilience Scale (BRS)',
  category: 'How I Feel',
  description: 'Measures the ability to bounce back or recover from stress and adversity.',
  scientific_reference: 'Smith et al. (2008)',
  popular_equivalent: 'Bounce-Back Factor',
  question_count: 6,
  estimated_time: '2 mins',
  cronbach_alpha: 0.83,
  validity_score: 0.76,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_5',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'RESILIENCE', name: 'Resilience', color: 'hsl(199, 89%, 48%)' }
    ]
  }
};

export const BRS_QUESTIONS = [
  { question_number: 1, text: 'I tend to bounce back quickly after hard times.', trait_key: 'RESILIENCE', reverse_coded: false },
  { question_number: 2, text: 'I have a hard time making it through stressful events.', trait_key: 'RESILIENCE', reverse_coded: true },
  { question_number: 3, text: 'It does not take me long to recover from a stressful event.', trait_key: 'RESILIENCE', reverse_coded: false },
  { question_number: 4, text: 'It is hard for me to snap back when something bad happens.', trait_key: 'RESILIENCE', reverse_coded: true },
  { question_number: 5, text: 'I usually come through difficult times with little trouble.', trait_key: 'RESILIENCE', reverse_coded: false },
  { question_number: 6, text: 'I tend to take a long time to get over set-backs in my life.', trait_key: 'RESILIENCE', reverse_coded: true },
];

export const FS_CONFIG = {
  slug: 'flourishing-8',
  name: 'Flourishing Scale (FS)',
  category: 'How I Feel',
  description: 'Measures self-perceived success in relationships, self-esteem, purpose, and optimism.',
  scientific_reference: 'Diener (2009)',
  popular_equivalent: 'Well-being Index',
  question_count: 8,
  estimated_time: '2-3 mins',
  cronbach_alpha: 0.87,
  validity_score: 0.80,
  scoring_algorithm: 'summation' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_7',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'FLOURISHING', name: 'Psychological Well-being', color: 'hsl(280, 65%, 60%)' }
    ]
  }
};

export const FS_QUESTIONS = [
  { question_number: 1, text: 'I lead a purposeful and meaningful life.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 2, text: 'My social relationships are supportive and rewarding.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 3, text: 'I am engaged and interested in my daily activities.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 4, text: 'I actively contribute to the happiness and well-being of others.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 5, text: 'I am competent and capable in the activities that are important to me.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 6, text: 'I am a good person and live a good life.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 7, text: 'I am optimistic about my future.', trait_key: 'FLOURISHING', reverse_coded: false },
  { question_number: 8, text: 'People respect me.', trait_key: 'FLOURISHING', reverse_coded: false },
];

export const CATEGORY_FOUR_CONFIGS = [PSS_10_CONFIG, SWLS_CONFIG, BRS_CONFIG, FS_CONFIG];

export const CATEGORY_FOUR_QUESTIONS = {
  'pss-10': PSS_10_QUESTIONS,
  'swls-5': SWLS_QUESTIONS,
  'brs-6': BRS_QUESTIONS,
  'flourishing-8': FS_QUESTIONS,
};

export function getCategoryFourAssessmentData(slug: string) {
  const configs: Record<string, typeof PSS_10_CONFIG | typeof SWLS_CONFIG | typeof BRS_CONFIG | typeof FS_CONFIG> = {
    'pss-10': PSS_10_CONFIG,
    'swls-5': SWLS_CONFIG,
    'brs-6': BRS_CONFIG,
    'flourishing-8': FS_CONFIG,
  };
  
  const questions = CATEGORY_FOUR_QUESTIONS[slug as keyof typeof CATEGORY_FOUR_QUESTIONS];
  const config = configs[slug];
  
  if (!config || !questions) return null;
  
  return { config, questions };
}
