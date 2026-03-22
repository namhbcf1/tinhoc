// ========================================
// ATTENDANCE METHODS MIXIN
// Mark attendance, batch attendance, query by registration/class
// ========================================

export function applyAttendanceMethods(ApiClient) {
  // Mark attendance for a single student
  ApiClient.prototype.markAttendance = async function(data) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Mark attendance for multiple students at once
  ApiClient.prototype.markAttendanceBatch = async function(records, tokenType = null) {
    return this.request('/attendance/batch', {
      method: 'POST',
      body: JSON.stringify({ records }),
      retries: 1, // Retry once on network errors
      tokenType: tokenType || this.getCurrentRole(), // Auto-detect or use provided
    });
  };

  // Get attendance records for a specific registration
  ApiClient.prototype.getAttendanceByRegistration = async function(registrationId) {
    return this.request(`/attendance/registration/${registrationId}`);
  };

  // Get attendance records for a class on a specific date (optional)
  ApiClient.prototype.getAttendanceByClass = async function(classId, date = null, tokenType = null) {
    const url = date
      ? `/attendance/class/${classId}?date=${date}`
      : `/attendance/class/${classId}`;
    return this.request(url, {
      tokenType: tokenType || this.getCurrentRole(), // Auto-detect or use provided
    });
  };
}
