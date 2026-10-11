import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { env } from '../src/config/env.js';
import {
  getAuthCookieOptions,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
  SEVEN_DAYS_MS,
} from '../src/utils/token.js';

let mongoServer;

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
});

describe('Phase 10 Step 4A: Authentication and Cookie Security Suite', () => {
  describe('1. Production & Development Cookie Attributes', () => {
    it('should generate secure cookie options in production environment', () => {
      const prodOptions = getAuthCookieOptions({
        NODE_ENV: 'production',
        COOKIE_SAMESITE: 'lax',
      });

      expect(prodOptions.httpOnly).toBe(true);
      expect(prodOptions.secure).toBe(true);
      expect(prodOptions.sameSite).toBe('lax');
      expect(prodOptions.path).toBe('/');
      expect(prodOptions.domain).toBeUndefined();
    });

    it('should allow secure=false in development environment for local HTTP', () => {
      const devOptions = getAuthCookieOptions({
        NODE_ENV: 'development',
        COOKIE_SAMESITE: 'lax',
      });

      expect(devOptions.httpOnly).toBe(true);
      expect(devOptions.secure).toBe(false);
      expect(devOptions.sameSite).toBe('lax');
      expect(devOptions.path).toBe('/');
    });

    it('should configure SameSite=none and Secure=true when cross-site topology is enabled', () => {
      const crossSiteOptions = getAuthCookieOptions({
        NODE_ENV: 'production',
        COOKIE_SAMESITE: 'none',
      });

      expect(crossSiteOptions.httpOnly).toBe(true);
      expect(crossSiteOptions.secure).toBe(true);
      expect(crossSiteOptions.sameSite).toBe('none');
    });

    it('should attach COOKIE_DOMAIN if custom parent domain is configured', () => {
      const domainOptions = getAuthCookieOptions({
        NODE_ENV: 'production',
        COOKIE_SAMESITE: 'lax',
        COOKIE_DOMAIN: '.careerai.com',
      });

      expect(domainOptions.domain).toBe('.careerai.com');
      expect(domainOptions.httpOnly).toBe(true);
      expect(domainOptions.secure).toBe(true);
    });

    it('should ensure clearAuthCookie options match setAuthCookie options for eviction', () => {
      const mockRes = {
        cookie: (name, val, opts) => ({ name, val, opts }),
        clearCookie: (name, opts) => ({ name, opts }),
      };

      let setOpts;
      let clearOpts;

      mockRes.cookie = (name, val, opts) => {
        setOpts = opts;
      };
      mockRes.clearCookie = (name, opts) => {
        clearOpts = opts;
      };

      setAuthCookie(mockRes, 'sample-token');
      clearAuthCookie(mockRes);

      expect(setOpts.httpOnly).toBe(clearOpts.httpOnly);
      expect(setOpts.secure).toBe(clearOpts.secure);
      expect(setOpts.sameSite).toBe(clearOpts.sameSite);
      expect(setOpts.path).toBe(clearOpts.path);
      expect(setOpts.maxAge).toBe(SEVEN_DAYS_MS);
    });
  });

  describe('2. JWT Lifecycle & Expiration Enforcement', () => {
    it('should reject expired JWT tokens with 401 TOKEN_EXPIRED', async () => {
      const testUser = await User.create({
        fullName: 'Aarav Gupta',
        email: 'aarav.expired@example.com',
        passwordHash: '$2a$10$wK1F5N8j7p2Q6R9T1v3.heO5C1o8q6S9T1v3.heO5C1o8q6S9T1v3.',
      });

      // Generate deliberately expired token (expired 10 seconds ago)
      const expiredToken = jwt.sign(
        { userId: testUser._id.toString(), email: testUser.email },
        env.JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
      expect(res.body.error.message).toContain('Session expired');
    });

    it('should reject tampered or invalid JWT signatures with 401 INVALID_TOKEN', async () => {
      // Generate token signed with wrong secret key
      const forgedToken = jwt.sign(
        { userId: new mongoose.Types.ObjectId().toString(), email: 'forged@example.com' },
        'wrong_attacker_controlled_secret_key_12345'
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
      expect(res.body.error.message).toContain('Invalid authentication token');
    });

    it('should reject requests with completely missing tokens with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject valid JWT if referenced user was deleted from the database', async () => {
      const testUser = await User.create({
        fullName: 'Deleted Candidate',
        email: 'deleted.candidate@example.com',
        passwordHash: '$2a$10$wK1F5N8j7p2Q6R9T1v3.heO5C1o8q6S9T1v3.heO5C1o8q6S9T1v3.',
      });

      const validToken = generateToken(testUser);

      // Now remove the user from database
      await User.findByIdAndDelete(testUser._id);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `token=${validToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
      expect(res.body.error.message).toContain('no longer exists');
    });
  });

  describe('3. CORS Origin Restrictions & Credentials', () => {
    it('should permit authorized origin with credentials header', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should block unauthorized foreign origin with 403 CORS_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'https://attacker-domain.evil.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CORS_ERROR');
    });
  });

  describe('4. Vercel SPA Routing Regex Guard', () => {
    const spaRegex = /^\/((?!api\/).*)?$/;

    it('should match client-side routes for SPA rewrite to index.html', () => {
      const clientRoutes = [
        '/',
        '/login',
        '/register',
        '/dashboard',
        '/resumes',
        '/job-matches',
        '/interviews',
        '/applications',
        '/career-intelligence',
      ];

      clientRoutes.forEach((route) => {
        expect(spaRegex.test(route)).toBe(true);
      });
    });

    it('should NEVER match /api/ routes to prevent intercepting API requests', () => {
      const apiRoutes = [
        '/api/v1/health',
        '/api/v1/auth/login',
        '/api/v1/resumes',
        '/api/v1/job-matches',
        '/api/v1/career-intelligence',
      ];

      apiRoutes.forEach((route) => {
        expect(spaRegex.test(route)).toBe(false);
      });
    });
  });
});
