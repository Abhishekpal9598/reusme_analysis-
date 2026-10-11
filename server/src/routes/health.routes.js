import { Router } from 'express';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Check API server operational status
 * @access  Public
 */
router.get('/', (req, res) => {
  return sendSuccess(res, 200, {}, 'CareerAI API is operational');
});

export default router;
