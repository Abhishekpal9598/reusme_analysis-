import { sendError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';
import { logger, sanitizeString } from '../utils/logger.js';

/**
 * Production-hardened centralized Express error handler.
 * Guarantees that:
 * 1. Stack traces, database URIs, and filesystem paths are never returned to clients.
 * 2. Proper semantic HTTP status codes are preserved (400, 401, 403, 404, 409, 413, 422, 429, 500, 503).
 * 3. Log statements redact sensitive credentials, tokens, and payloads.
 */
export const errorHandler = (err, req, res, next) => {
  // 1. CORS Policy Rejection
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return sendError(res, 403, 'CORS_ERROR', 'Origin not allowed by CORS policy');
  }

  // 2. Body Parser JSON Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'INVALID_JSON', 'Malformed JSON payload');
  }

  // 3. Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 400, 'INVALID_ID_FORMAT', 'Invalid identifier format');
  }

  // 4. Mongoose Schema Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      issue: sanitizeString(e.message),
    }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Input validation failed', details);
  }

  // 5. MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    return sendError(
      res,
      409,
      'DUPLICATE_RESOURCE',
      'A resource with this identifier already exists.'
    );
  }

  // 6. Multer Upload Size & Format Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(
      res,
      413,
      'FILE_TOO_LARGE',
      'File size exceeds the 5MB limit. Please upload a smaller document.'
    );
  }

  if (err.name === 'MulterError') {
    return sendError(
      res,
      400,
      'UPLOAD_ERROR',
      sanitizeString(err.message || 'File upload failed')
    );
  }

  // 7. JWT Authentication Verification Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token.');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'TOKEN_EXPIRED', 'Session expired. Please sign in again.');
  }

  // 8. Document Parser Timeout or Unparseable Errors
  if (err.name === 'ParserTimeoutError' || err.code === 'PARSER_TIMEOUT') {
    return sendError(
      res,
      422,
      'PARSER_TIMEOUT',
      'Document parsing timed out. The document may be corrupted or excessively complex.'
    );
  }

  // 9. MongoDB / Network Infrastructure Failures
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    return sendError(
      res,
      503,
      'DATABASE_UNAVAILABLE',
      'Database service is temporarily unavailable. Please try again shortly.'
    );
  }

  // 10. General Status Code Resolution & Information Disclosure Protection
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');

  let clientMessage;
  if (statusCode >= 500) {
    clientMessage = env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : sanitizeString(err.message || 'An unexpected internal server error occurred.');
  } else {
    // 4xx client errors can receive sanitized operational messages
    clientMessage = sanitizeString(err.message || 'Invalid request.');
  }

  // 11. Structured Server Logging (never leaks raw passwords or sensitive request bodies)
  const safePath = (req.originalUrl || req.url || '').split('?')[0];
  logger.error(`Error processing ${req.method} ${safePath} [${statusCode} ${errorCode}]: ${clientMessage}`, {
    method: req.method,
    path: safePath,
    statusCode,
    errorCode,
    requestId: req.id,
    errorName: err.name,
  });

  const safeDetails = Array.isArray(err.details)
    ? err.details.map((d) => (typeof d === 'string' ? sanitizeString(d) : d))
    : [];

  return sendError(res, statusCode, errorCode, clientMessage, safeDetails);
};

export default errorHandler;
