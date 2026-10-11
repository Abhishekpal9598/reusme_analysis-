import { apiClient } from './api.js';

export const interviewService = {
  /**
   * Create an interview session and generate questions using Gemini
   * @param {Object} payload - { jobRole, experienceLevel, category, difficulty, questionCount, resumeId }
   */
  async createSession(payload) {
    const response = await apiClient.post('/interviews', payload);
    return response.data;
  },

  /**
   * Get all interview sessions for logged-in user
   */
  async listSessions() {
    const response = await apiClient.get('/interviews');
    return response.data;
  },

  /**
   * Get interview session by ID (including questions and evaluations)
   * @param {string} id
   */
  async getSession(id) {
    const response = await apiClient.get(`/interviews/${id}`);
    return response.data;
  },

  /**
   * Evaluate candidate's answer for a specific question
   * @param {string} sessionId
   * @param {Object} payload - { questionId, userAnswer }
   */
  async evaluateAnswer(sessionId, payload) {
    const response = await apiClient.post(`/interviews/${sessionId}/evaluate`, payload);
    return response.data;
  },

  /**
   * Complete interview session and generate final performance report
   * @param {string} sessionId
   */
  async completeSession(sessionId) {
    const response = await apiClient.post(`/interviews/${sessionId}/complete`);
    return response.data;
  },

  /**
   * Delete interview session
   * @param {string} id
   */
  async deleteSession(id) {
    const response = await apiClient.delete(`/interviews/${id}`);
    return response.data;
  },
};

export default interviewService;
