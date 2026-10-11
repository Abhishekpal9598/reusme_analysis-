import { apiClient } from './api.js';

export const authService = {
  /**
   * Register a new user
   */
  async register({ fullName, email, password }) {
    const res = await apiClient('/auth/register', {
      method: 'POST',
      body: { fullName, email, password },
    });
    return res.data.user;
  },

  /**
   * Log in existing user
   */
  async login({ email, password }) {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return res.data.user;
  },

  /**
   * Log out user and clear cookie
   */
  async logout() {
    const res = await apiClient('/auth/logout', {
      method: 'POST',
    });
    return res;
  },

  /**
   * Fetch currently authenticated user from HttpOnly cookie session
   */
  async getMe() {
    const res = await apiClient('/auth/me', {
      method: 'GET',
    });
    return res.data.user;
  },
};

export default authService;
