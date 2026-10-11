import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('CORS and Security Headers', () => {
  it('should allow requests from configured CLIENT_URL with appropriate CORS headers', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should reject requests with unauthorized Origin via CORS policy', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://malicious-site.example.com');

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'CORS_ERROR');
  });

  it('should attach standard security headers via Helmet', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(response.headers).toHaveProperty('x-frame-options');
  });
});
