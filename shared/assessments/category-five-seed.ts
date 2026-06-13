// Category 5 — additional well-being / self-concept instruments (Phase 5).
//
// These follow the same snake_case config + QUESTIONS-array shape used by
// category-four-seed.ts so they slot directly into the existing library
// builder, questions lookup, seed endpoint, and generic scoring engine.
//
// Scoring notes (all surface on the engine's 0–100 display scale):
//   - WHO-5  (likert_0_5, 'average'): percentage == raw-sum × 4  → 0–100.
//   - UCLA-3 (likert_3, 'average'): higher == lonelier.
//   - Cantril (ladder_0_10, 'average'): single item, value × 10 → 0–100.
//   - I-PANAS-SF (likert_5, 'multi_category'): two independent scores
//     (Positive Affect / Negative Affect), each normalised to 0–100.
//   - RSES / GSE (likert_4, 'average'): higher == more self-esteem / efficacy.
//
// TODO(scs): The Self-Compassion Scale (SCS) is intentionally NOT included
// here. Add it in a later pass once licensing/item wording is confirmed.

// ---------------------------------------------------------------------------
// WHO-5 Well-Being Index
// ---------------------------------------------------------------------------
export const WHO_5_CONFIG = {
  slug: 'who-5',
  measurement_class: 'state' as const,
  retest_interval_days: 14,
  sd: 18,
  name: 'WHO-5 Well-Being Index',
  category: 'How I Feel',
  description: 'A short, widely used measure of current psychological well-being over the past two weeks.',
  scientific_reference: 'Topp et al. (2015)',
  popular_equivalent: 'Mood & Well-Being Check',
  question_count: 5,
  estimated_time: '1 min',
  cronbach_alpha: 0.84,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_0_5',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'WELLBEING', name: 'Well-Being', color: 'hsl(142, 71%, 45%)' }
    ]
  }
};

export const WHO_5_QUESTIONS = [
  { question_number: 1, text: 'Over the last two weeks, I have felt cheerful and in good spirits.', trait_key: 'WELLBEING', reverse_coded: false },
  { question_number: 2, text: 'Over the last two weeks, I have felt calm and relaxed.', trait_key: 'WELLBEING', reverse_coded: false },
  { question_number: 3, text: 'Over the last two weeks, I have felt active and vigorous.', trait_key: 'WELLBEING', reverse_coded: false },
  { question_number: 4, text: 'Over the last two weeks, I woke up feeling fresh and rested.', trait_key: 'WELLBEING', reverse_coded: false },
  { question_number: 5, text: 'Over the last two weeks, my daily life has been filled with things that interest me.', trait_key: 'WELLBEING', reverse_coded: false },
];

// ---------------------------------------------------------------------------
// I-PANAS-SF — International Positive and Negative Affect Schedule (Short Form)
// Two independent scores: Positive Affect (PA) and Negative Affect (NA).
// ---------------------------------------------------------------------------
export const I_PANAS_SF_CONFIG = {
  slug: 'i-panas-sf',
  measurement_class: 'state' as const,
  retest_interval_days: 7,
  sd: 18,
  name: 'Positive & Negative Affect (I-PANAS-SF)',
  category: 'How I Feel',
  description: 'A brief measure of your general balance of positive and negative emotion.',
  scientific_reference: 'Thompson (2007)',
  popular_equivalent: 'Mood Balance Check',
  question_count: 10,
  estimated_time: '1-2 mins',
  cronbach_alpha: 0.78,
  scoring_algorithm: 'multi_category' as const,
  scoring_type: 'multi_category' as const,
  input_type: 'likert_5',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'PA', name: 'Positive Affect', color: 'hsl(142, 71%, 45%)' },
      { key: 'NA', name: 'Negative Affect', color: 'hsl(0, 70%, 50%)' },
    ]
  }
};

export const I_PANAS_SF_QUESTIONS = [
  { question_number: 1, text: 'Thinking about how you generally feel, to what extent do you feel: Active', trait_key: 'PA', reverse_coded: false },
  { question_number: 2, text: 'Thinking about how you generally feel, to what extent do you feel: Alert', trait_key: 'PA', reverse_coded: false },
  { question_number: 3, text: 'Thinking about how you generally feel, to what extent do you feel: Attentive', trait_key: 'PA', reverse_coded: false },
  { question_number: 4, text: 'Thinking about how you generally feel, to what extent do you feel: Determined', trait_key: 'PA', reverse_coded: false },
  { question_number: 5, text: 'Thinking about how you generally feel, to what extent do you feel: Inspired', trait_key: 'PA', reverse_coded: false },
  { question_number: 6, text: 'Thinking about how you generally feel, to what extent do you feel: Afraid', trait_key: 'NA', reverse_coded: false },
  { question_number: 7, text: 'Thinking about how you generally feel, to what extent do you feel: Ashamed', trait_key: 'NA', reverse_coded: false },
  { question_number: 8, text: 'Thinking about how you generally feel, to what extent do you feel: Hostile', trait_key: 'NA', reverse_coded: false },
  { question_number: 9, text: 'Thinking about how you generally feel, to what extent do you feel: Nervous', trait_key: 'NA', reverse_coded: false },
  { question_number: 10, text: 'Thinking about how you generally feel, to what extent do you feel: Upset', trait_key: 'NA', reverse_coded: false },
];

