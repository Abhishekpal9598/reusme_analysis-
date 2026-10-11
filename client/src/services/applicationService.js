import apiClient from './api';

export const applicationService = {
  /**
   * List applications with optional query params (q, status, sortBy, sortOrder, page, limit)
   */
  async listApplications(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    const endpoint = `/applications${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(endpoint);
    return response;
  },

  /**
   * Fetch pipeline analytics and upcoming alerts
   */
  async getAnalytics() {
    const response = await apiClient.get('/applications/analytics');
    return response.data || response;
  },

  /**
   * Get single application by ID
   */
  async getApplication(id) {
    const response = await apiClient.get(`/applications/${id}`);
    return response.data || response;
  },

  /**
   * Create a new job application
   */
  async createApplication(data) {
    const response = await apiClient.post('/applications', data);
    return response.data || response;
  },

  /**
   * Update an existing job application
   */
  async updateApplication(id, data) {
    const response = await apiClient.put(`/applications/${id}`, data);
    return response.data || response;
  },

  /**
   * Update application status (fast status transition)
   */
  async updateStatus(id, status) {
    const response = await apiClient.patch(`/applications/${id}/status`, { status });
    return response.data || response;
  },

  /**
   * Delete an application
   */
  async deleteApplication(id) {
    const response = await apiClient.delete(`/applications/${id}`);
    return response.data || response;
  },

  // ----------------------------------------------------
  // SUBDOCUMENT: INTERVIEW ROUNDS
  // ----------------------------------------------------
  async addInterview(id, interviewData) {
    const response = await apiClient.post(`/applications/${id}/interviews`, interviewData);
    return response.data || response;
  },

  async updateInterview(id, interviewId, interviewData) {
    const response = await apiClient.patch(
      `/applications/${id}/interviews/${interviewId}`,
      interviewData
    );
    return response.data || response;
  },

  async deleteInterview(id, interviewId) {
    const response = await apiClient.delete(`/applications/${id}/interviews/${interviewId}`);
    return response.data || response;
  },

  // ----------------------------------------------------
  // SUBDOCUMENT: IN-APP REMINDERS
  // ----------------------------------------------------
  async addReminder(id, reminderData) {
    const response = await apiClient.post(`/applications/${id}/reminders`, reminderData);
    return response.data || response;
  },

  async toggleReminder(id, reminderId) {
    const response = await apiClient.patch(`/applications/${id}/reminders/${reminderId}/toggle`, {});
    return response.data || response;
  },

  async deleteReminder(id, reminderId) {
    const response = await apiClient.delete(`/applications/${id}/reminders/${reminderId}`);
    return response.data || response;
  },

  // ----------------------------------------------------
  // SUBDOCUMENT: TIMELINE NOTES
  // ----------------------------------------------------
  async addNote(id, content) {
    const response = await apiClient.post(`/applications/${id}/notes`, { content });
    return response.data || response;
  },

  async deleteNote(id, noteId) {
    const response = await apiClient.delete(`/applications/${id}/notes/${noteId}`);
    return response.data || response;
  },
};

export default applicationService;
