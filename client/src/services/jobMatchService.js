import { apiClient } from './api.js';

export const jobMatchService = {
  /**
   * Run AI Job Description Match Analysis
   * @param {Object} payload - { resumeId, jobTitle, companyName, jobDescription }
   */
  async createJobMatch(payload) {
    const response = await apiClient.post('/job-matches', payload);
    return response.data;
  },

  /**
   * List all previous job match reports for authenticated user
   */
  async listJobMatches() {
    const response = await apiClient.get('/job-matches');
    return response.data;
  },

  /**
   * Get single detailed job match report by ID
   * @param {string} id
   */
  async getJobMatch(id) {
    const response = await apiClient.get(`/job-matches/${id}`);
    return response.data;
  },

  /**
   * Delete job match report
   * @param {string} id
   */
  async deleteJobMatch(id) {
    const response = await apiClient.delete(`/job-matches/${id}`);
    return response.data;
  },
};

export default jobMatchService;
