import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 20, // 20 requests per 15 minutes in non-test
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many authentication attempts. Please try again after 15 minutes.'
    );
  },
  skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
});

export const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 30, // 30 requests per 5 minutes (supports full 10-question interview sessions)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id ? req.user._id.toString() : req.ip),
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'AI request rate limit reached. You may trigger up to 30 requests per 5 minutes. Please try again shortly.'
    );
  },
  skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
});

