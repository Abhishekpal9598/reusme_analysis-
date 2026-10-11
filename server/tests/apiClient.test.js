import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '../../client/src/services/api.js';

describe('Client apiClient Unit Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should have get, post, put, patch, delete methods attached as functions', () => {
    expect(typeof apiClient).toBe('function');
    expect(typeof apiClient.get).toBe('function');
    expect(typeof apiClient.post).toBe('function');
    expect(typeof apiClient.put).toBe('function');
    expect(typeof apiClient.patch).toBe('function');
    expect(typeof apiClient.delete).toBe('function');
  });

  it('apiClient.get should call fetch with GET method and credentials: include', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { items: [1, 2, 3] } }),
    });

    const result = await apiClient.get('/test-endpoint');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/v1/test-endpoint');
    expect(config.method).toBe('GET');
    expect(config.credentials).toBe('include');
    expect(result).toEqual({ success: true, data: { items: [1, 2, 3] } });
  });

  it('apiClient.post should serialize JSON body and set Content-Type header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'created-123' } }),
    });

    const payload = { resumeId: 'abc-123', jobTitle: 'Software Engineer' };
    const result = await apiClient.post('/job-matches', payload);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/v1/job-matches');
    expect(config.method).toBe('POST');
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.body).toBe(JSON.stringify(payload));
    expect(config.credentials).toBe('include');
    expect(result.data.id).toBe('created-123');
  });

  it('apiClient.put should send PUT request with serialized body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Updated' }),
    });

    const payload = { active: true };
    const result = await apiClient.put('/resumes/123', payload);

    const [url, config] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/v1/resumes/123');
    expect(config.method).toBe('PUT');
    expect(config.body).toBe(JSON.stringify(payload));
    expect(result.message).toBe('Updated');
  });

  it('apiClient.delete should send DELETE request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Deleted' }),
    });

    const result = await apiClient.delete('/job-matches/test-id');

    const [url, config] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/v1/job-matches/test-id');
    expect(config.method).toBe('DELETE');
    expect(config.credentials).toBe('include');
    expect(result.message).toBe('Deleted');
  });

  it('direct invocation apiClient(endpoint, options) should work for backward compatibility', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { user: { id: 'u1' } } }),
    });

    const result = await apiClient('/auth/me', { method: 'GET' });

    const [url, config] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('/api/v1/auth/me');
    expect(config.method).toBe('GET');
    expect(result.data.user.id).toBe('u1');
  });

  it('should throw ApiError with status and code when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        error: {
          code: 'RESUME_NOT_FOUND',
          message: 'The requested resume was not found.',
        },
      }),
    });

    await expect(apiClient.get('/resumes/invalid-id')).rejects.toThrow(ApiError);

    try {
      await apiClient.get('/resumes/invalid-id');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
      expect(err.code).toBe('RESUME_NOT_FOUND');
      expect(err.message).toBe('The requested resume was not found.');
    }
  });

  it('should throw ApiError with NETWORK_ERROR on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    await expect(apiClient.get('/health')).rejects.toThrow(ApiError);

    try {
      await apiClient.get('/health');
    } catch (err) {
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.status).toBe(0);
      expect(err.message).toContain('Unable to connect');
    }
  });
});
