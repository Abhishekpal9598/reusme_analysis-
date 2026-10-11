import { Router } from 'express';
import {
  createInterviewSession,
  listInterviewSessions,
  getInterviewSession,
  evaluateQuestion,
  completeInterviewSession,
  deleteInterviewSession,
} from '../controllers/interviewController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Enforce authentication on all interview routes
router.use(authMiddleware);

// Create session & generate questions with AI rate limiter
router.post('/', aiRateLimiter, createInterviewSession);

// List all user interview sessions
router.get('/', listInterviewSessions);

// Get single session
router.get('/:id', getInterviewSession);

// Evaluate individual question answer with AI rate limiter
router.post('/:id/evaluate', aiRateLimiter, evaluateQuestion);

// Complete interview session and generate final performance report
router.post('/:id/complete', completeInterviewSession);

// Delete session with IDOR protection
router.delete('/:id', deleteInterviewSession);

export default router;
