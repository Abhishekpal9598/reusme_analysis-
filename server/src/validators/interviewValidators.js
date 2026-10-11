import { z } from 'zod';
import mongoose from 'mongoose';

export const PRACTICE_VERDICT_DISCLAIMER =
  'This assessment is an AI-generated practice simulation for educational and preparation purposes only. Performance verdict indicators (Strong Hire, Hire, Leaning Hire, Needs Improvement) evaluate practice response quality and are not guarantees, predictions, or endorsements of actual hiring outcomes by any employer.';

export const LEGACY_DIFFICULTY_MAP = {
  Junior: 'Easy',
  Mid: 'Medium',
  Senior: 'Hard',
};

export const normalizeDifficulty = (val) => {
  if (!val) return 'Medium';
  if (LEGACY_DIFFICULTY_MAP[val]) return LEGACY_DIFFICULTY_MAP[val];
  if (['Easy', 'Medium', 'Hard'].includes(val)) return val;
  return 'Medium';
};

/**
 * Client request input schema for creating an interview session
 * Strictly separates Experience Level and Interview Difficulty
 */
export const createInterviewInputSchema = z.object({
  jobRole: z
    .string()
    .trim()
    .min(2, 'Job role must contain at least 2 characters')
    .max(100, 'Job role cannot exceed 100 characters'),
  jobTitle: z.string().trim().max(100).optional(),
  // Strictly separated Experience Level
  experienceLevel: z
    .enum(['Junior', 'Mid', 'Senior', 'Lead'], {
      errorMap: () => ({ message: 'Invalid experience level (must be Junior, Mid, Senior, or Lead)' }),
    })
    .default('Mid'),
  category: z
    .enum(['Technical', 'HR', 'Behavioral', 'Role-Based', 'General'], {
      errorMap: () => ({ message: 'Invalid category' }),
    })
    .default('Technical'),
  // Strictly separated Interview Difficulty
  difficulty: z
    .enum(['Easy', 'Medium', 'Hard'], {
      errorMap: () => ({ message: 'Invalid difficulty (must be Easy, Medium, or Hard)' }),
    })
    .default('Medium'),
  questionCount: z.coerce.number().int().min(1).max(10).default(5),
  resumeId: z
    .string()
    .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid resume ID format',
    })
    .optional()
    .nullable(),
});

/**
 * Client request input schema for evaluating a single question answer
 */
export const evaluateAnswerInputSchema = z.object({
  questionId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid question ID format',
  }),
  userAnswer: z
    .string()
    .trim()
    .min(5, 'Answer must contain at least 5 characters')
    .max(8000, 'Answer cannot exceed 8,000 characters'),
});

/**
 * Zod schema for questions returned by Gemini
 * Difficulty is strictly Easy, Medium, Hard (with backward-compatible preprocessing)
 */
export const geminiQuestionItemSchema = z.object({
  questionText: z.string().min(5, 'Question text is required'),
  category: z.string().default('Technical'),
  difficulty: z
    .preprocess((val) => normalizeDifficulty(val), z.enum(['Easy', 'Medium', 'Hard']))
    .default('Medium'),
  sampleKeyPoints: z.array(z.string()).default([]),
});

export const geminiQuestionsListSchema = z.array(geminiQuestionItemSchema).min(1);

/**
 * Zod schema for answer evaluation returned by Gemini
 */
export const geminiAnswerEvaluationSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  rubricScores: z
    .object({
      technicalAccuracy: z.coerce.number().min(0).max(100).default(70),
      completeness: z.coerce.number().min(0).max(100).default(70),
      clarity: z.coerce.number().min(0).max(100).default(70),
      problemSolving: z.coerce.number().min(0).max(100).default(70),
    })
    .default({
      technicalAccuracy: 70,
      completeness: 70,
      clarity: 70,
      problemSolving: 70,
    }),
  starAssessment: z
    .object({
      isStarApplicable: z.boolean().default(false),
      situation: z.string().default(''),
      task: z.string().default(''),
      action: z.string().default(''),
      result: z.string().default(''),
      starFeedback: z.string().default(''),
    })
    .default({
      isStarApplicable: false,
      situation: '',
      task: '',
      action: '',
      result: '',
      starFeedback: '',
    }),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  missingPoints: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  modelAnswer: z.string().default(''),
});

/**
 * Zod schema for synthesized final report insights from Gemini
 */
export const geminiFinalReportSchema = z.object({
  summary: z.string().default(''),
  strengthsSummary: z.array(z.string()).default([]),
  weaknessesSummary: z.array(z.string()).default([]),
  studyRecommendations: z.array(z.string()).default([]),
  personalizedRoadmap: z.array(z.string()).default([]),
});

/**
 * Deterministically compute overall score, rubric averages, category breakdowns,
 * and practice performance verdict from validated question evaluations.
 */
export function calculateDeterministicOverallScore(questions) {
  if (!questions || questions.length === 0) {
    return {
      overallScore: 0,
      verdict: 'Needs Improvement',
      categoryBreakdown: [],
      rubricAverages: {
        technicalAccuracy: 0,
        completeness: 0,
        clarity: 0,
        problemSolving: 0,
      },
    };
  }

  const evaluated = questions.filter(
    (q) => q.evaluation && typeof q.evaluation.score === 'number'
  );

  if (evaluated.length === 0) {
    return {
      overallScore: 0,
      verdict: 'Needs Improvement',
      categoryBreakdown: [],
      rubricAverages: {
        technicalAccuracy: 0,
        completeness: 0,
        clarity: 0,
        problemSolving: 0,
      },
    };
  }

  // Calculate overall arithmetic mean
  const totalScore = evaluated.reduce((sum, q) => sum + q.evaluation.score, 0);
  const overallScore = Math.round(totalScore / evaluated.length);

  // Rubric averages
  let techSum = 0;
  let compSum = 0;
  let clarSum = 0;
  let psSum = 0;
  evaluated.forEach((q) => {
    const rubrics = q.evaluation.rubricScores || {};
    techSum += typeof rubrics.technicalAccuracy === 'number' ? rubrics.technicalAccuracy : q.evaluation.score;
    compSum += typeof rubrics.completeness === 'number' ? rubrics.completeness : q.evaluation.score;
    clarSum += typeof rubrics.clarity === 'number' ? rubrics.clarity : q.evaluation.score;
    psSum += typeof rubrics.problemSolving === 'number' ? rubrics.problemSolving : q.evaluation.score;
  });

  const rubricAverages = {
    technicalAccuracy: Math.round(techSum / evaluated.length),
    completeness: Math.round(compSum / evaluated.length),
    clarity: Math.round(clarSum / evaluated.length),
    problemSolving: Math.round(psSum / evaluated.length),
  };

  // Category breakdown
  const categoryMap = {};
  evaluated.forEach((q) => {
    const cat = q.category || 'General';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { total: 0, count: 0 };
    }
    categoryMap[cat].total += q.evaluation.score;
    categoryMap[cat].count += 1;
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    score: Math.round(data.total / data.count),
    questionsCount: data.count,
  }));

  // Deterministic Verdict assignment
  let verdict = 'Needs Improvement';
  if (overallScore >= 85) {
    verdict = 'Strong Hire';
  } else if (overallScore >= 70) {
    verdict = 'Hire';
  } else if (overallScore >= 55) {
    verdict = 'Leaning Hire';
  } else {
    verdict = 'Needs Improvement';
  }

  return {
    overallScore,
    verdict,
    categoryBreakdown,
    rubricAverages,
  };
}
