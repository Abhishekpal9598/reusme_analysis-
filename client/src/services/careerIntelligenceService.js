import apiClient, { ApiError } from './api';

export const careerIntelligenceService = {
  /**
   * Fetch user's career profile (returns cold-start structure if profile not yet generated)
   */
  async getCareerIntelligence() {
    const response = await apiClient.get('/career-intelligence');
    return response.data || response;
  },

  /**
   * Generate initial or refreshed career profile
   */
  async generateCareerIntelligence() {
    const response = await apiClient.post('/career-intelligence/generate', {});
    return response.data || response;
  },

  /**
   * Force regenerate career profile (subject to 30-second cooldown)
   */
  async regenerateCareerIntelligence() {
    const response = await apiClient.post('/career-intelligence/regenerate', {});
    return response.data || response;
  },

  /**
   * Update user target preferences
   * @param {Object} preferences - { desiredRole, targetLevel, preferredIndustry }
   */
  async updateCareerPreferences(preferences) {
    const response = await apiClient.patch('/career-intelligence/preferences', preferences);
    return response.data || response;
  },

  /**
   * Toggle roadmap milestone completed status
   * @param {string} milestoneId
   * @param {boolean} [completed] - Optional explicit boolean status
   */
  async toggleRoadmapMilestone(milestoneId, completed) {
    const body = completed !== undefined ? { completed } : {};
    const response = await apiClient.patch(`/career-intelligence/milestones/${milestoneId}`, body);
    return response.data || response;
  },
};

export default careerIntelligenceService;
