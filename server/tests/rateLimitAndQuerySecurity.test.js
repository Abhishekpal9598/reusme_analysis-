import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Application } from '../src/models/Application.js';
import { Resume } from '../src/models/Resume.js';
import { generateToken, setAuthCookie } from '../src/utils/token.js';
import {
  calculateBackoffSeconds,
  getAccountLockStatus,
  recordFailedLogin,
  recordSuccessfulLogin,
  clearLoginAttempts,
} from '../src/utils/accountBackoff.js';
import {
  containsMongoInjectionKey,
  sanitizeMongoInput,
} from '../src/middleware/mongoSanitizeMiddleware.js';

let mongoServer;
let userA;
let userB;
let tokenA;
let tokenB;

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
  await Application.deleteMany({});
  await Resume.deleteMany({});
  clearLoginAttempts();

  userA = await User.create({
    fullName: 'Alice Walker',
    email: 'alice@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzaBCDEFGHIJKLMNOPQRSTUVWXYZ12',
  });

  userB = await User.create({
    fullName: 'Bob Smith',
    email: 'bob@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzaBCDEFGHIJKLMNOPQRSTUVWXYZ12',
  });

  tokenA = generateToken(userA);
  tokenB = generateToken(userB);
});

describe('Phase 10 Step 4C: Rate Limiting & Database Query Security Suite', () => {
  // ==========================================================================
  // 1. PROGRESSIVE ACCOUNT BACKOFF & RATE LIMITING
  // ==========================================================================
  describe('Task 1: Progressive Account Backoff & Abuse Protection', () => {
    it('should calculate exponential backoff accurately up to 900s cap', () => {
      // Below threshold (5)
      expect(calculateBackoffSeconds(0, 5)).toBe(0);
      expect(calculateBackoffSeconds(3, 5)).toBe(0);
      expect(calculateBackoffSeconds(4, 5)).toBe(0);

      // At and above threshold
      expect(calculateBackoffSeconds(5, 5)).toBe(15); // 2^0 * 15 = 15s
      expect(calculateBackoffSeconds(6, 5)).toBe(30); // 2^1 * 15 = 30s
      expect(calculateBackoffSeconds(7, 5)).toBe(60); // 2^2 * 15 = 60s
      expect(calculateBackoffSeconds(8, 5)).toBe(120); // 2^3 * 15 = 120s
      expect(calculateBackoffSeconds(9, 5)).toBe(240); // 2^4 * 15 = 240s
      expect(calculateBackoffSeconds(10, 5)).toBe(480); // 2^5 * 15 = 480s
      expect(calculateBackoffSeconds(11, 5)).toBe(900); // 2^6 * 15 = 960 -> capped at 900s
      expect(calculateBackoffSeconds(20, 5)).toBe(900); // capped at 900s
    });

    it('should record failed attempts and lock out after 5 consecutive failures', async () => {
      const email = 'target@example.com';

      // 4 consecutive failed attempts should return 401 without lockout
      for (let i = 1; i <= 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password: 'WrongPassword!' });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      }

      // 5th failed attempt should trigger lockout
      const fifthRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });
      expect(fifthRes.status).toBe(401);

      // Next attempt while locked should return 429 TOO_MANY_REQUESTS with Retry-After header
      const lockedRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword!' });
      expect(lockedRes.status).toBe(429);
      expect(lockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(lockedRes.headers['retry-after']).toBeDefined();
      expect(Number(lockedRes.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('should reset failed login count upon successful login', async () => {
      // Register an account with known password
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: 'testuser@example.com',
          password: 'Password123!',
        });
      expect(regRes.status).toBe(201);

      // Trigger 3 failed logins
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'testuser@example.com', password: 'WrongPassword!' });
      }

      const statusBefore = getAccountLockStatus('testuser@example.com');
      expect(statusBefore.attempts).toBe(3);

      // Now log in with correct credentials
      const successRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'testuser@example.com', password: 'Password123!' });
      expect(successRes.status).toBe(200);

      // Verify attempts counter was reset to 0
      const statusAfter = getAccountLockStatus('testuser@example.com');
      expect(statusAfter.attempts).toBe(0);
      expect(statusAfter.isLocked).toBe(false);
    });

    it('should never reveal account existence during lockout', async () => {
      // Non-existent email locked after multiple attempts
      const nonExistentEmail = 'ghost@example.com';
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: nonExistentEmail, password: 'WrongPassword!' });
      }

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: nonExistentEmail, password: 'AnyPassword!' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(res.body.error.message).toContain('Account login temporarily locked');
      // Must not leak whether ghost@example.com exists
      expect(res.body.error.message).not.toContain('does not exist');
      expect(res.body.error.message).not.toContain('found');
    });

    it('should bypass global rate limiter on /api/v1/health and root /', async () => {
      const healthRes = await request(app).get('/api/v1/health');
      expect(healthRes.status).toBe(200);
      expect(healthRes.body.success).toBe(true);
      expect(healthRes.body.message).toContain('CareerAI API is operational');

      const rootRes = await request(app).get('/');
      expect(rootRes.status).toBe(200);
      expect(rootRes.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // 2. MONGODB OPERATOR & NOSQL INJECTION SANITIZATION
  // ==========================================================================
  describe('Task 2: NoSQL Query & MongoDB Operator Injection Protection', () => {
    it('containsMongoInjectionKey unit test: detects keys with $ or . in any depth', () => {
      expect(containsMongoInjectionKey({ $gt: '' })).toBe(true);
      expect(containsMongoInjectionKey({ email: { $ne: null } })).toBe(true);
      expect(containsMongoInjectionKey({ 'user.role': 'admin' })).toBe(true);
      expect(containsMongoInjectionKey([{ valid: 1 }, { $where: '1==1' }])).toBe(true);

      // Clean inputs
      expect(containsMongoInjectionKey({ email: 'test@example.com', page: 1 })).toBe(false);
      expect(containsMongoInjectionKey([1, 2, 'hello', { a: 'b' }])).toBe(false);
      expect(containsMongoInjectionKey(null)).toBe(false);
      expect(containsMongoInjectionKey(undefined)).toBe(false);
    });

    it('sanitizeMongoInput unit test: strips prohibited keys recursively', () => {
      const dirty = {
        name: 'Valid Name',
        $gt: 'malicious',
        nested: {
          'path.dotted': 'bad',
          safeField: 'good',
        },
      };

      const clean = sanitizeMongoInput(dirty);
      expect(clean).toEqual({
        name: 'Valid Name',
        nested: {
          safeField: 'good',
        },
      });
    });

    it('should reject MongoDB operator injection ($gt) in request body with 400 PROHIBITED_QUERY_OPERATOR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $gt: '' },
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PROHIBITED_QUERY_OPERATOR');
      expect(res.body.error.message).toContain('prohibited query operators');
    });

    it('should reject dotted path injection in request body with 400 PROHIBITED_QUERY_OPERATOR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          'user.admin': true,
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PROHIBITED_QUERY_OPERATOR');
    });

    it('should reject prohibited operators in query parameters with 400 PROHIBITED_QUERY_OPERATOR', async () => {
      const res = await request(app)
        .get('/api/v1/applications?status[$ne]=Rejected')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PROHIBITED_QUERY_OPERATOR');
    });

    it('should accept legitimate clean query parameters without false positives', async () => {
      const res = await request(app)
        .get('/api/v1/applications?page=1&limit=10&status=Applied')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // 3. PAGINATION, SORTING & REGEX SAFETY
  // ==========================================================================
  describe('Task 3: Pagination Bounds, Sort Allowlisting & Regex Safety', () => {
    beforeEach(async () => {
      // Seed applications for User A
      for (let i = 1; i <= 5; i++) {
        await Application.create({
          userId: userA._id,
          companyName: `Company ${i}`,
          positionTitle: `Software Engineer ${i}`,
          status: 'Applied',
        });
      }
    });

    it('should clamp negative page and limit parameters safely without errors', async () => {
      const res = await request(app)
        .get('/api/v1/applications?page=-5&limit=-20')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
    });

    it('should clamp excessive limit parameters to MAX_PAGE_SIZE (100)', async () => {
      const res = await request(app)
        .get('/api/v1/applications?page=1&limit=99999')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.limit).toBe(100);
    });

    it('should safely fall back to default sort field (createdAt) when unlisted sort field is provided', async () => {
      const res = await request(app)
        .get('/api/v1/applications?sortBy=maliciousColumn&sortOrder=asc')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(5);
    });

    it('should escape regex special characters and truncate search input to prevent ReDoS', async () => {
      // Malicious search string with regex metacharacters: .*+?^${}()|[]\
      const dangerousSearch = '.*+?^${}()|[]\\(company)+';
      const res = await request(app)
        .get(`/api/v1/applications?q=${encodeURIComponent(dangerousSearch)}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]); // Safe empty result, zero crash
    });

    it('should handle search queries longer than 100 characters by safely truncating', async () => {
      const longQuery = 'A'.repeat(250);
      const res = await request(app)
        .get(`/api/v1/applications?q=${encodeURIComponent(longQuery)}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // 4. IDOR & OBJECTID INTEGRITY PROTECTION
  // ==========================================================================
  describe('Task 4: IDOR Protection & ObjectId Integrity', () => {
    let appA;

    beforeEach(async () => {
      appA = await Application.create({
        userId: userA._id,
        companyName: 'Stripe',
        positionTitle: 'Backend Engineer',
        status: 'Applied',
      });
    });

    it('should return 400 for malformed ObjectId parameter without crashing', async () => {
      const res = await request(app)
        .get('/api/v1/applications/not-a-valid-object-id')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_APPLICATION_ID');
    });

    it('IDOR: User B cannot retrieve User A application (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${appA._id}`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
    });

    it('IDOR: User B cannot update User A application (returns 404)', async () => {
      const res = await request(app)
        .put(`/api/v1/applications/${appA._id}`)
        .send({ companyName: 'Hacked Corp' })
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');

      // Verify unmutated in DB
      const unchanged = await Application.findById(appA._id);
      expect(unchanged.companyName).toBe('Stripe');
    });

    it('IDOR: User B cannot delete User A application (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/v1/applications/${appA._id}`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');

      // Verify still exists in DB
      const stillExists = await Application.findById(appA._id);
      expect(stillExists).not.toBeNull();
    });
  });
});
