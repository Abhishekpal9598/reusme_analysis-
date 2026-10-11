import { Router } from 'express';
import {
  getAnalysisById,
  listAllAnalyses,
} from '../controllers/analysisController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Enforce authentication on all analysis endpoints
router.use(authMiddleware);

router.get('/', listAllAnalyses);
router.get('/:id', getAnalysisById);

export default router;
