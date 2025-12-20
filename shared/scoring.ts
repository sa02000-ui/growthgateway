import { questions, traitQuestions, type TraitKey } from './ipip-neo-120';
import type { TraitScores, AssessmentResponses } from './schema';

export function scoreQuestion(questionId: number, response: number): number {
  const question = questions.find(q => q.id === questionId);
  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }
  
  if (response < 1 || response > 5) {
    throw new Error(`Invalid response value: ${response}. Must be between 1 and 5.`);
  }
  
  if (question.keyed === '+') {
    return response;
  } else {
    return 6 - response;
  }
}

export function calculateTraitScore(trait: TraitKey, responses: AssessmentResponses): number {
  const questionIds = traitQuestions[trait];
  let totalScore = 0;
  let answeredCount = 0;
  
  for (const questionId of questionIds) {
    const response = responses[String(questionId)];
    if (response !== undefined) {
      totalScore += scoreQuestion(questionId, response);
      answeredCount++;
    }
  }
  
  if (answeredCount === 0) {
    return 0;
  }
  
  const averageScore = totalScore / answeredCount;
  
  const percentageScore = ((averageScore - 1) / 4) * 100;
  
  return Math.round(percentageScore * 100) / 100;
}

export function calculateAllTraitScores(responses: AssessmentResponses): TraitScores {
  return {
    N: calculateTraitScore('N', responses),
    E: calculateTraitScore('E', responses),
    O: calculateTraitScore('O', responses),
    A: calculateTraitScore('A', responses),
    C: calculateTraitScore('C', responses),
  };
}

export function validateResponses(responses: AssessmentResponses): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (let i = 1; i <= 120; i++) {
    const response = responses[String(i)];
    if (response === undefined) {
      errors.push(`Missing response for question ${i}`);
    } else if (response < 1 || response > 5) {
      errors.push(`Invalid response for question ${i}: ${response}. Must be between 1 and 5.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getTraitInterpretation(trait: TraitKey, score: number): { level: string; description: string } {
  const traitInterpretations: Record<TraitKey, { low: string; mid: string; high: string }> = {
    N: {
      low: "You tend to be emotionally stable and handle stress well.",
      mid: "You experience a typical range of emotions and stress responses.",
      high: "You may be more sensitive to stress and experience stronger emotional reactions.",
    },
    E: {
      low: "You tend to prefer solitary activities and smaller social gatherings.",
      mid: "You enjoy a balance of social activities and time alone.",
      high: "You thrive in social situations and enjoy being around others.",
    },
    O: {
      low: "You tend to prefer familiar routines and practical approaches.",
      mid: "You have a balanced approach to new experiences and ideas.",
      high: "You are curious, creative, and open to new experiences and ideas.",
    },
    A: {
      low: "You tend to be more competitive and skeptical of others' intentions.",
      mid: "You balance cooperation with healthy skepticism.",
      high: "You are naturally trusting, cooperative, and considerate of others.",
    },
    C: {
      low: "You tend to be more flexible and spontaneous in your approach to tasks.",
      mid: "You balance planning with adaptability.",
      high: "You are highly organized, dependable, and goal-oriented.",
    },
  };

  let level: string;
  if (score < 35) {
    level = 'low';
  } else if (score < 65) {
    level = 'mid';
  } else {
    level = 'high';
  }

  const levelLabel = level === 'low' ? 'Low' : level === 'mid' ? 'Average' : 'High';
  
  return {
    level: levelLabel,
    description: traitInterpretations[trait][level as keyof typeof traitInterpretations[TraitKey]],
  };
}

export function getCompletionPercentage(responses: AssessmentResponses): number {
  let answered = 0;
  for (let i = 1; i <= 120; i++) {
    if (responses[String(i)] !== undefined) {
      answered++;
    }
  }
  return Math.round((answered / 120) * 100);
}
