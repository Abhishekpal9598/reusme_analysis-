import { apiClient } from './api.js';

export const analysisService = {
  /**
   * Trigger Google Gemini AI resume quality audit
   * @param {string} resumeId
   */
  async analyzeResume(resumeId) {
    const response = await apiClient.post(`/resumes/${resumeId}/analyze`);
    return response.data;
  },

  /**
   * Fetch audit history for a specific resume
   * @param {string} resumeId
   */
  async getResumeAnalyses(resumeId) {
    const response = await apiClient.get(`/resumes/${resumeId}/analyses`);
    return response.data;
  },

  /**
   * Fetch single analysis report by ID
   * @param {string} analysisId
   */
  async getAnalysis(analysisId) {
    const response = await apiClient.get(`/analyses/${analysisId}`);
    return response.data;
  },

  /**
   * List all recent analyses for the authenticated user
   */
  async listAllAnalyses() {
    const response = await apiClient.get('/analyses');
    return response.data;
  },
};

export const auditService = analysisService;
export default analysisService;


