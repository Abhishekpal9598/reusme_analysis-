import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { generateToken, verifyToken } from '../src/utils/token.js';
import {
  validateCorrelationId,
  sanitizeString,
  redactSensitiveData,
} from '../src/utils/logger.js';
import { getRateLimiterStoreStatus } from '../src/middleware/rateLimitMiddleware.js';

let mongoServer;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  testUser = await User.create({
    fullName: 'Gate Test User',
    email: 'gate@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzaBCDEFGHIJKLMNOPQRSTUVWXYZ12',
  });
});

describe('Phase 10 Step 5A: Final Deployment Gate Remediation Suite', () => {
  // ==========================================================================
  // 1. CORRELATION ID SECURITY & CRLF INJECTION DEFENSE
  // ==========================================================================
  describe('Gate 1: Correlation ID Security & CRLF Defense', () => {
    it('validateCorrelationId: preserves valid IDs (alphanumeric, hyphen, underscore up to 64 chars)', () => {
      expect(validateCorrelationId('valid-id-123')).toBe('valid-id-123');
      expect(validateCorrelationId('req_ABC-123_xyz')).toBe('req_ABC-123_xyz');
      expect(validateCorrelationId('a'.repeat(64))).toBe('a'.repeat(64));
    });

    it('validateCorrelationId: rejects oversized IDs (> 64 characters)', () => {
      expect(validateCorrelationId('a'.repeat(65))).toBeNull();
      expect(validateCorrelationId('a'.repeat(128))).toBeNull();
    });

    it('validateCorrelationId: rejects CRLF newline injection attempts', () => {
      expect(validateCorrelationId('valid-id\r\nX-Injected: evil')).toBeNull();
      expect(validateCorrelationId('valid-id\nInjected-Log')).toBeNull();
      expect(validateCorrelationId('\r\nevil')).toBeNull();
    });

    it('validateCorrelationId: rejects empty strings, whitespace, and prohibited characters', () => {
      expect(validateCorrelationId('')).toBeNull();
      expect(validateCorrelationId('   ')).toBeNull();
      expect(validateCorrelationId('id with spaces')).toBeNull();
      expect(validateCorrelationId('id$with$dollar')).toBeNull();
      expect(validateCorrelationId('<script>alert(1)</script>')).toBeNull();
      expect(validateCorrelationId(null)).toBeNull();
      expect(validateCorrelationId(undefined)).toBeNull();
      expect(validateCorrelationId(12345)).toBeNull();
    });

    it('HTTP Integration: preserves valid incoming X-Request-Id header', async () => {
      const validId = 'safe-correlation-id_12345';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', validId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(validId);
    });

    it('HTTP Integration: replaces invalid character X-Request-Id with secure UUID', async () => {
      const invalidCharId = 'invalid id with spaces and $dollar';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', invalidCharId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).not.toContain('invalid id');
      expect(res.headers['x-request-id']).not.toContain(' ');
      expect(res.headers['x-request-id']).not.toContain('$');
      // Must be a valid UUID format: 8-4-4-4-12 hex chars
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('HTTP Integration: replaces oversized X-Request-Id with secure UUID', async () => {
      const oversizedId = 'x'.repeat(100);
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', oversizedId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id'].length).toBe(36); // Standard UUID length
      expect(res.headers['x-request-id']).not.toBe(oversizedId);
    });
  });

  // ==========================================================================
  // 2. COMPREHENSIVE LOGGER REDACTION
  // ==========================================================================
  describe('Gate 2: Comprehensive Logger Redaction Verification', () => {
    it('should scrub Redis connection strings and credentials from strings', () => {
      const redisUri = 'Connection failure with redis://default:SuperSecretPassword123@redis-cluster.cloud.redislabs.com:6379/0';
      const clean = sanitizeString(redisUri);

      expect(clean).not.toContain('SuperSecretPassword123');
      expect(clean).not.toContain('redis-cluster.cloud.redislabs.com');
      expect(clean).toContain('[REDACTED_REDIS_URI]');
    });

    it('should scrub Google / Gemini API keys from strings', () => {
      const apiKeyString = 'Failed to authenticate with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q in request';
      const clean = sanitizeString(apiKeyString);

      expect(clean).not.toContain('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q');
      expect(clean).toContain('[REDACTED_API_KEY]');
    });

    it('should redact Buffer instances to [BUFFER_REDACTED]', () => {
      const bufferPayload = {
        fileName: 'resume.pdf',
        fileContent: Buffer.from('%PDF-1.4 binary content with confidential text'),
      };

      const redacted = redactSensitiveData(bufferPayload);

      expect(redacted.fileName).toBe('resume.pdf');
      expect(redacted.fileContent).toBe('[BUFFER_REDACTED]');
      expect(redactSensitiveData(Buffer.from('standalone'))).toBe('[BUFFER_REDACTED]');
    });

    it('should redact sensitive fields in deeply nested arrays and objects', () => {
      const complexData = {
        users: [
          {
            email: 'user1@example.com',
            password: 'pass1',
            submissions: [{ userAnswer: 'Candidate sensitive career response' }],
          },
          {
            email: 'user2@example.com',
            passwordHash: '$2a$10$hash',
            rawText: 'Candidate full resume raw text',
          },
        ],
        serviceConfig: {
          database: {
            mongodb_uri: 'mongodb+srv://admin:pass@cluster.mongodb.net/test',
          },
          cache: {
            redis_url: 'redis://default:pass@redis:6379',
          },
          ai: {
            gemini_api_key: 'AIzaSyExample12345',
          },
        },
      };

      const redacted = redactSensitiveData(complexData);

      expect(redacted.users[0].password).toBe('[REDACTED]');
      expect(redacted.users[0].submissions[0].userAnswer).toBe('[REDACTED]');
      expect(redacted.users[1].passwordHash).toBe('[REDACTED]');
      expect(redacted.users[1].rawText).toBe('[REDACTED]');
      expect(redacted.serviceConfig.database.mongodb_uri).toBe('[REDACTED]');
      expect(redacted.serviceConfig.cache.redis_url).toBe('[REDACTED]');
      expect(redacted.serviceConfig.ai.gemini_api_key).toBe('[REDACTED]');
    });
  });

  // ==========================================================================
  // 3. RATE LIMITER STORE STATUS & MULTI-INSTANCE VERIFICATION
  // ==========================================================================
  describe('Gate 3: Rate Limiter Store & Multi-Instance Documentation', () => {
    it('getRateLimiterStoreStatus: correctly identifies in-memory mode and emits multi-instance warning', () => {
      const status = getRateLimiterStoreStatus();

      expect(status.type).toBe('memory');
      expect(status.isDistributed).toBe(false);
      expect(status.multiInstanceWarning).toContain('process-isolated in-memory mode');
      expect(status.multiInstanceWarning).toContain('will not share rate limit counters');
    });
  });

  // ==========================================================================
  // 4. AUTHENTICATION LOGOUT & STATELESS JWT LIMITATION
  // ==========================================================================
  describe('Gate 4: Stateless JWT Logout Behavior & Invariants', () => {
    it('should clear HttpOnly cookie on logout and reject subsequent uncredentialed requests', async () => {
      // 1. Log in to get session cookie and token
      const token = generateToken(testUser);

      // 2. Access /auth/me with cookie
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [`token=${token}`]);
      expect(meRes.status).toBe(200);

      // 3. Perform logout
      const logoutRes = await request(app).post('/api/v1/auth/logout');
      expect(logoutRes.status).toBe(200);

      // Verify Set-Cookie header clears the token
      const cookies = logoutRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toMatch(/token=;|Max-Age=0|Expires=Thu, 01 Jan 1970/);

      // 4. Subsequent request without cookie returns 401 UNAUTHORIZED
      const unauthRes = await request(app).get('/api/v1/auth/me');
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Documented Invariant: Stateless JWT remains cryptographically valid until expiry if copied prior to logout', () => {
      const token = generateToken(testUser);

      // Verify that cryptographic signature and payload remain valid
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(testUser._id.toString());
      expect(decoded.email).toBe(testUser.email);

      // Documented architectural property: In a purely stateless JWT architecture,
      // client-side cookie clearing revokes browser session, but raw token strings
      // retain cryptographic validity until exp. (Addressed by short token lifetimes or stateful blacklists if required).
    });
  });
});
