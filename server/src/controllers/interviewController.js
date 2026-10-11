import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { InterviewSession } from '../models/InterviewSession.js';
import {
  generateInterviewQuestions,
  evaluateAnswer,
  compileFinalSessionReport,
} from '../services/interviewService.js';
import {
  createInterviewInputSchema,
  evaluateAnswerInputSchema,
} from '../validators/interviewValidators.js';
import { GeminiServiceError } from '../services/geminiService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @route   POST /api/v1/interviews
 * @desc    Create a new interview session and generate questions using Gemini
 * @access  Protected
 */
export const createInterviewSession = async (req, res, next) => {
  try {
    const validation = createInterviewInputSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid interview parameters'
      );
    }

    const {
      jobRole,
      jobTitle,
      experienceLevel,
      category,
      difficulty,
      questionCount,
      resumeId,
    } = validation.data;

    const finalRole = jobRole || jobTitle;
    let resumeText = null;

    // Optional resume verification
    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        userId: req.user._id,
      });

      if (!resume) {
        return sendError(res, 404, 'RESUME_NOT_FOUND', 'The specified resume was not found.');
      }

      if (resume.rawText && resume.rawText.trim().length >= 20) {
        resumeText = resume.rawText.trim();
      }
    }

    // Call Gemini question generator
    let questions;
    try {
      questions = await generateInterviewQuestions({
        jobRole: finalRole,
        experienceLevel,
        category,
        difficulty,
        questionCount,
        resumeText,
      });
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        return sendError(res, err.statusCode, err.code, err.message);
      }
      return sendError(
        res,
        502,
        'GEMINI_UNAVAILABLE',
        'AI interview question generator is temporarily unavailable. Please try again.'
      );
    }

    // Persist new interview session
    const session = await InterviewSession.create({
      userId: req.user._id,
      resumeId: resumeId || null,
      jobRole: finalRole,
      jobTitle: finalRole,
      experienceLevel,
      category,
      difficulty,
      questionCount: questions.length,
      status: 'in_progress',
      questions: questions.map((q) => ({
        questionText: q.questionText,
        category: q.category || category,
        difficulty: q.difficulty || difficulty,
        sampleKeyPoints: q.sampleKeyPoints || [],
        userAnswer: '',
        answeredAt: null,
        evaluation: null,
      })),
    });

    return sendSuccess(res, 201, session, 'Interview session created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/interviews
 * @desc    Get all interview sessions for the logged-in user
 * @access  Protected
 */
export const listInterviewSessions = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-questions.sampleKeyPoints');

    return sendSuccess(res, 200, sessions, 'Interview sessions retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/interviews/:id
 * @desc    Get a single interview session by ID
 * @access  Protected
 */
export const getInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_SESSION_ID', 'Invalid session ID format.');
    }

    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Interview session not found.');
    }

    return sendSuccess(res, 200, session, 'Interview session retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/interviews/:id/evaluate
 * @desc    Evaluate a candidate's answer for a specific question
 * @access  Protected
 */
export const evaluateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_SESSION_ID', 'Invalid session ID format.');
    }

    const validation = evaluateAnswerInputSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid evaluation request'
      );
    }

    const { questionId, userAnswer } = validation.data;

    // Verify session ownership
    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Interview session not found.');
    }

    // Locate question
    const question = session.questions.id(questionId);
    if (!question) {
      return sendError(res, 404, 'QUESTION_NOT_FOUND', 'Question not found in this session.');
    }

    // Duplicate Request & Idempotency check:
    // If the answer is identical and already evaluated, return the cached evaluation directly
    if (
      question.userAnswer === userAnswer.trim() &&
      question.evaluation &&
      typeof question.evaluation.score === 'number'
    ) {
      return sendSuccess(
        res,
        200,
        {
          questionId,
          question,
          evaluation: question.evaluation,
          idempotent: true,
        },
        'Answer already evaluated'
      );
    }

    // Evaluate answer via Gemini
    let evaluationResult;
    try {
      evaluationResult = await evaluateAnswer({
        questionText: question.questionText,
        userAnswer: userAnswer.trim(),
        category: question.category || session.category,
        difficulty: question.difficulty || session.difficulty,
        experienceLevel: session.experienceLevel,
        jobRole: session.jobRole,
        sampleKeyPoints: question.sampleKeyPoints || [],
      });
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        return sendError(res, err.statusCode, err.code, err.message);
      }
      return sendError(
        res,
        502,
        'GEMINI_UNAVAILABLE',
        'AI answer evaluation is temporarily unavailable. Please try again.'
      );
    }

    // Save progress to MongoDB for session recovery
    question.userAnswer = userAnswer.trim();
    question.answeredAt = new Date();
    question.evaluation = evaluationResult;
    await session.save();

    return sendSuccess(
      res,
      200,
      {
        questionId,
        question,
        evaluation: evaluationResult,
      },
      'Answer evaluated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/interviews/:id/complete
 * @desc    Validate all answers and compile final performance report
 * @access  Protected
 */
export const completeInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_SESSION_ID', 'Invalid session ID format.');
    }

    const session = await InterviewSession.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Interview session not found.');
    }

    // If session is already completed with report, return idempotently
    if (session.status === 'completed' && session.overallReport?.overallScore !== undefined) {
      return sendSuccess(
        res,
        200,
        session,
        'Interview session is already completed.'
      );
    }

    // Completion Validation: Ensure all questions have been answered and evaluated
    const incompleteQuestions = [];
    session.questions.forEach((q, idx) => {
      const hasAnswer = q.userAnswer && q.userAnswer.trim().length > 0;
      const hasEval = q.evaluation && typeof q.evaluation.score === 'number';
      if (!hasAnswer || !hasEval) {
        incompleteQuestions.push({
          questionIndex: idx + 1,
          questionId: q._id.toString(),
          reason: !hasAnswer ? 'Unanswered' : 'Unevaluated',
          questionText: q.questionText,
        });
      }
    });

    if (incompleteQuestions.length > 0) {
      return sendError(
        res,
        400,
        'INCOMPLETE_INTERVIEW',
        `Cannot complete interview: ${incompleteQuestions.length} question(s) are incomplete. All questions must be answered and evaluated first.`,
        incompleteQuestions
      );
    }

    // Compile final deterministic scores and synthesized report
    let finalReport;
    try {
      finalReport = await compileFinalSessionReport(session);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        return sendError(res, err.statusCode, err.code, err.message);
      }
      return sendError(
        res,
        502,
        'GEMINI_UNAVAILABLE',
        'Failed to generate interview performance report. Please try again.'
      );
    }

    session.overallReport = finalReport;
    session.status = 'completed';
    await session.save();

    return sendSuccess(res, 200, session, 'Interview completed and performance report generated');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/interviews/:id
 * @desc    Delete an interview session
 * @access  Protected
 */
export const deleteInterviewSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_SESSION_ID', 'Invalid session ID format.');
    }

    const session = await InterviewSession.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Interview session not found.');
    }

    return sendSuccess(res, 200, { id }, 'Interview session deleted successfully');
  } catch (error) {
    next(error);
  }
};
