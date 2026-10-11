import crypto from 'crypto';
import { env } from '../config/env.js';

// Sensitive keys whose values must be redacted from logs
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwordhash/i,
  /token/i,
  /jwt/i,
  /secret/i,
  /auth/i,
  /cookie/i,
  /apikey/i,
  /api_key/i,
  /key/i,
  /mongodb_uri/i,
  /gemini_api_key/i,
  /redis_url/i,
  /rawtext/i,
  /buffer/i,
  /resume.*text/i,
  /document/i,
  /useranswer/i,
  /answer/i,
];

// Regex patterns to scrub sensitive data from string messages
const MONGO_URI_REGEX = /mongodb(\+srv)?:\/\/[^\s"'`]+/gi;
const REDIS_URI_REGEX = /rediss?:\/\/[^\s"'`]+/gi;
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9\-_.]+/gi;
const JWT_REGEX = /\b(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)\b/g;
const GEMINI_API_KEY_REGEX = /\bAIza[0-9A-Za-z\-_]{35}\b/g;
const FILE_PATH_REGEX = /(?:[a-zA-Z]:[\\\/]|\/(?:Users|home|var|tmp|etc|app|workspace))[^\s:;"'<>|]+/gi;

// Safe correlation ID allowlist: alphanumeric, hyphen, underscore up to 64 chars
const CORRELATION_ID_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;

/**
 * Validates incoming correlation ID to prevent CRLF log injection and header tampering.
 *
 * @param {unknown} id
 * @returns {string|null} valid correlation ID or null if invalid
 */
export const validateCorrelationId = (id) => {
  if (typeof id !== 'string') return null;
  // Disallow CRLF or control characters anywhere in the ID
  if (/[\r\n\x00-\x1f\x7f]/.test(id)) return null;
  // Disallow leading or trailing whitespace
  if (id.trim() !== id) return null;
  // Strictly enforce safe character set and length (1-64 characters)
  if (CORRELATION_ID_REGEX.test(id)) {
    return id;
  }
  return null;
};

/**
 * Scrubs known sensitive patterns (Mongo URIs, Redis URIs, JWTs, API keys, absolute paths) from a string.
 *
 * @param {string} str
 * @returns {string} sanitized string
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(MONGO_URI_REGEX, '[REDACTED_MONGO_URI]')
    .replace(REDIS_URI_REGEX, '[REDACTED_REDIS_URI]')
    .replace(BEARER_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(JWT_REGEX, '[REDACTED_JWT]')
    .replace(GEMINI_API_KEY_REGEX, '[REDACTED_API_KEY]')
    .replace(FILE_PATH_REGEX, '[REDACTED_PATH]');
};

/**
 * Deeply clones and redacts sensitive keys from an object or array.
 *
 * @param {unknown} value
 * @param {number} [depth=0]
 * @returns {unknown} sanitized copy
 */
export const redactSensitiveData = (value, depth = 0) => {
  if (depth > 6) return '[MAX_DEPTH]';
  if (value === null || value === undefined) return value;

  // Handle Buffer instances
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return '[BUFFER_REDACTED]';
  }

  if (typeof value !== 'object') {
    return typeof value === 'string' ? sanitizeString(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1));
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(val)) {
      result[key] = '[BUFFER_REDACTED]';
      continue;
    }

    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitiveData(val, depth + 1);
    }
  }

  return result;
};

/**
 * Formats a log entry safely without leaking secrets or stack traces.
 */
const formatLog = (level, message, meta = null) => {
  const timestamp = new Date().toISOString();
  const safeMessage = sanitizeString(String(message));
  const safeMeta = meta ? redactSensitiveData(meta) : null;

  return {
    timestamp,
    level,
    message: safeMessage,
    ...(safeMeta && { meta: safeMeta }),
  };
};

/**
 * Structured, security-hardened logger.
 */
export const logger = {
  info: (message, meta) => {
    if (env.NODE_ENV === 'test' && process.env.TEST_LOGS !== 'true') return;
    const entry = formatLog('INFO', message, meta);
    console.info(`[${entry.timestamp}] [INFO] ${entry.message}`, entry.meta || '');
  },

  warn: (message, meta) => {
    if (env.NODE_ENV === 'test' && process.env.TEST_LOGS !== 'true') return;
    const entry = formatLog('WARN', message, meta);
    console.warn(`[${entry.timestamp}] [WARN] ${entry.message}`, entry.meta || '');
  },

  error: (message, meta) => {
    if (env.NODE_ENV === 'test' && process.env.TEST_LOGS !== 'true') return;
    const entry = formatLog('ERROR', message, meta);
    console.error(`[${entry.timestamp}] [ERROR] ${entry.message}`, entry.meta || '');
  },

  debug: (message, meta) => {
    if (env.NODE_ENV !== 'development' || (env.NODE_ENV === 'test' && process.env.TEST_LOGS !== 'true')) return;
    const entry = formatLog('DEBUG', message, meta);
    console.debug(`[${entry.timestamp}] [DEBUG] ${entry.message}`, entry.meta || '');
  },
};

/**
 * Express HTTP Request Logging Middleware
 * Validates incoming X-Request-Id header to prevent CRLF injection.
 * Generates a safe secure UUID if missing or invalid.
 * Logs method, route template, status code, duration, and correlation ID.
 * Avoids logging raw request bodies, response payloads, authorization headers, or cookies.
 */
export const requestLogger = (req, res, next) => {
  // Validate incoming X-Request-Id to prevent CRLF or log injection attacks
  const rawId = req.headers['x-request-id'];
  const validatedId = validateCorrelationId(rawId);
  const correlationId = validatedId || crypto.randomUUID();

  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Strip query parameters to avoid logging sensitive query strings
    const safePath = (req.originalUrl || req.url || '').split('?')[0];

    // Don't log health check probes in non-debug mode to avoid log spam
    if (safePath === '/api/v1/health' || safePath === '/health') return;

    logger.info(`HTTP ${req.method} ${safePath} ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: safePath,
      statusCode: res.statusCode,
      durationMs: duration,
      requestId: correlationId,
    });
  });

  next();
};

export default {
  logger,
  requestLogger,
  validateCorrelationId,
  sanitizeString,
  redactSensitiveData,
};
