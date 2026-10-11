import { Router } from 'express';
import {
  getCareerProfile,
  generateCareerProfile,
  regenerateCareerProfile,
  updatePreferences,
  toggleMilestone,
} from '../controllers/careerIntelligenceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Enforce authentication across all career intelligence routes
router.use(authMiddleware);

// Profile inspection & retrieval
router.get('/', getCareerProfile);

// AI & Heuristic Generation (protected by aiRateLimiter)
router.post('/generate', aiRateLimiter, generateCareerProfile);
router.post('/regenerate', aiRateLimiter, regenerateCareerProfile);

// Target Career Preferences
router.patch('/preferences', updatePreferences);

// Roadmap Milestone Progress
router.patch('/milestones/:milestoneId', toggleMilestone);

export default router;
