// ========================================
// TEACHER METHODS MIXIN
// Teacher is now admin with role='teacher'. No separate teacher auth.
// Self-service methods (my-classes, schedule, exams) use admin token.
// Admin CRUD methods (getAllTeachers, create, update, delete) also use admin token.
// ========================================

export function applyTeacherMethods(ApiClient) {
  // ---- REMOVED: loginTeacher, getTeacherProfile, updateTeacherProfile, changeTeacherPassword ----
  // Teacher now logs in via admin login (/auth/login)

  // Get classes assigned to the current teacher (admin with role='teacher')
  ApiClient.prototype.getTeacherClasses = async function() {
    return this.request('/teachers/my-classes', { tokenType: 'admin' });
  };

  // Get teacher's weekly schedule
  ApiClient.prototype.getTeacherSchedule = async function(weekStart) {
    const url = weekStart
      ? `/teachers/my-schedule?week_start=${weekStart}`
      : '/teachers/my-schedule';
    return this.request(url, { tokenType: 'admin' });
  };

  // Get exams assigned to the current teacher
  ApiClient.prototype.getTeacherExams = async function() {
    return this.request('/teachers/my-exams', { tokenType: 'admin' });
  };

  // ---- Admin CRUD for teachers (creates admins with role='teacher') ----

  // Get all teachers with pagination (admin)
  ApiClient.prototype.getAllTeachers = async function(limit = 100, offset = 0) {
    return this.request(`/teachers?limit=${limit}&offset=${offset}`, { tokenType: 'admin' });
  };

  // Search teachers by keyword
  ApiClient.prototype.searchTeachers = async function(keyword) {
    return this.request(`/teachers?keyword=${encodeURIComponent(keyword)}`, { tokenType: 'admin' });
  };

  // Create a new teacher account (creates admin with role='teacher')
  ApiClient.prototype.createTeacher = async function(data) {
    return this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
      tokenType: 'admin',
    });
  };

  // Update a teacher account
  ApiClient.prototype.updateTeacher = async function(id, data) {
    return this.request(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      tokenType: 'admin',
    });
  };

  // Delete a teacher account (soft delete — sets status='inactive')
  ApiClient.prototype.deleteTeacher = async function(id) {
    return this.request(`/teachers/${id}`, {
      method: 'DELETE',
      tokenType: 'admin',
    });
  };
}
