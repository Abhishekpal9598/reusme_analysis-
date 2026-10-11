import mongoose from 'mongoose';
import { CareerProfile } from '../models/CareerProfile.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  updatePreferencesSchema,
  toggleMilestoneSchema,
} from '../validators/careerIntelligenceValidators.js';
import {
  generateCareerIntelligence,
  generateHeuristicCareerProfile,
} from '../services/careerIntelligenceService.js';
import {
  collectUserCareerContext,
  aggregateSkillGaps,
  computeReadinessIndexFromContext,
  computeWeeklyMomentum,
} from '../services/careerIntelligenceContextService.js';

// Cooldown interval between full generation requests (30 seconds)
const GENERATION_COOLDOWN_MS = 30 * 1000;

// Allowed keys for targetPreferences update (to prevent mass assignment)
const ALLOWED_PREFERENCE_KEYS = ['desiredRole', 'targetLevel', 'preferredIndustry'];

/**
 * Helper: Check generation cooldown for user
 */
const checkGenerationCooldown = async (userId) => {
  const existing = await CareerProfile.findOne({ userId }).select('lastGeneratedAt');
  if (existing?.lastGeneratedAt) {
    const elapsed = Date.now() - new Date(existing.lastGeneratedAt).getTime();
    if (elapsed < GENERATION_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((GENERATION_COOLDOWN_MS - elapsed) / 1000);
      return { inCooldown: true, remainingSeconds };
    }
  }
  return { inCooldown: false, remainingSeconds: 0 };
};

/**
 * A. GET /api/v1/career-intelligence
 * Retrieve authenticated user's existing CareerProfile or return a cold-start profile.
 * Does NOT trigger external AI generation on GET requests.
 */
export const getCareerProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const profile = await CareerProfile.findOne({ userId });
    if (profile) {
      return sendSuccess(res, 200, profile, 'Career intelligence profile retrieved successfully');
    }

    // First-time user cold-start response (deterministic, fast, zero AI calls)
    const context = await collectUserCareerContext(userId);
    const aggregatedSkills = aggregateSkillGaps(context.resumeContext, context.jobMatchContext);
    const readiness = computeReadinessIndexFromContext(context);
    const momentum = await computeWeeklyMomentum(userId);
    const heuristic = generateHeuristicCareerProfile(context, aggregatedSkills, readiness, momentum);

    const coldStartProfile = {
      userId: userId.toString(),
      targetPreferences: context.targetPreferences,
      careerReadiness: readiness,
      skillAnalysis: {
        masteredSkills: aggregatedSkills.masteredSkills,
        criticalGaps: aggregatedSkills.criticalGaps,
        partialGaps: aggregatedSkills.partialGaps,
        totalAnalyzedJobs: aggregatedSkills.totalAnalyzedJobs,
      },
      learningRoadmap: heuristic.learningRoadmap.map((m) => ({
        ...m,
        completed: false,
        completedAt: null,
      })),
      roleRecommendations: heuristic.roleRecommendations,
      nextActions: heuristic.nextActions.map((a) => ({
        ...a,
        completed: false,
      })),
      weeklyMomentum: momentum,
      aiSynthesis: {
        executiveSummary: heuristic.executiveSummary,
        marketContext: heuristic.marketContext,
        generatedAt: null,
        modelUsed: 'deterministic-heuristic-v1',
      },
      generationSource: 'heuristic',
      lastGeneratedAt: null,
      schemaVersion: 1,
      isColdStart: true,
    };

    return sendSuccess(res, 200, coldStartProfile, 'Cold-start career intelligence profile initialized');
  } catch (error) {
    next(error);
  }
};

/**
 * Internal shared execution helper for generation / regeneration
 */
const executeProfileGeneration = async (req, res, next, isRegeneration = false) => {
  try {
    const userId = req.user._id;

    // Check 30-second cooldown
    const cooldownCheck = await checkGenerationCooldown(userId);
    if (cooldownCheck.inCooldown) {
      return sendError(
        res,
        429,
        'COOLDOWN_ACTIVE',
        `Career intelligence was generated recently. Please wait ${cooldownCheck.remainingSeconds} second${cooldownCheck.remainingSeconds > 1 ? 's' : ''} before requesting generation again.`,
        { remainingSeconds: cooldownCheck.remainingSeconds }
      );
    }

    // Execute synthesis service (AI with fallback & atomic upsert)
    const profile = await generateCareerIntelligence(userId, { persist: true });

    const statusMessage = isRegeneration
      ? `Career intelligence profile regenerated successfully via ${profile.generationSource === 'ai' ? 'AI synthesis' : 'heuristic engine'}`
      : `Career intelligence profile generated successfully via ${profile.generationSource === 'ai' ? 'AI synthesis' : 'heuristic engine'}`;

    return sendSuccess(res, isRegeneration ? 200 : 201, profile, statusMessage);
  } catch (error) {
    next(error);
  }
};

/**
 * B. POST /api/v1/career-intelligence/generate
 * Trigger full career intelligence generation for authenticated user.
 */
export const generateCareerProfile = async (req, res, next) => {
  return executeProfileGeneration(req, res, next, false);
};

/**
 * E. POST /api/v1/career-intelligence/regenerate
 * Trigger explicit profile regeneration (subject to 30s cooldown).
 */
export const regenerateCareerProfile = async (req, res, next) => {
  return executeProfileGeneration(req, res, next, true);
};

/**
 * C. PATCH /api/v1/career-intelligence/preferences
 * Update target career preferences (scoped to user, rejecting arbitrary fields).
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Check for mass-assignment of unknown fields
    const payloadKeys = Object.keys(req.body || {});
    const unknownKeys = payloadKeys.filter((k) => !ALLOWED_PREFERENCE_KEYS.includes(k));
    if (unknownKeys.length > 0) {
      return sendError(
        res,
        400,
        'UNKNOWN_FIELDS_REJECTED',
        `Unrecognized preference fields: ${unknownKeys.join(', ')}. Only desiredRole, targetLevel, and preferredIndustry are allowed.`
      );
    }

    const validation = updatePreferencesSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid career preferences provided'
      );
    }

    // Find or initialize profile and update preferences safely
    const profile = await CareerProfile.findOneAndUpdate(
      { userId },
      { $set: { targetPreferences: validation.data } },
      { upsert: true, new: true, runValidators: true }
    );

    return sendSuccess(res, 200, profile.targetPreferences, 'Career preferences updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * D. PATCH /api/v1/career-intelligence/milestones/:milestoneId
 * Toggle milestone completion status inside authenticated user's profile.
 */
export const toggleMilestone = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { milestoneId } = req.params;

    const validation = toggleMilestoneSchema.safeParse({ milestoneId });
    if (!validation.success) {
      return sendError(res, 400, 'INVALID_MILESTONE_ID', 'Invalid milestone ID format.');
    }

    const profile = await CareerProfile.findOne({ userId });
    if (!profile) {
      return sendError(res, 404, 'PROFILE_NOT_FOUND', 'Career profile not found.');
    }

    const milestone = profile.learningRoadmap.id(milestoneId);
    if (!milestone) {
      return sendError(
        res,
        404,
        'MILESTONE_NOT_FOUND',
        'Milestone not found in your career roadmap.'
      );
    }

    // Toggle completion status and timestamp
    milestone.completed = !milestone.completed;
    milestone.completedAt = milestone.completed ? new Date() : null;

    await profile.save();

    return sendSuccess(
      res,
      200,
      milestone,
      `Milestone marked ${milestone.completed ? 'completed' : 'incomplete'}`
    );
  } catch (error) {
    next(error);
  }
};
