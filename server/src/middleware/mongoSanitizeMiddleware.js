import { sendError } from '../utils/apiResponse.js';

/**
 * Recursively scans an object, array, or primitive for keys starting with '$'
 * or containing '.' which indicate MongoDB operator or path injection attempts.
 *
 * @param {unknown} value
 * @returns {boolean} true if prohibited key is found
 */
export const containsMongoInjectionKey = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsMongoInjectionKey(item));
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (containsMongoInjectionKey(value[key])) {
      return true;
    }
  }

  return false;
};

/**
 * Recursively sanitizes an object by removing any keys that start with '$' or contain '.'
 *
 * @param {unknown} value
 * @returns {unknown} sanitized value
 */
export const sanitizeMongoInput = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMongoInput(item));
  }

  const clean = {};
  for (const [key, val] of Object.entries(value)) {
    if (!key.startsWith('$') && !key.includes('.')) {
      clean[key] = sanitizeMongoInput(val);
    }
  }
  return clean;
};

/**
 * Express middleware to prevent MongoDB operator injection.
 * Rejects requests with HTTP 400 if any key in req.body, req.query, or req.params
 * starts with '$' or contains '.', effectively preventing NoSQL injection attacks.
 */
export const mongoSanitizeMiddleware = (req, res, next) => {
  if (
    containsMongoInjectionKey(req.body) ||
    containsMongoInjectionKey(req.query) ||
    containsMongoInjectionKey(req.params)
  ) {
    return sendError(
      res,
      400,
      'PROHIBITED_QUERY_OPERATOR',
      'Request contains prohibited query operators or path characters ($ or .).'
    );
  }

  next();
};

export default mongoSanitizeMiddleware;
