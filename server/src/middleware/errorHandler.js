import { sendError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  // CORS error handling
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return sendError(res, 403, 'CORS_ERROR', 'Origin not allowed by CORS policy');
  }

  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'INVALID_JSON', 'Malformed JSON payload');
  }

  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.isOperational || env.NODE_ENV !== 'production'
    ? err.message || 'An unexpected error occurred'
    : 'An unexpected internal server error occurred';

  // In non-production, log detailed stack traces for debugging
  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  return sendError(res, statusCode, errorCode, message, err.details || []);
};
