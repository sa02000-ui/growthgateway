import type { ScoringAlgorithm, ScoringType, TraitConfig } from './schema';

export interface QuestionData {
  questionNumber: number;
  traitKey: string;
  facetKey?: string;
  subCategory?: string;
  reverseCoded: boolean;
  correctOption?: string;
  inputType: string;
}

export interface AssessmentConfig {
  slug: string;
  scoringAlgorithm: ScoringAlgorithm;
  scoringType: ScoringType;
  inputType: string;
  traitConfig: TraitConfig;
  questions: QuestionData[];
}

export interface AssessmentResponses {
  [questionNumber: string]: number | string;
}

export interface TraitScore {
  key: string;
  name: string;
  score: number;
  maxScore?: number;
  percentile?: number;
  interpretation?: string;
  color?: string;
}

export interface AssessmentResult {
  slug: string;
  totalScore?: number;
  percentageScore?: number;
  traitScores: TraitScore[];
  facetScores?: TraitScore[];
  categoryScores?: Record<string, number>;
  rawResponses: AssessmentResponses;
}

function getMaxScaleValue(inputType: string): number {
  switch (inputType) {
    case 'likert_3': return 3;
    case 'likert_4': return 4;
    case 'likert_5': return 5;
    case 'likert_6': return 6;
    case 'likert_7': return 7;
    case 'likert_0_4': return 4;
    case 'likert_0_5': return 5;
    case 'ladder_0_10': return 10;
    case 'binary': return 1;
    default: return 5;
  }
}

function getMinScaleValue(inputType: string): number {
  switch (inputType) {
    case 'likert_0_4': return 0;
    case 'likert_0_5': return 0;
    case 'ladder_0_10': return 0;
    default: return 1;
  }
}

function handleReversal(value: number, reversed: boolean, inputType: string): number {
  if (!reversed) return value;
  const max = getMaxScaleValue(inputType);
  const min = getMinScaleValue(inputType);
  return (max + min) - value;
}

export function calculateAverageScore(
  questions: QuestionData[],
  responses: AssessmentResponses,
  traitConfig: TraitConfig,
  inputType: string
): AssessmentResult {
  const traitScores: Record<string, { total: number; count: number }> = {};
  const facetScores: Record<string, { total: number; count: number }> = {};

  for (const trait of traitConfig.traits) {
    traitScores[trait.key] = { total: 0, count: 0 };
  }

  if (traitConfig.facets) {
    for (const facet of traitConfig.facets) {
      facetScores[facet.key] = { total: 0, count: 0 };
    }
  }

  for (const question of questions) {
    const response = responses[String(question.questionNumber)];
    if (response === undefined) continue;

    const numericResponse = typeof response === 'number' ? response : parseFloat(response);
    if (isNaN(numericResponse)) continue;

    const adjustedValue = handleReversal(numericResponse, question.reverseCoded, inputType);

    if (traitScores[question.traitKey]) {
      traitScores[question.traitKey].total += adjustedValue;
      traitScores[question.traitKey].count++;
    }

    if (question.facetKey && facetScores[question.facetKey]) {
      facetScores[question.facetKey].total += adjustedValue;
      facetScores[question.facetKey].count++;
    }
  }

  const maxScale = getMaxScaleValue(inputType);
  const minScale = getMinScaleValue(inputType);
  const range = maxScale - minScale;

  const resultTraitScores: TraitScore[] = traitConfig.traits.map(trait => {
    const data = traitScores[trait.key];
    if (data.count > 0) {
      const avgScore = data.total / data.count;
      const percentageScore = ((avgScore - minScale) / range) * 100;
      return {
        key: trait.key,
        name: trait.name,
        score: Math.round(percentageScore * 100) / 100,
        maxScore: 100,
        color: trait.color,
        interpretation: getInterpretation(percentageScore),
      };
    }
    const otherTraits = traitConfig.traits.filter(t => t.key !== trait.key && traitScores[t.key].count > 0);
    if (otherTraits.length > 0) {
      const compositeAvg = otherTraits.reduce((sum, t) => {
        const d = traitScores[t.key];
        return sum + (d.total / d.count);
      }, 0) / otherTraits.length;
      const percentageScore = ((compositeAvg - minScale) / range) * 100;
      return {
        key: trait.key,
        name: trait.name,
        score: Math.round(percentageScore * 100) / 100,
        maxScore: 100,
        color: trait.color,
        interpretation: getInterpretation(percentageScore),
      };
    }
    return {
      key: trait.key,
      name: trait.name,
      score: 0,
      maxScore: 100,
      color: trait.color,
      interpretation: getInterpretation(0),
    };
  });

  const resultFacetScores: TraitScore[] = (traitConfig.facets || []).map(facet => {
    const data = facetScores[facet.key];
    const avgScore = data.count > 0 ? data.total / data.count : 0;
    const percentageScore = ((avgScore - minScale) / range) * 100;

    return {
      key: facet.key,
      name: facet.name,
      score: Math.round(percentageScore * 100) / 100,
      maxScore: 100,
    };
  });

  return {
    slug: '',
    traitScores: resultTraitScores,
    facetScores: resultFacetScores.length > 0 ? resultFacetScores : undefined,
    rawResponses: responses,
  };
}