// ---------------------------------------------------------------------------
// UCLA-3 — Three-Item Loneliness Scale (higher == lonelier)
// ---------------------------------------------------------------------------
export const UCLA_3_CONFIG = {
  slug: 'ucla-3',
  measurement_class: 'state' as const,
  retest_interval_days: 30,
  sd: 18,
  name: 'Loneliness Scale (UCLA-3)',
  category: 'How I Feel',
  description: 'A brief measure of current feelings of social connection and loneliness.',
  scientific_reference: 'Hughes et al. (2004)',
  popular_equivalent: 'Social Connection Check',
  question_count: 3,
  estimated_time: '1 min',
  cronbach_alpha: 0.72,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_3',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'LONELINESS', name: 'Loneliness', color: 'hsl(199, 89%, 48%)' }
    ]
  }
};

export const UCLA_3_QUESTIONS = [
  { question_number: 1, text: 'How often do you feel that you lack companionship?', trait_key: 'LONELINESS', reverse_coded: false },
  { question_number: 2, text: 'How often do you feel left out?', trait_key: 'LONELINESS', reverse_coded: false },
  { question_number: 3, text: 'How often do you feel isolated from others?', trait_key: 'LONELINESS', reverse_coded: false },
];

// ---------------------------------------------------------------------------
// Cantril Self-Anchoring Ladder — single-item life evaluation (0–10)
// ---------------------------------------------------------------------------
export const CANTRIL_CONFIG = {
  slug: 'cantril-ladder',
  measurement_class: 'state' as const,
  retest_interval_days: 7,
  name: 'Life Evaluation Ladder (Cantril)',
  category: 'How I Feel',
  description: 'A single-item evaluation of where you feel your life stands right now.',
  scientific_reference: 'Cantril (1965)',
  popular_equivalent: 'Life Satisfaction Ladder',
  question_count: 1,
  estimated_time: '1 min',
  // Single-item measure: no internal-consistency reliability is reported.
  cronbach_alpha: null as number | null,
  sd: null as number | null,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'ladder_0_10',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'LIFE_EVAL', name: 'Life Evaluation', color: 'hsl(142, 71%, 45%)' }
    ]
  }
};

export const CANTRIL_QUESTIONS = [
  { question_number: 1, text: 'Imagine a ladder with steps numbered from 0 at the bottom to 10 at the top. The top represents the best possible life for you and the bottom the worst possible life. On which step do you feel you personally stand at this time?', trait_key: 'LIFE_EVAL', reverse_coded: false },
];

// ---------------------------------------------------------------------------
// RSES — Rosenberg Self-Esteem Scale (higher == higher self-esteem)
// ---------------------------------------------------------------------------
export const RSES_CONFIG = {
  slug: 'rses-10',
  measurement_class: 'state' as const,
  retest_interval_days: 90,
  sd: 18,
  name: 'Self-Esteem Scale (RSES)',
  // Self-concept measure (not affect/well-being) → grouped under "Who Am I",
  // but still state-classified so it appears in the Journey/time-series view.
  category: 'Who Am I',
  description: 'A classic measure of overall self-worth and self-acceptance.',
  scientific_reference: 'Rosenberg (1965)',
  popular_equivalent: 'Self-Esteem Test',
  question_count: 10,
  estimated_time: '2 mins',
  cronbach_alpha: 0.89,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_4',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'SELF_ESTEEM', name: 'Self-Esteem', color: 'hsl(142, 71%, 45%)' }
    ]
  }
};

export const RSES_QUESTIONS = [
  { question_number: 1, text: 'On the whole, I am satisfied with myself.', trait_key: 'SELF_ESTEEM', reverse_coded: false },
  { question_number: 2, text: 'At times I think I am no good at all.', trait_key: 'SELF_ESTEEM', reverse_coded: true },
  { question_number: 3, text: 'I feel that I have a number of good qualities.', trait_key: 'SELF_ESTEEM', reverse_coded: false },
  { question_number: 4, text: 'I am able to do things as well as most other people.', trait_key: 'SELF_ESTEEM', reverse_coded: false },
  { question_number: 5, text: 'I feel I do not have much to be proud of.', trait_key: 'SELF_ESTEEM', reverse_coded: true },
  { question_number: 6, text: 'I certainly feel useless at times.', trait_key: 'SELF_ESTEEM', reverse_coded: true },
  { question_number: 7, text: "I feel that I'm a person of worth, at least on an equal plane with others.", trait_key: 'SELF_ESTEEM', reverse_coded: false },
  { question_number: 8, text: 'I wish I could have more respect for myself.', trait_key: 'SELF_ESTEEM', reverse_coded: true },
  { question_number: 9, text: 'All in all, I am inclined to feel that I am a failure.', trait_key: 'SELF_ESTEEM', reverse_coded: true },
  { question_number: 10, text: 'I take a positive attitude toward myself.', trait_key: 'SELF_ESTEEM', reverse_coded: false },
];

