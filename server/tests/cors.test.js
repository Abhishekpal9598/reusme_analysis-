import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { normalizeOrigin, isOriginAllowed, getBaseAllowedOrigins } from '../src/config/cors.js';

describe('CORS and Security Headers Suite', () => {
  const PROD_ORIGIN = 'https://reusme-analysis.vercel.app';
  const LOCAL_ORIGIN = 'http://localhost:5173';
  const MALICIOUS_ORIGIN = 'https://malicious-attacker.example.com';

  describe('Origin Normalization & Resolution Helpers', () => {
    it('should normalize origins by trimming, lowercasing, and removing trailing slashes', () => {
      expect(normalizeOrigin('https://reusme-analysis.vercel.app/')).toBe('https://reusme-analysis.vercel.app');
      expect(normalizeOrigin('  HTTP://LOCALHOST:5173/// ')).toBe('http://localhost:5173');
      expect(normalizeOrigin('')).toBe('');
      expect(normalizeOrigin(null)).toBe('');
      expect(normalizeOrigin(undefined)).toBe('');
    });

    it('should include the production Vercel frontend in base allowed origins', () => {
      const origins = getBaseAllowedOrigins();
      expect(origins.has(PROD_ORIGIN)).toBe(true);
    });

    it('should authorize production and local origins while rejecting untrusted origins', () => {
      expect(isOriginAllowed(PROD_ORIGIN)).toBe(true);
      expect(isOriginAllowed(`${PROD_ORIGIN}/`)).toBe(true); // Trailing slash tolerance
      expect(isOriginAllowed(LOCAL_ORIGIN)).toBe(true);
      expect(isOriginAllowed(undefined)).toBe(true); // Non-browser / curl
      expect(isOriginAllowed(MALICIOUS_ORIGIN)).toBe(false);
    });
  });

  describe('HTTP CORS Middleware Integration', () => {
    it('should allow GET requests from configured production origin with credentials header', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', PROD_ORIGIN);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow requests from local development origin', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', LOCAL_ORIGIN);

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe(LOCAL_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from unauthorized origins with 403 CORS_ERROR', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', MALICIOUS_ORIGIN);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'CORS_ERROR');
      expect(response.body.error.message).toContain('Origin not allowed by CORS policy');
    });

    it('should handle OPTIONS preflight for /api/v1/auth/login', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', PROD_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,X-Request-Id');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should handle OPTIONS preflight for /api/v1/auth/register', async () => {
      const response = await request(app)
        .options('/api/v1/auth/register')
        .set('Origin', PROD_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle OPTIONS preflight for /api/v1/auth/logout', async () => {
      const response = await request(app)
        .options('/api/v1/auth/logout')
        .set('Origin', PROD_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle OPTIONS preflight for /api/v1/auth/me', async () => {
      const response = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', PROD_ORIGIN)
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should attach CORS headers to POST /api/v1/auth/login request from production origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', PROD_ORIGIN)
        .send({ email: 'nonexistent@example.com', password: 'Password123!' });

      // Even if validation/auth returns 401/400, CORS header must be present!
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should attach CORS headers to POST /api/v1/auth/register request from production origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Origin', PROD_ORIGIN)
        .send({ name: 'Test', email: 'invalid-email', password: '123' });

      // Even on validation error 400, CORS header must be present
      expect(response.headers['access-control-allow-origin']).toBe(PROD_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should attach standard security headers via Helmet', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});
