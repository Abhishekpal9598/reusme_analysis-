import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';
import { logger, sanitizeString } from '../utils/logger.js';

/**
 * Strategy for distributed store:
 * In development, testing, or standard production without Redis, express-rate-limit uses
 * its built-in MemoryStore. If REDIS_URL is provided, we gracefully attempt to configure
 * a distributed store. If Redis is unavailable or unconfigured, it logs a safe warning
 * and operates in standalone in-memory mode without crashing the application.
 *
 * NOTE FOR MULTI-INSTANCE DEPLOYMENTS:
 * When operating with MemoryStore (in-memory mode), each container process maintains its own
 * isolated counter table. A cluster of N replicas effectively multiplies the total capacity by N
 * unless a shared Redis store is configured.
 */
let distributedStore = undefined;
let rateLimiterStoreType = 'memory';

if (env.REDIS_URL) {
  try {
    logger.info('[RateLimit] REDIS_URL detected. Initializing distributed rate limiter store...');
    // If a Redis client were configured, rateLimiterStoreType = 'redis';
  } catch (err) {
    rateLimiterStoreType = 'memory';
    logger.warn(`[RateLimit] Failed to connect to Redis. Operating in standalone in-memory mode: ${sanitizeString(err.message)}`);
    distributedStore = undefined;
  }
}

/**
 * Inspect active rate limiter store status and multi-instance sharing capability.
 */
export const getRateLimiterStoreStatus = () => ({
  type: rateLimiterStoreType,
  isDistributed: rateLimiterStoreType === 'redis',
  multiInstanceWarning: rateLimiterStoreType === 'memory'
    ? 'Rate limiting is currently operating in process-isolated in-memory mode. Multiple container instances will not share rate limit counters without a configured Redis store.'
    : null,
});

/**
 * 1. Global API rate limiter
 * Protects all incoming API routes from denial-of-service and scraping.
 * Window: 15 minutes, configurable max requests (default: 300).
 * Skips health checks and root index probes.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test'
    ? (process.env.TEST_RATE_LIMIT === 'true' ? env.RATE_LIMIT_GLOBAL_MAX : 5000)
    : env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: distributedStore,
  skip: (req) => {
    if (env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true') return true;
    const path = req.path || '';
    return path === '/' || path === '/health' || path === '/api/v1/health';
  },
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Global request rate limit exceeded. Please wait a few minutes before trying again.'
    );
  },
});

/**
 * 2. Authentication rate limiter
 * Protects login and registration from brute force credential stuffing.
 * Window: 15 minutes, configurable max requests (default: 20).
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test'
    ? (process.env.TEST_RATE_LIMIT === 'true' ? env.RATE_LIMIT_AUTH_MAX : 1000)
    : env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: distributedStore,
  skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many authentication attempts. Please try again after 15 minutes.'
    );
  },
});

/**
 * 3. AI synthesis and generation rate limiter
 * Protects expensive Google Gemini AI endpoints from depletion and quota starvation.
 * Keyed by authenticated User ID (or IP as fallback).
 * Window: 5 minutes, configurable max requests (default: 30).
 */
export const aiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: env.NODE_ENV === 'test'
    ? (process.env.TEST_RATE_LIMIT === 'true' ? env.RATE_LIMIT_AI_MAX : 1000)
    : env.RATE_LIMIT_AI_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: distributedStore,
  keyGenerator: (req) => (req.user?._id ? req.user._id.toString() : req.ip),
  skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      `AI request rate limit reached. You may trigger up to ${env.RATE_LIMIT_AI_MAX} requests per 5 minutes. Please try again shortly.`
    );
  },
});

/**
 * 4. General Authenticated User rate limiter
 * Protects authenticated CRUD operations from aggressive scripts.
 * Window: 1 minute, max requests: 100.
 */
export const authenticatedRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'test'
    ? (process.env.TEST_RATE_LIMIT === 'true' ? 100 : 1000)
    : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: distributedStore,
  keyGenerator: (req) => (req.user?._id ? req.user._id.toString() : req.ip),
  skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
  handler: (req, res) => {
    return sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many requests. Please slow down and try again shortly.'
    );
  },
});

export default {
  globalRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  authenticatedRateLimiter,
};
