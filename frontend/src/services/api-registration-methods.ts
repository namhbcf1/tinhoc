// @ts-nocheck
// ========================================
// REGISTRATION METHODS MIXIN
// Class registrations + online class enrollments
// ========================================

export function applyRegistrationMethods(ApiClient) {
  // Register student for an offline class
  ApiClient.prototype.registerForClass = async function(cccd, class_id) {
    return this.request('/registrations', {
      method: 'POST',
      body: JSON.stringify({ cccd, class_id }),
    });
  };

  // Get all registrations for a specific class
  ApiClient.prototype.getRegistrationsByClass = async function(classId) {
    return this.request(`/registrations/class/${classId}`);
  };

  // Get all registrations for a student by CCCD
  ApiClient.prototype.getStudentRegistrations = async function(studentCCCD) {
    return this.request(`/registrations?student_cccd=${studentCCCD}`);
  };

  // Get enrollments for an online class
  ApiClient.prototype.getOnlineClassEnrollments = async function(classId) {
    return this.request(`/online-classes/${classId}/enrollments`);
  };

  // Remove a student from an online class (admin only)
  ApiClient.prototype.removeStudentFromOnlineClass = async function(classId, studentId) {
    return this.request(`/online-classes/${classId}/students/${studentId}`, {
      method: 'DELETE',
      tokenType: 'admin',
    });
  };

  // Get pending enrollments for online class (admin only)
  ApiClient.prototype.getPendingEnrollments = async function(classId) {
    return this.request(`/online-classes/${classId}/pending-enrollments`, {
      tokenType: 'admin',
    });
  };

  // Approve an enrollment (admin only)
  ApiClient.prototype.approveEnrollment = async function(classId, enrollmentId) {
    return this.request(`/online-classes/${classId}/enrollments/${enrollmentId}/approve`, {
      method: 'PUT',
      tokenType: 'admin',
    });
  };

  // Reject an enrollment with optional reason (admin only)
  ApiClient.prototype.rejectEnrollment = async function(classId, enrollmentId, reason = null) {
    return this.request(`/online-classes/${classId}/enrollments/${enrollmentId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
      tokenType: 'admin',
    });
  };

  // Update the status of a registration
  ApiClient.prototype.updateRegistrationStatus = async function(id, status) {
    // Lưu ý: payment_status đã được tách ra bảng payments riêng
    // Chỉ update status của registration
    return this.request(`/registrations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  };

  // Update exam slot number (so phach) for a registration
  ApiClient.prototype.updateSoPhach = async function(id, so_phach) {
    return this.request(`/registrations/${id}/so-phach`, {
      method: 'PUT',
      body: JSON.stringify({ so_phach }),
    });
  };

  // Delete a registration record
  ApiClient.prototype.deleteRegistration = async function(id) {
    return this.request(`/registrations/${id}`, {
      method: 'DELETE',
    });
  };
}
