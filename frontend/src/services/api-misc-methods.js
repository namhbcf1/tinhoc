// ========================================
// MISC METHODS MIXIN
// Homepage settings, notifications, reports, AI query
// ========================================

export function applyMiscMethods(ApiClient) {
  // ---- Homepage Settings ----

  // Get all homepage settings
  ApiClient.prototype.getHomepageSettings = async function() {
    return this.request('/homepage/settings');
  };

  // Get a single homepage setting by key
  ApiClient.prototype.getHomepageSetting = async function(key) {
    return this.request(`/homepage/settings/${key}`);
  };

  // Bulk update homepage settings
  ApiClient.prototype.updateHomepageSettings = async function(settings) {
    return this.request('/homepage/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  };

  // Update a single homepage setting by key
  ApiClient.prototype.setHomepageSetting = async function(key, value) {
    return this.request(`/homepage/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
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
    return this.request(`/reports/payments?${params.toString()}`);
  };

  // Get registration reports grouped by month or other dimension
  ApiClient.prototype.getRegistrationReports = async function(year, groupBy = 'month') {
    const params = new URLSearchParams({
      year: String(year),
      group_by: groupBy,
    });
    return this.request(`/reports/registrations?${params.toString()}`);
  };

  // Get certificate reports grouped by month or other dimension
  ApiClient.prototype.getCertificateReports = async function(year, groupBy = 'month') {
    const params = new URLSearchParams({
      year: String(year),
      group_by: groupBy,
    });
    return this.request(`/reports/certificates?${params.toString()}`);
  };

  // Get student count per class report, optionally filtered by class
  ApiClient.prototype.getStudentsByClassReport = async function(classId = null) {
    const params = classId ? `?class_id=${classId}` : '';
    return this.request(`/reports/students-by-class${params}`);
  };

  // Get summary report for a year
  ApiClient.prototype.getReportSummary = async function(year) {
    return this.request(`/reports/summary?year=${year}`);
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
