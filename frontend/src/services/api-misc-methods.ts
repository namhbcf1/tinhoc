// ========================================
// MISC METHODS MIXIN
// Homepage settings, notifications, reports, AI query
// ========================================

export function applyMiscMethods(ApiClient) {
  ApiClient.prototype.downloadAssignmentSubmission = async function(submissionId, fileName = `submission-${submissionId}`) {
    const token = this.getToken('admin');
    const response = await fetch(`${this.baseURL}/assignments/submissions/${submissionId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Lỗi tải file bài nộp');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  // ---- Homepage Settings ----

  // Get all homepage settings
  ApiClient.prototype.getHomepageSettings = async function() {
    return this.cachedRequest('/homepage/settings', {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Get a single homepage setting by key
  ApiClient.prototype.getHomepageSetting = async function(key) {
    return this.cachedRequest(`/homepage/settings/${key}`, {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Bulk update homepage settings
  ApiClient.prototype.updateHomepageSettings = async function(settings) {
    const response = await this.request('/homepage/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
    this.invalidateCache(['/homepage/settings']);
    return response;
  };

  // Update a single homepage setting by key
  ApiClient.prototype.setHomepageSetting = async function(key, value) {
    const response = await this.request(`/homepage/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
    this.invalidateCache(['/homepage/settings']);
    return response;
  };

  // ---- Notifications ----

  // Get notifications with optional filters
  ApiClient.prototype.getNotifications = async function(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications?${query}`);
  };

  // Get total unread notification count
  ApiClient.prototype.getUnreadNotificationCount = async function() {
    return this.request('/notifications/unread-count');
  };

  // Mark a specific notification as read
  ApiClient.prototype.markNotificationAsRead = async function(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  };

  // Mark all notifications as read
  ApiClient.prototype.markAllNotificationsAsRead = async function() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  };

  // Create a new notification (admin broadcast)
  ApiClient.prototype.createNotification = async function(data) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Delete a notification
  ApiClient.prototype.deleteNotification = async function(notificationId) {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  };

  // ---- Reports ----

  // Get payment reports for a year, optionally filtered by month
  ApiClient.prototype.getPaymentReports = async function(year, month = null) {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.append('month', String(month));
    return this.cachedRequest(
      `/reports/payments?${params.toString()}`,
      {},
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Get registration reports grouped by month or other dimension
  ApiClient.prototype.getRegistrationReports = async function(year, groupBy = 'month') {
    const params = new URLSearchParams({
      year: String(year),
      group_by: groupBy,
    });
    return this.cachedRequest(
      `/reports/registrations?${params.toString()}`,
      {},
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Get certificate reports grouped by month or other dimension
  ApiClient.prototype.getCertificateReports = async function(year, groupBy = 'month') {
    const params = new URLSearchParams({
      year: String(year),
      group_by: groupBy,
    });
    return this.cachedRequest(
      `/reports/certificates?${params.toString()}`,
      {},
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Get student count per class report, optionally filtered by class
  ApiClient.prototype.getStudentsByClassReport = async function(classId = null) {
    const params = classId ? `?class_id=${classId}` : '';
    return this.cachedRequest(
      `/reports/students-by-class${params}`,
      {},
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Get summary report for a year
  ApiClient.prototype.getReportSummary = async function(year) {
    return this.cachedRequest(`/reports/summary?year=${year}`, {}, { ttlMs: 5 * 60 * 1000 });
  };

  // ---- AI ----

  // Send a message to the AI assistant (student role)
  ApiClient.prototype.queryAI = async function(message) {
    return this.request('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ message }),
      tokenType: 'student',
    });
  };
}
