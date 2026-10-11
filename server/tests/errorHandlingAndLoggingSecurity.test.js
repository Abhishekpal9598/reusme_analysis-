import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import app from '../src/app.js';
import {
  sanitizeString,
  redactSensitiveData,
  logger,
  requestLogger,
} from '../src/utils/logger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import {
  initiateShutdown,
  resetShutdownState,
  getShutdownState,
} from '../src/utils/shutdownHandler.js';
import { GeminiServiceError } from '../src/services/geminiService.js';
import { ParserTimeoutError } from '../src/services/parserService.js';

describe('Phase 10 Step 4D: Error Handling, Logging & Information Disclosure Suite', () => {
  beforeEach(() => {
    resetShutdownState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetShutdownState();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. STRING & OBJECT SANITIZATION TESTS
  // ==========================================================================
  describe('Task 1: String and Sensitive Object Sanitization', () => {
    it('should scrub MongoDB Atlas connection strings with credentials from strings', () => {
      const sensitive = 'Failed to connect to mongodb+srv://db_admin:SuperSecretPass123!@cluster0.abc.mongodb.net/careerai?retryWrites=true on replica set';
      const clean = sanitizeString(sensitive);

      expect(clean).not.toContain('db_admin');
      expect(clean).not.toContain('SuperSecretPass123!');
      expect(clean).not.toContain('cluster0.abc.mongodb.net');
      expect(clean).toContain('[REDACTED_MONGO_URI]');
    });

    it('should scrub standard mongodb:// connection strings from strings', () => {
      const sensitive = 'Error connecting to mongodb://user:pass@localhost:27017/careerai';
      const clean = sanitizeString(sensitive);

      expect(clean).not.toContain('user:pass@localhost:27017');
      expect(clean).toContain('[REDACTED_MONGO_URI]');
    });

    it('should scrub Windows absolute file paths from error messages', () => {
      const sensitive = 'Error in C:\\Users\\Administrator\\Desktop\\careerai\\server\\src\\app.js:25';
      const clean = sanitizeString(sensitive);

      expect(clean).not.toContain('C:\\Users\\Administrator');
      expect(clean).toContain('[REDACTED_PATH]');
    });

    it('should scrub UNIX absolute file paths from error messages', () => {
      const sensitive = 'Error in /var/www/careerai/server/src/controllers/authController.js line 42';
      const clean = sanitizeString(sensitive);

      expect(clean).not.toContain('/var/www/careerai');
      expect(clean).toContain('[REDACTED_PATH]');
    });

    it('should scrub Bearer JWT tokens from strings', () => {
      const sensitive = 'Auth failure with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.XYZ1234567890';
      const clean = sanitizeString(sensitive);

      expect(clean).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(clean).toContain('[REDACTED_TOKEN]');
    });

    it('should recursively redact sensitive keys in objects', () => {
      const payload = {
        email: 'alice@example.com',
        password: 'PlainTextPassword123!',
        passwordHash: '$2a$10$hashedvalue',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MX0.xyz',
        cookie: 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        authorization: 'Bearer secret_token',
        apiKey: 'AIzaSyExampleKey12345',
        gemini_api_key: 'AIzaSyExampleKey12345',
        rawText: 'Alice Walker Software Engineer Resume with full personal info',
        userAnswer: 'I have 5 years experience with React and Node',
        safeData: {
          jobTitle: 'Backend Engineer',
          yearsOfExperience: 5,
          nestedConfig: {
            jwt: 'nested.secret.token',
          },
          topSecretData: 'confidential',
        },
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.email).toBe('alice@example.com');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.passwordHash).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.cookie).toBe('[REDACTED]');
      expect(redacted.authorization).toBe('[REDACTED]');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.gemini_api_key).toBe('[REDACTED]');
      expect(redacted.rawText).toBe('[REDACTED]');
      expect(redacted.userAnswer).toBe('[REDACTED]');
      expect(redacted.safeData.jobTitle).toBe('Backend Engineer');
      expect(redacted.safeData.yearsOfExperience).toBe(5);
      expect(redacted.safeData.nestedConfig.jwt).toBe('[REDACTED]');
      expect(redacted.safeData.topSecretData).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // 2. ERROR HANDLER CLASSIFICATION & DISCLOSURE PROTECTION
  // ==========================================================================
  describe('Task 2: Centralized Error Handler Status Codes & Response Envelope', () => {
    const createMockRes = () => {
      const res = {};
      res.statusCode = 200;
      res.status = vi.fn().mockImplementation((code) => {
        res.statusCode = code;
        return res;
      });
      res.json = vi.fn().mockImplementation((data) => {
        res.body = data;
        return res;
      });
      return res;
    };

    it('should never expose stack traces in error responses', () => {
      const err = new Error('Database query failure');
      err.stack = 'Error: Database query failure\n    at Object.<anonymous> (C:\\server\\app.js:10:15)';
      const req = { method: 'GET', originalUrl: '/api/v1/test' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.stack).toBeUndefined();
      expect(res.body.error.stack).toBeUndefined();
    });

    it('should sanitize MongoDB connection strings if present in internal error messages', () => {
      const err = new Error('Failed to connect to mongodb+srv://admin:pass@cluster.mongodb.net/test');
      const req = { method: 'GET', originalUrl: '/api/v1/test' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.body.error.message).not.toContain('admin:pass@cluster.mongodb.net');
    });

    it('should map Mongoose CastError to HTTP 400 INVALID_ID_FORMAT', () => {
      const err = new Error('Cast to ObjectId failed for value "invalid123" at path "_id"');
      err.name = 'CastError';
      const req = { method: 'GET', originalUrl: '/api/v1/applications/invalid123' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ID_FORMAT');
      expect(res.body.error.message).toBe('Invalid identifier format');
    });

    it('should map Mongoose ValidationError to HTTP 400 VALIDATION_ERROR with sanitized details', () => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = {
        title: {
          path: 'title',
          message: 'Path `title` is required.',
        },
      };
      const req = { method: 'POST', originalUrl: '/api/v1/applications' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
      expect(res.body.error.details[0].field).toBe('title');
    });

    it('should map MongoDB duplicate key code (11000) to HTTP 409 DUPLICATE_RESOURCE', () => {
      const err = new Error('E11000 duplicate key error collection: careerai.users index: email_1 dup key');
      err.code = 11000;
      const req = { method: 'POST', originalUrl: '/api/v1/auth/register' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_RESOURCE');
      expect(res.body.error.message).toContain('already exists');
    });

    it('should map Multer LIMIT_FILE_SIZE error to HTTP 413 FILE_TOO_LARGE', () => {
      const err = new Error('File too large');
      err.code = 'LIMIT_FILE_SIZE';
      const req = { method: 'POST', originalUrl: '/api/v1/resumes' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(413);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
      expect(res.body.error.message).toContain('exceeds the 5MB limit');
    });

    it('should map JWT errors to HTTP 401 INVALID_TOKEN / TOKEN_EXPIRED', () => {
      const jwtErr = new Error('jwt malformed');
      jwtErr.name = 'JsonWebTokenError';
      const req = { method: 'GET', originalUrl: '/api/v1/auth/me' };
      const res1 = createMockRes();

      errorHandler(jwtErr, req, res1, () => {});

      expect(res1.statusCode).toBe(401);
      expect(res1.body.error.code).toBe('INVALID_TOKEN');

      const expErr = new Error('jwt expired');
      expErr.name = 'TokenExpiredError';
      const res2 = createMockRes();

      errorHandler(expErr, req, res2, () => {});

      expect(res2.statusCode).toBe(401);
      expect(res2.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should map ParserTimeoutError to HTTP 422 PARSER_TIMEOUT', () => {
      const err = new ParserTimeoutError('Document parsing timed out.');
      const req = { method: 'POST', originalUrl: '/api/v1/resumes' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(422);
      expect(res.body.error.code).toBe('PARSER_TIMEOUT');
    });

    it('should map MongoNetworkError to HTTP 503 DATABASE_UNAVAILABLE', () => {
      const err = new Error('failed to connect to server');
      err.name = 'MongoNetworkError';
      const req = { method: 'GET', originalUrl: '/api/v1/applications' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(503);
      expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
    });

    it('should map GeminiServiceError to its designated HTTP status and code without leaking provider internals', () => {
      const err = new GeminiServiceError('AI service rate limit reached.', 429, 'GEMINI_RATE_LIMIT');
      const req = { method: 'POST', originalUrl: '/api/v1/resumes/123/analyze' };
      const res = createMockRes();

      errorHandler(err, req, res, () => {});

      expect(res.statusCode).toBe(429);
      expect(res.body.error.code).toBe('GEMINI_RATE_LIMIT');
      expect(res.body.error.message).toBe('AI service rate limit reached.');
    });
  });

  // ==========================================================================
  // 3. 404 ROUTE & QUERY SANITIZATION TESTS
  // ==========================================================================
  describe('Task 3: 404 Handler Information Disclosure Protection', () => {
    it('should not reflect sensitive query parameters in 404 error response', async () => {
      const res = await request(app).get('/api/v1/nonexistent-route?secretToken=superSecret123&password=myPassword');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
      expect(res.body.error.message).toContain('/api/v1/nonexistent-route');
      expect(res.body.error.message).not.toContain('secretToken');
      expect(res.body.error.message).not.toContain('superSecret123');
      expect(res.body.error.message).not.toContain('myPassword');
    });
  });

  // ==========================================================================
  // 4. REQUEST LOGGER & CORRELATION ID TESTS
  // ==========================================================================
  describe('Task 4: Request Logging & Correlation Headers', () => {
    it('should set X-Request-Id header on all API responses', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('should preserve incoming X-Request-Id correlation header if client provides one', async () => {
      const customId = 'custom-correlation-id-98765';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', customId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
    });
  });

  // ==========================================================================
  // 5. GRACEFUL SHUTDOWN BEHAVIOR TESTS
  // ==========================================================================
  describe('Task 5: Graceful Shutdown & Process Handler Invariants', () => {
    it('should execute graceful shutdown idempotently and prevent concurrent executions', async () => {
      const mockServer = {
        listening: true,
        close: vi.fn((cb) => cb()),
      };

      expect(getShutdownState()).toBe(false);

      // First shutdown trigger
      await initiateShutdown(mockServer, 'SIGTERM', { exitOnFinish: false });
      expect(getShutdownState()).toBe(true);
      expect(mockServer.close).toHaveBeenCalledTimes(1);

      // Second duplicate shutdown trigger should be ignored
      await initiateShutdown(mockServer, 'SIGTERM', { exitOnFinish: false });
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });
  });
});
