import { Router } from 'express';
import {
  createJobMatch,
  listJobMatches,
  getJobMatchById,
  deleteJobMatchById,
} from '../controllers/jobController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Enforce authentication on all job match routes
router.use(authMiddleware);

router.post('/', aiRateLimiter, createJobMatch);
router.post('/match', aiRateLimiter, createJobMatch); // Alias for /api/v1/jobs/match
router.get('/', listJobMatches);
router.get('/matches', listJobMatches); // Alias for /api/v1/jobs/matches
router.get('/:id', getJobMatchById);
router.delete('/:id', deleteJobMatchById);

export default router;
