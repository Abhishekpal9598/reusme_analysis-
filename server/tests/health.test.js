import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('should return 200 OK and valid health status payload', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'CareerAI API is operational');
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.timestamp).toBe('string');
    
    // Ensure no secret or internal variables are exposed
    expect(response.body).not.toHaveProperty('env');
    expect(response.body).not.toHaveProperty('config');
    expect(response.body).not.toHaveProperty('MONGODB_URI');
    expect(response.body).not.toHaveProperty('GEMINI_API_KEY');
  });
});

describe('GET /', () => {
  it('should return 200 OK and welcome payload with apiVersion and health route', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'Welcome to CareerAI API');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual({
      health: '/api/v1/health',
      apiVersion: 'v1',
    });
    expect(response.body).toHaveProperty('timestamp');
  });
});