export function calculateSummationScore(
  questions: QuestionData[],
  responses: AssessmentResponses,
  traitConfig: TraitConfig,
  inputType: string
): AssessmentResult {
  const traitScores: Record<string, number> = {};
  const traitCounts: Record<string, number> = {};

  for (const trait of traitConfig.traits) {
    traitScores[trait.key] = 0;
    traitCounts[trait.key] = 0;
  }

  for (const question of questions) {
    const response = responses[String(question.questionNumber)];
    if (response === undefined) continue;

    const numericResponse = typeof response === 'number' ? response : parseFloat(response);
    if (isNaN(numericResponse)) continue;

    const adjustedValue = handleReversal(numericResponse, question.reverseCoded, inputType);

    if (traitScores[question.traitKey] !== undefined) {
      traitScores[question.traitKey] += adjustedValue;
      traitCounts[question.traitKey]++;
    }
  }

  const maxScale = getMaxScaleValue(inputType);

  const resultTraitScores: TraitScore[] = traitConfig.traits.map(trait => {
    const sum = traitScores[trait.key];
    const count = traitCounts[trait.key];
    const maxPossible = count * maxScale;
    const average = count > 0 ? sum / count : 0;

    const populationAvg = traitConfig.populationAverages?.[trait.key];
    let interpretation = '';
    if (populationAvg !== undefined) {
      if (average > populationAvg + 0.5) interpretation = 'Above Average';
      else if (average < populationAvg - 0.5) interpretation = 'Below Average';
      else interpretation = 'Average';
    }

    return {
      key: trait.key,
      name: trait.name,
      score: Math.round(average * 100) / 100,
      maxScore: maxScale,
      color: trait.color,
      interpretation,
    };
  });

  return {
    slug: '',
    traitScores: resultTraitScores,
    rawResponses: responses,
  };
}

