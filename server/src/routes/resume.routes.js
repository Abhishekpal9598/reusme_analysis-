import { Router } from 'express';
import {
  uploadResume,
  listResumes,
  getResumeById,
  deleteResume,
} from '../controllers/resumeController.js';
import {
  analyzeResume,
  getResumeAnalyses,
} from '../controllers/analysisController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { handleResumeUpload } from '../middleware/uploadMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

// Enforce authentication on all resume endpoints
router.use(authMiddleware);

router.post('/', handleResumeUpload, uploadResume);
router.get('/', listResumes);
router.get('/:id', getResumeById);
router.delete('/:id', deleteResume);

// Resume Analysis routes
router.post('/:id/analyze', aiRateLimiter, analyzeResume);
router.get('/:id/analyses', getResumeAnalyses);

export default router;
