import { z } from 'zod';
import {
  TARGET_LEVELS,
  MILESTONE_CATEGORIES,
  MILESTONE_PRIORITIES,
  ROLE_CATEGORIES,
  PROFICIENCY_STATUSES,
  ACTION_TYPES,
} from '../models/CareerProfile.js';

// Base dimension weights for Career Readiness Index (CRI)
export const CRI_BASE_WEIGHTS = {
  resumeQuality: 0.25,
  jobFitAlignment: 0.30,
  interviewMastery: 0.25,
  applicationPipeline: 0.20,
};

export const CRI_DIMENSIONS = [
  'resumeQuality',
  'jobFitAlignment',
  'interviewMastery',
  'applicationPipeline',
];

/**
 * 1. Zod Schema: Update Preferences
 */
export const updatePreferencesSchema = z.object({
  desiredRole: z
    .string()
    .trim()
    .max(150, 'Desired role cannot exceed 150 characters')
    .optional()
    .or(z.literal('')),
  targetLevel: z
    .enum(TARGET_LEVELS, {
      invalid_type_error: 'Invalid target level',
    })
    .default('Mid'),
  preferredIndustry: z
    .string()
    .trim()
    .max(100, 'Preferred industry cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
});

/**
 * 2. Zod Schema: Toggle Milestone
 */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const toggleMilestoneSchema = z.object({
  milestoneId: z
    .string({ required_error: 'Milestone ID is required' })
    .regex(objectIdRegex, 'Invalid milestone ID format'),
});

/**
 * 3. Zod Subdocument Schemas for AI Output Validation
 */
export const skillGapItemZodSchema = z.object({
  skillName: z
    .string({ required_error: 'Skill name is required' })
    .trim()
    .min(1, 'Skill name cannot be empty')
    .max(80, 'Skill name cannot exceed 80 characters'),
  demandFrequency: z
    .number()
    .int()
    .min(1, 'Demand frequency must be at least 1')
    .max(1000, 'Demand frequency cannot exceed 1000')
    .default(1),
  proficiencyStatus: z.enum(PROFICIENCY_STATUSES, {
    required_error: 'Proficiency status is required',
    invalid_type_error: 'Invalid proficiency status',
  }),
  priority: z.enum(MILESTONE_PRIORITIES).default('High'),
  sourceAttribution: z.enum([
    'resume_identified',
    'job_requirement',
    'interview_deficit',
    'ai_inferred',
  ], {
    errorMap: () => ({ message: 'Invalid skill source attribution' }),
  }),
});

export const roadmapMilestoneZodSchema = z.object({
  title: z
    .string({ required_error: 'Milestone title is required' })
    .trim()
    .min(1, 'Milestone title cannot be empty')
    .max(150, 'Milestone title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Milestone description cannot exceed 1,000 characters')
    .default(''),
  category: z.enum(MILESTONE_CATEGORIES).default('Technical Skill'),
  priority: z.enum(MILESTONE_PRIORITIES).default('High'),
  estimatedHours: z
    .number()
    .min(1, 'Estimated hours must be at least 1')
    .max(200, 'Estimated hours cannot exceed 200')
    .default(10),
  sourceAttribution: z.enum(['user_gap', 'market_demand', 'ai_synthesized'], {
    errorMap: () => ({ message: 'Invalid milestone source attribution' }),
  }),
});

export const roleRecommendationZodSchema = z.object({
  roleTitle: z
    .string({ required_error: 'Role title is required' })
    .trim()
    .min(1, 'Role title cannot be empty')
    .max(150, 'Role title cannot exceed 150 characters'),
  category: z.enum(ROLE_CATEGORIES).default('Target Role'),
  alignmentScore: z
    .number({ required_error: 'Alignment score is required' })
    .min(0, 'Alignment score cannot be less than 0')
    .max(100, 'Alignment score cannot exceed 100'),
  matchedSkills: z
    .array(z.string().trim().max(60))
    .max(25, 'Matched skills array cannot exceed 25 items')
    .default([]),
  missingSkills: z
    .array(z.string().trim().max(60))
    .max(25, 'Missing skills array cannot exceed 25 items')
    .default([]),
  rationale: z
    .string()
    .trim()
    .max(1000, 'Rationale cannot exceed 1,000 characters')
    .default(''),
  sourceAttribution: z.enum(['skill_overlap', 'market_trend', 'ai_synthesized'], {
    errorMap: () => ({ message: 'Invalid role source attribution' }),
  }),
});

export const nextActionZodSchema = z.object({
  title: z
    .string({ required_error: 'Action title is required' })
    .trim()
    .min(1, 'Action title cannot be empty')
    .max(150, 'Action title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Action description cannot exceed 500 characters')
    .default(''),
  priority: z.enum(MILESTONE_PRIORITIES).default('High'),
  actionType: z.enum(ACTION_TYPES).default('SKILL_STUDY'),
  deepLink: z
    .string()
    .trim()
    .max(200, 'Deep link cannot exceed 200 characters')
    .default('/dashboard'),
});

/**
 * 4. Zod Schema: Full Gemini AI Structured Output
 */
export const geminiCareerSynthesisSchema = z.object({
  executiveSummary: z
    .string({ required_error: 'Executive summary is required' })
    .trim()
    .min(10, 'Executive summary must be at least 10 characters')
    .max(3000, 'Executive summary cannot exceed 3,000 characters'),
  marketContext: z
    .string()
    .trim()
    .max(2000, 'Market context cannot exceed 2,000 characters')
    .optional()
    .default(''),
  skillGaps: z
    .array(skillGapItemZodSchema)
    .min(1, 'Must include at least 1 skill gap')
    .max(30, 'Cannot exceed 30 skill gaps'),
  learningRoadmap: z
    .array(roadmapMilestoneZodSchema)
    .min(1, 'Must include at least 1 learning milestone')
    .max(15, 'Cannot exceed 15 learning milestones'),
  roleRecommendations: z
    .array(roleRecommendationZodSchema)
    .min(1, 'Must include at least 1 role recommendation')
    .max(10, 'Cannot exceed 10 role recommendations'),
  nextActions: z
    .array(nextActionZodSchema)
    .min(1, 'Must include at least 1 next action')
    .max(10, 'Cannot exceed 10 next actions'),
});

/**
 * 5. Pure Deterministic Career Readiness Index (CRI) Calculator
 *
 * Requirements:
 * - Only available dimensions participate (valid numeric scores between 0 and 100).
 * - Rejects any explicitly provided score outside 0–100 with an Error.
 * - Missing/null dimensions are excluded from denominator.
 * - Remaining weights are proportionally redistributed.
 * - If no meaningful data exists, overallScore is null, availableDimensions is empty.
 * - Identical inputs strictly produce identical mathematical score outputs.
 */
export function calculateCareerReadinessIndex(context = {}, options = {}) {
  const dimensionBreakdown = {
    resumeQuality: null,
    jobFitAlignment: null,
    interviewMastery: null,
    applicationPipeline: null,
  };

  const availableDimensions = [];
  let availableWeightSum = 0;

  for (const dim of CRI_DIMENSIONS) {
    const rawVal = context[dim];

    // Check for explicit invalid scores outside 0–100
    if (rawVal !== undefined && rawVal !== null) {
      if (typeof rawVal !== 'number' || Number.isNaN(rawVal)) {
        throw new Error(`Score for dimension '${dim}' must be a valid number`);
      }
      if (rawVal < 0 || rawVal > 100) {
        throw new Error(
          `Score for dimension '${dim}' must be between 0 and 100, received: ${rawVal}`
        );
      }
      dimensionBreakdown[dim] = rawVal;
      availableDimensions.push(dim);
      availableWeightSum += CRI_BASE_WEIGHTS[dim];
    }
  }

  // If no dimensions are available, return null without fabricating a score
  if (availableDimensions.length === 0) {
    return {
      overallScore: null,
      availableDimensions: [],
      weightsUsed: {},
      dimensionBreakdown,
      calculatedAt: options.calculatedAt || new Date(),
    };
  }

  // Proportional weight redistribution
  const weightsUsed = {};
  let weightedScoreSum = 0;

  for (const dim of availableDimensions) {
    const rawScore = dimensionBreakdown[dim];
    const baseWeight = CRI_BASE_WEIGHTS[dim];
    const normalizedWeight = baseWeight / availableWeightSum;

    // Record normalized weight rounded to 4 decimals for transparent reporting
    weightsUsed[dim] = Number(normalizedWeight.toFixed(4));
    weightedScoreSum += rawScore * normalizedWeight;
  }

  // Consistent mathematical rounding (clamped 0 to 100)
  const overallScore = Math.min(100, Math.max(0, Math.round(weightedScoreSum)));

  return {
    overallScore,
    availableDimensions,
    weightsUsed,
    dimensionBreakdown,
    calculatedAt: options.calculatedAt || new Date(),
  };
}
