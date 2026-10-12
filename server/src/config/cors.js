import { env } from './env.js';

/**
 * Normalizes an origin URL by trimming whitespace, lowercasing, and stripping trailing slashes.
 * @param {string} url - Origin URL string
 * @returns {string} Normalized origin string
 */
export const normalizeOrigin = (url) => {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '').toLowerCase();
};

/**
 * Builds the canonical set of allowed origins.
 * Guaranteed to include:
 * - Production frontend origin: https://reusme-analysis.vercel.app
 * - Local development origins (in non-production environments)
 * - Any origins specified in CLIENT_URL or CORS_ALLOWED_ORIGINS
 * @returns {Set<string>} Set of normalized allowed origins
 */
export const getBaseAllowedOrigins = () => {
  const origins = new Set();

  // 1. Mandatory production frontend origin
  origins.add(normalizeOrigin('https://reusme-analysis.vercel.app'));

  // 2. Development & Test local origins
  if (env.NODE_ENV !== 'production') {
    origins.add(normalizeOrigin('http://localhost:5173'));
    origins.add(normalizeOrigin('http://localhost:3000'));
    origins.add(normalizeOrigin('http://127.0.0.1:5173'));
  }

  // 3. Environment-configured CLIENT_URL (supports comma-separated list and trailing slashes)
  if (env.CLIENT_URL) {
    env.CLIENT_URL.split(',').forEach((u) => {
      const normalized = normalizeOrigin(u);
      if (normalized) origins.add(normalized);
    });
  }

  // 4. Optional dedicated CORS allowlist variable
  if (env.CORS_ALLOWED_ORIGINS) {
    env.CORS_ALLOWED_ORIGINS.split(',').forEach((u) => {
      const normalized = normalizeOrigin(u);
      if (normalized) origins.add(normalized);
    });
  }

  return origins;
};

/**
 * Checks whether an incoming origin is authorized.
 * @param {string|undefined} origin - Incoming Origin header
 * @param {Set<string>} [allowedOrigins] - Set of allowed origins
 * @returns {boolean} True if origin is allowed
 */
export const isOriginAllowed = (origin, allowedOrigins = getBaseAllowedOrigins()) => {
  if (!origin) return true; // Server-to-server, curl, health-checks without Origin header
  const normalized = normalizeOrigin(origin);
  return allowedOrigins.has(normalized);
};

/**
 * Production-hardened CORS options for Express cors middleware.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is Not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
    'Accept',
    'Origin',
  ],
  maxAge: 86400, // 24 hours preflight cache
};

export default corsOptions;