export function calculateComplexCenteringScore(
  questions: QuestionData[],
  responses: AssessmentResponses,
  traitConfig: TraitConfig,
  inputType: string
): AssessmentResult {
  let totalSum = 0;
  let totalCount = 0;

  for (const question of questions) {
    const response = responses[String(question.questionNumber)];
    if (response === undefined) continue;

    const numericResponse = typeof response === 'number' ? response : parseFloat(response);
    if (isNaN(numericResponse)) continue;

    totalSum += numericResponse;
    totalCount++;
  }

  const mrat = totalCount > 0 ? totalSum / totalCount : 0;

  const traitScores: Record<string, { total: number; count: number }> = {};
  for (const trait of traitConfig.traits) {
    traitScores[trait.key] = { total: 0, count: 0 };
  }

  for (const question of questions) {
    const response = responses[String(question.questionNumber)];
    if (response === undefined) continue;

    const numericResponse = typeof response === 'number' ? response : parseFloat(response);
    if (isNaN(numericResponse)) continue;

    const centeredValue = numericResponse - mrat;

    if (traitScores[question.traitKey]) {
      traitScores[question.traitKey].total += centeredValue;
      traitScores[question.traitKey].count++;
    }
  }

  const resultTraitScores: TraitScore[] = traitConfig.traits.map(trait => {
    const data = traitScores[trait.key];
    const avgCenteredScore = data.count > 0 ? data.total / data.count : 0;

    const normalizedScore = 50 + (avgCenteredScore * 10);
    const clampedScore = Math.max(0, Math.min(100, normalizedScore));

    return {
      key: trait.key,
      name: trait.name,
      score: Math.round(clampedScore * 100) / 100,
      maxScore: 100,
      color: trait.color,
      interpretation: getValueInterpretation(clampedScore),
    };
  });

  return {
    slug: '',
    traitScores: resultTraitScores,
    rawResponses: responses,
  };
}

export function calculateBinaryCorrectScore(
  questions: QuestionData[],
  responses: AssessmentResponses,
  traitConfig: TraitConfig
): AssessmentResult {
  let correctCount = 0;
  let totalCount = 0;

  const categoryScores: Record<string, { correct: number; total: number }> = {};

  for (const question of questions) {
    const response = responses[String(question.questionNumber)];
    if (response === undefined || response === '') continue;

    totalCount++;
    const responseStr = String(response).trim().toUpperCase();
    const correctStr = String(question.correctOption || '').trim().toUpperCase();
    const isCorrect = responseStr === correctStr;
    if (isCorrect) correctCount++;

    if (question.subCategory) {
      if (!categoryScores[question.subCategory]) {
        categoryScores[question.subCategory] = { correct: 0, total: 0 };
      }
      categoryScores[question.subCategory].total++;
      if (isCorrect) categoryScores[question.subCategory].correct++;
    }
  }

  const percentageScore = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  const percentile = calculateIQPercentile(percentageScore);

  const resultTraitScores: TraitScore[] = traitConfig.traits.map(trait => ({
    key: trait.key,
    name: trait.name,
    score: Math.round(percentageScore * 100) / 100,
    maxScore: 100,
    percentile: percentile,
    color: trait.color,
    interpretation: getIQInterpretation(percentile),
  }));

  const categoryResults: Record<string, number> = {};
  for (const [category, data] of Object.entries(categoryScores)) {
    categoryResults[category] = data.total > 0 ? (data.correct / data.total) * 100 : 0;
  }

  return {
    slug: '',
    totalScore: correctCount,
    percentageScore: Math.round(percentageScore * 100) / 100,
    traitScores: resultTraitScores,
    categoryScores: categoryResults,
    rawResponses: responses,
  };
}

export function calculateMultiCategoryScore(
  questions: QuestionData[],
  responses: AssessmentResponses,
  traitConfig: TraitConfig,
  inputType: string
): AssessmentResult {
  const categoryScores: Record<string, { total: number; count: number }> = {};

  for (const trait of traitConfig.traits) {
    categoryScores[trait.key] = { total: 0, count: 0 };
  }

  for (const question of questions) {
    const response = responses[String(question.questionNumber)];
    if (response === undefined) continue;

    const numericResponse = typeof response === 'number' ? response : parseFloat(response);
    if (isNaN(numericResponse)) continue;

    const adjustedValue = handleReversal(numericResponse, question.reverseCoded, inputType);

    if (categoryScores[question.traitKey]) {
      categoryScores[question.traitKey].total += adjustedValue;
      categoryScores[question.traitKey].count++;
    }
  }

  const maxScale = getMaxScaleValue(inputType);
  const minScale = getMinScaleValue(inputType);
  const range = maxScale - minScale;

  const resultTraitScores: TraitScore[] = traitConfig.traits.map(trait => {
    const data = categoryScores[trait.key];
    const avgScore = data.count > 0 ? data.total / data.count : 0;
    const percentageScore = ((avgScore - minScale) / range) * 100;

    return {
      key: trait.key,
      name: trait.name,
      score: Math.round(percentageScore * 100) / 100,
      maxScore: 100,
      color: trait.color,
    };
  });

  const categoryResults: Record<string, number> = {};
  for (const trait of traitConfig.traits) {
    const data = categoryScores[trait.key];
    const avgScore = data.count > 0 ? data.total / data.count : 0;
    categoryResults[trait.key] = Math.round(avgScore * 100) / 100;
  }

  return {
    slug: '',
    traitScores: resultTraitScores,
    categoryScores: categoryResults,
    rawResponses: responses,
  };
}

