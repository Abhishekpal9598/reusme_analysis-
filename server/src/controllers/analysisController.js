import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import {
  auditResumeWithGemini,
  GeminiServiceError,
} from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @route   POST /api/v1/resumes/:id/analyze
 * @desc    Trigger AI resume quality audit via Google Gemini
 * @access  Protected
 */
export const analyzeResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    // 2. IDOR Protection: Query resume scoped to authenticated user
    const resume = await Resume.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!resume) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    // 3. Validate extracted resume text
    if (!resume.rawText || resume.rawText.trim().length < 20) {
      return sendError(
        res,
        422,
        'UNPARSEABLE_RESUME',
        'This resume contains insufficient text to perform an AI quality audit. Please upload a document with readable text.'
      );
    }

    // 4. Request structured audit from Gemini Service
    let auditResult;
    try {
      auditResult = await auditResumeWithGemini(resume.rawText);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        return sendError(res, err.statusCode, err.code, err.message);
      }
      return sendError(
        res,
        502,
        'GEMINI_UNAVAILABLE',
        'AI evaluation service is temporarily unavailable. Please try again.'
      );
    }

    // 5. Build categoryScores and bulletImprovements for backward compatibility
    const categoryScores = {
      impactAndMetrics: auditResult.dimensionScores.impact.score,
      brevityAndFormatting: auditResult.dimensionScores.brevity.score,
      actionVerbsAndStyle: auditResult.dimensionScores.actionVerbs.score,
      skillsCoverage: auditResult.dimensionScores.skillsCoverage.score,
      atsReadability: auditResult.dimensionScores.atsReadability.score,
    };

    const bulletImprovements = auditResult.bulletRewrites.map((br) => ({
      originalBullet: br.originalBullet,
      issueCritique: br.rationale,
      recommendedRewrite: br.suggestedBullet,
      impactExplanation: br.rationale,
    }));

    const weaknesses = auditResult.improvementAreas.map((ia) =>
      typeof ia === 'string' ? ia : `${ia.title}: ${ia.description}`
    );

    // 6. Persist ResumeAnalysis in MongoDB
    const analysis = await ResumeAnalysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      overallScore: auditResult.overallScore,
      dimensionScores: auditResult.dimensionScores,
      categoryScores,
      summaryFeedback: auditResult.summaryFeedback,
      strengths: auditResult.strengths,
      improvementAreas: auditResult.improvementAreas,
      weaknesses,
      bulletRewrites: auditResult.bulletRewrites,
      bulletImprovements,
      recommendations: auditResult.recommendations,
      identifiedSkills: auditResult.identifiedSkills,
      providerMetadata: auditResult.providerMetadata,
    });

    return sendSuccess(
      res,
      201,
      { analysis: analysis.toJSON() },
      'Resume quality audit completed successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/resumes/:id/analyses
 * @desc    List all audit reports for a specific resume
 * @access  Protected
 */
export const getResumeAnalyses = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    // IDOR check: Verify resume belongs to user
    const resume = await Resume.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!resume) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    const analyses = await ResumeAnalysis.find({
      resumeId: id,
      userId: req.user._id,
    }).sort({ createdAt: -1 });

    return sendSuccess(res, 200, {
      analyses: analyses.map((a) => a.toJSON()),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/analyses/:id
 * @desc    Get single detailed analysis report
 * @access  Protected
 */
export const getAnalysisById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'ANALYSIS_NOT_FOUND', 'The requested analysis was not found.');
    }

    // IDOR Protection: Query analysis scoped to authenticated user
    const analysis = await ResumeAnalysis.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!analysis) {
      return sendError(res, 404, 'ANALYSIS_NOT_FOUND', 'The requested analysis was not found.');
    }

    return sendSuccess(res, 200, {
      analysis: analysis.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/analyses
 * @desc    List authenticated user's recent analyses across all resumes
 * @access  Protected
 */
export const listAllAnalyses = async (req, res, next) => {
  try {
    const analyses = await ResumeAnalysis.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return sendSuccess(res, 200, {
      analyses: analyses.map((a) => a.toJSON()),
    });
  } catch (error) {
    next(error);
  }
};