// ---------------------------------------------------------------------------
// GSE — General Self-Efficacy Scale (higher == more self-efficacy)
// ---------------------------------------------------------------------------
export const GSE_CONFIG = {
  slug: 'gse-10',
  measurement_class: 'state' as const,
  retest_interval_days: 90,
  sd: 18,
  name: 'General Self-Efficacy Scale (GSE)',
  // Self-concept measure (not affect/well-being) → grouped under "Who Am I",
  // but still state-classified so it appears in the Journey/time-series view.
  category: 'Who Am I',
  description: 'Measures your belief in your ability to cope with a broad range of demands and challenges.',
  scientific_reference: 'Schwarzer & Jerusalem (1995)',
  popular_equivalent: 'Confidence & Coping Test',
  question_count: 10,
  estimated_time: '2 mins',
  cronbach_alpha: 0.86,
  scoring_algorithm: 'average' as const,
  scoring_type: 'single_score' as const,
  input_type: 'likert_4',
  is_active: true,
  trait_config: {
    traits: [
      { key: 'SELF_EFFICACY', name: 'Self-Efficacy', color: 'hsl(199, 89%, 48%)' }
    ]
  }
};

export const GSE_QUESTIONS = [
  { question_number: 1, text: 'I can always manage to solve difficult problems if I try hard enough.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 2, text: 'If someone opposes me, I can find the means and ways to get what I want.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 3, text: 'It is easy for me to stick to my aims and accomplish my goals.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 4, text: 'I am confident that I could deal efficiently with unexpected events.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 5, text: 'Thanks to my resourcefulness, I know how to handle unforeseen situations.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 6, text: 'I can solve most problems if I invest the necessary effort.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 7, text: 'I can remain calm when facing difficulties because I can rely on my coping abilities.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 8, text: 'When I am confronted with a problem, I can usually find several solutions.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 9, text: 'If I am in trouble, I can usually think of a solution.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
  { question_number: 10, text: 'I can usually handle whatever comes my way.', trait_key: 'SELF_EFFICACY', reverse_coded: false },
];

// ---------------------------------------------------------------------------
// Peer 360 instrument — CONTENT ONLY (not yet wired into the live feedback flow).
//
// Delivering this requires the deferred Phase 4 relationship-segmentation column
// and peer-side storage, both of which need DDL on the EXTERNAL Supabase project
// (no migration access from here). The item wording ships now so it is ready to
// wire once that storage exists. Aggregation should reuse the existing
// "threshold of 3" rule and segment by relationship; this is a custom growth-
// oriented instrument with NO published norms or reliability — do not borrow them.
// ---------------------------------------------------------------------------
export const PEER_360_INSTRUMENT = {
  slug: 'peer-360',
  name: '360° Peer Competencies',
  description: 'A short peer-rated view of everyday strengths, gathered from people who know you.',
  // Custom instrument — no published norms / reliability.
  adapted_from: null as string | null,
  input_type: 'likert_5',
  competencies: [
    { key: 'COMMUNICATION', name: 'Communication' },
    { key: 'RELIABILITY', name: 'Reliability' },
    { key: 'EMPATHY', name: 'Empathy' },
    { key: 'COLLABORATION', name: 'Collaboration' },
    { key: 'ADAPTABILITY', name: 'Adaptability' },
  ],
  questions: [
    { question_number: 1, text: 'This person communicates clearly and listens well.', competency_key: 'COMMUNICATION' },
    { question_number: 2, text: 'This person explains their thinking in a way that is easy to follow.', competency_key: 'COMMUNICATION' },
    { question_number: 3, text: 'This person follows through on what they commit to.', competency_key: 'RELIABILITY' },
    { question_number: 4, text: 'This person can be counted on when it matters.', competency_key: 'RELIABILITY' },
    { question_number: 5, text: 'This person notices and responds to how others are feeling.', competency_key: 'EMPATHY' },
    { question_number: 6, text: 'This person treats others with genuine consideration.', competency_key: 'EMPATHY' },
    { question_number: 7, text: 'This person works well with others toward a shared goal.', competency_key: 'COLLABORATION' },
    { question_number: 8, text: 'This person shares credit and supports the people around them.', competency_key: 'COLLABORATION' },
    { question_number: 9, text: 'This person handles change and setbacks calmly.', competency_key: 'ADAPTABILITY' },
    { question_number: 10, text: 'This person adjusts their approach when circumstances shift.', competency_key: 'ADAPTABILITY' },
  ],
};