export function calculateAssessmentScore(
  config: AssessmentConfig,
  responses: AssessmentResponses
): AssessmentResult {
  let result: AssessmentResult;

  switch (config.scoringAlgorithm) {
    case 'average':
      result = calculateAverageScore(config.questions, responses, config.traitConfig, config.inputType);
      break;
    case 'summation':
      result = calculateSummationScore(config.questions, responses, config.traitConfig, config.inputType);
      break;
    case 'complex_centering':
      result = calculateComplexCenteringScore(config.questions, responses, config.traitConfig, config.inputType);
      break;
    case 'binary_correct':
      result = calculateBinaryCorrectScore(config.questions, responses, config.traitConfig);
      break;
    case 'multi_category':
      result = calculateMultiCategoryScore(config.questions, responses, config.traitConfig, config.inputType);
      break;
    default:
      result = calculateAverageScore(config.questions, responses, config.traitConfig, config.inputType);
  }

  result.slug = config.slug;
  return result;
}

function getInterpretation(score: number): string {
  if (score < 35) return 'Low';
  if (score < 65) return 'Average';
  return 'High';
}

function getValueInterpretation(score: number): string {
  if (score < 40) return 'Low Priority';
  if (score < 60) return 'Moderate Priority';
  return 'High Priority';
}

function calculateIQPercentile(percentageCorrect: number): number {
  if (percentageCorrect >= 95) return 99;
  if (percentageCorrect >= 90) return 95;
  if (percentageCorrect >= 85) return 90;
  if (percentageCorrect >= 80) return 84;
  if (percentageCorrect >= 75) return 75;
  if (percentageCorrect >= 70) return 66;
  if (percentageCorrect >= 65) return 55;
  if (percentageCorrect >= 60) return 45;
  if (percentageCorrect >= 55) return 35;
  if (percentageCorrect >= 50) return 25;
  if (percentageCorrect >= 45) return 16;
  if (percentageCorrect >= 40) return 10;
  return 5;
}

function getIQInterpretation(percentile: number): string {
  if (percentile >= 90) return 'Superior';
  if (percentile >= 75) return 'Above Average';
  if (percentile >= 25) return 'Average';
  if (percentile >= 10) return 'Below Average';
  return 'Low';
}

export function getAssessmentVisualizationType(slug: string): 'bar' | 'radar' | 'hexagon' | 'gauge' | 'danger_meter' | 'stress_gauge' | 'scorecard' | 'battery' {
  switch (slug) {
    case 'ipip-neo-120':
      return 'bar';
    case 'schwartz-pvq-21':
      return 'radar';
    case 'short-dark-triad-sd3':
      return 'danger_meter';
    case 'icar-16':
      return 'gauge';
    case 'grit-s-8':
      return 'bar';
    case 'onet-riasec-30':
      return 'hexagon';
    case 'teique-sf-30':
      return 'bar';
    case 'pss-10':
      return 'stress_gauge';
    case 'swls-5':
      return 'scorecard';
    case 'brs-6':
      return 'battery';
    case 'flourishing-8':
      return 'scorecard';
    default:
      return 'bar';
  }
}
