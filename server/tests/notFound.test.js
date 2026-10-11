import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('404 Not Found Handling', () => {
  it('should return structured 404 error for unknown routes', async () => {
    const response = await request(app).get('/api/v1/unknown-resource-path');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    expect(response.body.error.message).toContain('Cannot GET /api/v1/unknown-resource-path');
  });
});
