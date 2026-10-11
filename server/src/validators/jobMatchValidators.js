import { z } from 'zod';
import mongoose from 'mongoose';

/**
 * Client request input schema for creating a Job Description match analysis
 */
export const createJobMatchInputSchema = z.object({
  resumeId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid resume ID format',
  }),
  jobTitle: z.string().trim().max(150, 'Job title cannot exceed 150 characters').optional().default(''),
  companyName: z.string().trim().max(150, 'Company name cannot exceed 150 characters').optional().default(''),
  company: z.string().trim().max(150, 'Company name cannot exceed 150 characters').optional(),
  jobDescription: z
    .string()
    .trim()
    .min(20, 'Job description must contain at least 20 characters')
    .max(20000, 'Job description cannot exceed 20,000 characters'),
});

/**
 * Skill evaluation items
 */
export const matchedSkillSchema = z.object({
  skill: z.string().min(1, 'Skill name is required'),
  category: z.string().default('Technical'),
  evidenceFromResume: z.string().default(''),
  importance: z.string().default('required'),
});

export const missingSkillSchema = z.object({
  skill: z.string().min(1, 'Skill name is required'),
  rationale: z.string().default(''),
  criticality: z.string().default('critical'),
});

export const partialSkillSchema = z.object({
  skill: z.string().min(1, 'Skill name is required'),
  resumeContext: z.string().default(''),
  jobRequirement: z.string().default(''),
  gapExplanation: z.string().default(''),
  matchStatus: z.string().default('Partial Match'),
  importance: z.string().default('Medium'),
});

export const skillGapItemSchema = z.object({
  skill: z.string().min(1, 'Skill name is required'),
  resumeEvidence: z.string().default(''),
  jobRequirement: z.string().default(''),
  matchStatus: z.string().default('Missing'),
  importance: z.string().default('High'),
});

/**
 * Dimension score item
 */
export const jobDimensionScoreSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  explanation: z.string().default(''),
});

/**
 * Full Zod Schema for raw Gemini AI model responses
 */
export const geminiJobMatchResponseSchema = z.object({
  dimensionScores: z.object({
    skillsAlignment: jobDimensionScoreSchema,
    experienceAlignment: jobDimensionScoreSchema,
    educationAlignment: jobDimensionScoreSchema,
    responsibilityAlignment: jobDimensionScoreSchema,
  }),
  skills: z.object({
    matchedSkills: z.array(matchedSkillSchema).default([]),
    missingOrUnverifiedSkills: z.array(missingSkillSchema).default([]),
    partiallyMatchedSkills: z.array(partialSkillSchema).default([]),
    skillGaps: z.array(skillGapItemSchema).default([]),
  }),
  experience: z.object({
    relevantExperience: z.array(z.string()).default([]),
    experienceGaps: z.array(z.string()).default([]),
    evidenceFromResume: z.array(z.string()).default([]),
  }),
  educationAndCertifications: z.object({
    relevantMatches: z.array(z.string()).default([]),
    unmetOrUnverifiedRequirements: z.array(z.string()).default([]),
  }),
  recommendations: z.object({
    priorityImprovements: z.array(z.string()).default([]),
    resumeTailoringSuggestions: z.array(z.string()).default([]),
    relevantKeywordsToConsider: z.array(z.string()).default([]),
    suggestedProjects: z.array(z.string()).default([]),
  }),
  summaryAssessment: z.string().min(10, 'Summary assessment must be at least 10 characters'),
});


/**
 * Deterministic Server-Side Overall Match Score Formula:
 *
 * overallMatchScore = round(
 *   0.40 * skillsAlignment +
 *   0.30 * experienceAlignment +
 *   0.15 * educationAlignment +
 *   0.15 * responsibilityAlignment
 * )
 *
 * Bounds: Integer between 0 and 100 inclusive.
 *
 * @param {Object} dimensionScores - Object with { skillsAlignment, experienceAlignment, educationAlignment, responsibilityAlignment }
 * @returns {number} Deterministic composite score (0 - 100)
 */
export function calculateOverallMatchScore(dimensionScores) {
  if (!dimensionScores) return 0;

  const skillsAlignment = Number(dimensionScores.skillsAlignment?.score ?? 0);
  const experienceAlignment = Number(dimensionScores.experienceAlignment?.score ?? 0);
  const educationAlignment = Number(dimensionScores.educationAlignment?.score ?? 0);
  const responsibilityAlignment = Number(dimensionScores.responsibilityAlignment?.score ?? 0);

  const weightedSum =
    0.40 * skillsAlignment +
    0.30 * experienceAlignment +
    0.15 * educationAlignment +
    0.15 * responsibilityAlignment;

  const rounded = Math.round(weightedSum);
  return Math.min(100, Math.max(0, rounded));
}

export const MATCH_DISCLAIMER =
  'Match score indicates semantic keyword and experience alignment. It does not represent guaranteed interview or hiring probability.';
