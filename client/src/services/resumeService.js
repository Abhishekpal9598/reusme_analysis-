import { apiClient } from './api.js';

export const resumeService = {
  /**
   * Upload and parse a resume file
   */
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient('/resumes', {
      method: 'POST',
      body: formData,
    });
    return res.data.resume;
  },

  /**
   * List authenticated user's resumes
   */
  async listResumes(page = 1, limit = 20) {
    const res = await apiClient(`/resumes?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
    return {
      resumes: res.data.resumes,
      meta: res.meta,
    };
  },

  /**
   * Get specific resume details including extracted text
   */
  async getResume(id) {
    const res = await apiClient(`/resumes/${id}`, {
      method: 'GET',
    });
    return res.data.resume;
  },

  /**
   * Delete resume
   */
  async deleteResume(id) {
    const res = await apiClient(`/resumes/${id}`, {
      method: 'DELETE',
    });
    return res;
  },
};

export default resumeService;
