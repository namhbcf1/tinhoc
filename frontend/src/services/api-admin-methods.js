// ========================================
// ADMIN MANAGEMENT METHODS MIXIN
// Admin CRUD + activity logs
// ========================================

export function applyAdminMethods(ApiClient) {
  // Get paginated list of admins
  ApiClient.prototype.getAdmins = async function(limit = 100, offset = 0) {
    return this.request(`/admins?limit=${limit}&offset=${offset}`);
  };

  // Get a single admin by ID
  ApiClient.prototype.getAdminById = async function(id) {
    return this.request(`/admins/${id}`);
  };

  // Create a new admin account
  ApiClient.prototype.createAdmin = async function(data) {
    return this.request('/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Update an existing admin account
  ApiClient.prototype.updateAdmin = async function(id, data) {
    return this.request(`/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Delete an admin account
  ApiClient.prototype.deleteAdmin = async function(id) {
    return this.request(`/admins/${id}`, {
      method: 'DELETE',
    });
  };

  // Get activity logs, optionally filtered by admin ID
  ApiClient.prototype.getActivityLogs = async function(adminId = null, limit = 100, offset = 0) {
    const url = adminId
      ? `/activity-logs?admin_id=${adminId}&limit=${limit}&offset=${offset}`
      : `/activity-logs?limit=${limit}&offset=${offset}`;
    return this.request(url);
  };
}
