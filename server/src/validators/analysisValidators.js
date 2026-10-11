import { z } from 'zod';

/**
 * Single dimension rubric evaluation schema
 */
export const dimensionScoreSchema = z.object({
  score: z.coerce.number().int().min(0).max(100),
  explanation: z.string().min(1, 'Explanation is required'),
  evidence: z.array(z.string()).default([]),
});

/**
 * Strength or Improvement Area item schema
 */
export const strengthImprovementItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  evidence: z.array(z.string()).default([]),
});

/**
 * Bullet point rewrite item schema
 */
export const bulletRewriteSchema = z.object({
  originalBullet: z.string().min(1, 'Original bullet is required'),
  suggestedBullet: z.string().min(1, 'Suggested bullet is required'),
  rationale: z.string().min(1, 'Rationale is required'),
});

/**
 * Strict schema for raw model responses from Google Gemini
 */
export const geminiAnalysisResponseSchema = z.object({
  dimensionScores: z.object({
    impact: dimensionScoreSchema,
    brevity: dimensionScoreSchema,
    actionVerbs: dimensionScoreSchema,
    skillsCoverage: dimensionScoreSchema,
    atsReadability: dimensionScoreSchema,
  }),
  summaryFeedback: z.string().min(10, 'Summary feedback must be at least 10 characters'),
  strengths: z.array(strengthImprovementItemSchema).min(1, 'At least 1 strength required'),
  improvementAreas: z.array(strengthImprovementItemSchema).min(1, 'At least 1 improvement area required'),
  bulletRewrites: z.array(bulletRewriteSchema).min(1, 'At least 1 bullet rewrite required'),
  recommendations: z.array(z.string()).min(1, 'At least 1 recommendation required'),
  identifiedSkills: z
    .object({
      technical: z.array(z.string()).default([]),
      soft: z.array(z.string()).default([]),
      toolsAndFrameworks: z.array(z.string()).default([]),
    })
    .default({ technical: [], soft: [], toolsAndFrameworks: [] }),
});

/**
 * Deterministic Server-Side Overall Score Calculation Formula:
 *
 * overallScore = round(
 *   0.25 * impact +
 *   0.25 * skillsCoverage +
 *   0.20 * actionVerbs +
 *   0.15 * atsReadability +
 *   0.15 * brevity
 * )
 *
 * Bounds: Integer between 0 and 100 inclusive.
 *
 * @param {Object} dimensionScores - Object containing { impact, brevity, actionVerbs, skillsCoverage, atsReadability }
 * @returns {number} Deterministic overall score (0 - 100)
 */
export function calculateOverallScore(dimensionScores) {
  if (!dimensionScores) return 0;

  const impact = Number(dimensionScores.impact?.score ?? 0);
  const skillsCoverage = Number(dimensionScores.skillsCoverage?.score ?? 0);
  const actionVerbs = Number(dimensionScores.actionVerbs?.score ?? 0);
  const atsReadability = Number(dimensionScores.atsReadability?.score ?? 0);
  const brevity = Number(dimensionScores.brevity?.score ?? 0);

  const weightedSum =
    0.25 * impact +
    0.25 * skillsCoverage +
    0.20 * actionVerbs +
    0.15 * atsReadability +
    0.15 * brevity;

  const rounded = Math.round(weightedSum);
  return Math.min(100, Math.max(0, rounded));
}
