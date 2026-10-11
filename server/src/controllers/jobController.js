import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import {
  matchResumeWithJob,
} from '../services/jobMatchService.js';
import {
  createJobMatchInputSchema,
  MATCH_DISCLAIMER,
} from '../validators/jobMatchValidators.js';
import { GeminiServiceError } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @route   POST /api/v1/job-matches
 * @desc    Analyze match between a resume and job description
 * @access  Protected
 */
export const createJobMatch = async (req, res, next) => {
  try {
    // 1. Validate request body with Zod
    const validation = createJobMatchInputSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid job match request parameters'
      );
    }

    const { resumeId, jobTitle, companyName, company, jobDescription } = validation.data;
    const finalCompany = companyName || company || '';

    // 2. IDOR Protection: verify resume ownership
    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id,
    });

    if (!resume) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The specified resume was not found.');
    }

    // 3. Verify resume has readable text
    if (!resume.rawText || resume.rawText.trim().length < 20) {
      return sendError(
        res,
        422,
        'UNPARSEABLE_RESUME',
        'The selected resume contains insufficient text to perform job description matching.'
      );
    }

    // 4. Run Job Matching Service via Gemini
    let matchResult;
    try {
      matchResult = await matchResumeWithJob(resume.rawText, jobDescription, {
        jobTitle,
        companyName: finalCompany,
      });
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        return sendError(res, err.statusCode, err.code, err.message);
      }
      return sendError(
        res,
        502,
        'GEMINI_UNAVAILABLE',
        'AI job matching service is temporarily unavailable. Please try again.'
      );
    }

    // 5. Build backward compatible string arrays for legacy schema consumers
    const flatMatched = matchResult.skills.matchedSkills.map((s) => s.skill);
    const flatMissing = matchResult.skills.missingOrUnverifiedSkills.map((s) => s.skill);
    const flatTailoring = [
      ...matchResult.recommendations.priorityImprovements,
      ...matchResult.recommendations.resumeTailoringSuggestions,
    ];

    // 6. Persist to MongoDB
    const jobAnalysis = await JobAnalysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      jobTitle: jobTitle || 'Target Position',
      companyName: finalCompany,
      company: finalCompany,
      jobDescription: jobDescription.slice(0, 10000), // Safe storage bound
      matchScore: matchResult.overallMatchScore,
      overallMatchScore: matchResult.overallMatchScore,
      dimensionScores: matchResult.dimensionScores,
      skillsAnalysis: matchResult.skills,
      experienceAnalysis: matchResult.experience,
      educationAnalysis: matchResult.educationAndCertifications,
      recommendations: matchResult.recommendations,
      summaryAssessment: matchResult.summaryAssessment,
      matchedSkills: flatMatched,
      missingSkills: flatMissing,
      tailoringRecommendations: flatTailoring,
      disclaimer: MATCH_DISCLAIMER,
      providerMetadata: matchResult.providerMetadata,
    });

    return res.status(201).json({
      success: true,
      disclaimer: MATCH_DISCLAIMER,
      data: {
        jobAnalysis: jobAnalysis.toJSON(),
        disclaimer: MATCH_DISCLAIMER,
      },
      message: 'Job description match analysis completed successfully.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/job-matches
 * @desc    List authenticated user's job match history
 * @access  Protected
 */
export const listJobMatches = async (req, res, next) => {
  try {
    const matches = await JobAnalysis.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return sendSuccess(res, 200, {
      jobMatches: matches.map((m) => m.toJSON()),
      analyses: matches.map((m) => m.toJSON()), // Alias for compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/job-matches/:id
 * @desc    Get single job match report by ID
 * @access  Protected
 */
export const getJobMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'JOB_MATCH_NOT_FOUND', 'The requested job match report was not found.');
    }

    const jobMatch = await JobAnalysis.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!jobMatch) {
      return sendError(res, 404, 'JOB_MATCH_NOT_FOUND', 'The requested job match report was not found.');
    }

    return sendSuccess(res, 200, {
      jobAnalysis: jobMatch.toJSON(),
      jobMatch: jobMatch.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/job-matches/:id
 * @desc    Delete job match report by ID
 * @access  Protected
 */
export const deleteJobMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'JOB_MATCH_NOT_FOUND', 'The requested job match report was not found.');
    }

    const deleted = await JobAnalysis.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deleted) {
      return sendError(res, 404, 'JOB_MATCH_NOT_FOUND', 'The requested job match report was not found.');
    }

    return sendSuccess(res, 200, { message: 'Job match report deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
