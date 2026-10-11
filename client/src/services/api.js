/**
 * Centralized API client utilizing native fetch with credentials: 'include'
 */

const BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(message, status, code, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const apiClient = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = { ...options.headers };
  let body = options.body;

  // Set Content-Type JSON only if body is not FormData
  if (!(body instanceof FormData)) {
    if (body !== undefined && body !== null) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      if (typeof body === 'object') {
        body = JSON.stringify(body);
      }
    } else if (['POST', 'PUT', 'PATCH'].includes((options.method || '').toUpperCase())) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const config = {
    ...options,
    headers,
    body,
    credentials: 'include', // Mandate HttpOnly cookie inclusion
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError(
      'Unable to connect to CareerAI backend service. Please ensure the server is running.',
      0,
      'NETWORK_ERROR'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    const errorMessage = data?.error?.message || response.statusText || 'An unexpected error occurred';
    const errorDetails = data?.error?.details || [];
    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  return data;
};

// Convenience HTTP method helpers attached directly to apiClient
apiClient.get = (endpoint, options = {}) =>
  apiClient(endpoint, { ...options, method: 'GET' });

apiClient.post = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'POST', body });

apiClient.put = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'PUT', body });

apiClient.patch = (endpoint, body, options = {}) =>
  apiClient(endpoint, { ...options, method: 'PATCH', body });

apiClient.delete = (endpoint, options = {}) =>
  apiClient(endpoint, { ...options, method: 'DELETE' });

export default apiClient;

