// ========================================
// TEACHER METHODS MIXIN
// Teacher login, profile, schedule, admin CRUD for teachers
// ========================================

export function applyTeacherMethods(ApiClient) {
  // Login as teacher using teacher_code + password (uses raw fetch, not request())
  ApiClient.prototype.loginTeacher = async function(teacher_code, password) {
    const response = await fetch(`${this.baseURL}/teachers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_code, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      const err = new Error(error.error || 'Đăng nhập thất bại');
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    if (data.success && data.token) {
      this.setToken(data.token, 'teacher');
    }
    return data;
  };

  // Get teacher's own profile
  ApiClient.prototype.getTeacherProfile = async function() {
    return this.request('/teachers/profile', { tokenType: 'teacher' });
  };

  // Update teacher's own profile
  ApiClient.prototype.updateTeacherProfile = async function(data) {
    return this.request('/teachers/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      tokenType: 'teacher',
    });
  };

  // Change teacher's own password
  ApiClient.prototype.changeTeacherPassword = async function(oldPassword, newPassword) {
    return this.request('/teachers/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      tokenType: 'teacher',
    });
  };

  // Get classes assigned to the current teacher
  ApiClient.prototype.getTeacherClasses = async function() {
    return this.request('/teachers/my-classes', { tokenType: 'teacher' });
  };

  // Get teacher's weekly schedule, optionally from a specific week start date
  ApiClient.prototype.getTeacherSchedule = async function(weekStart) {
    const url = weekStart
      ? `/teachers/my-schedule?week_start=${weekStart}`
      : '/teachers/my-schedule';
    return this.request(url, { tokenType: 'teacher' });
  };

  // Get exams assigned to the current teacher
  ApiClient.prototype.getTeacherExams = async function() {
    return this.request('/teachers/my-exams', { tokenType: 'teacher' });
  };

  // Get all teachers with pagination (admin)
  ApiClient.prototype.getAllTeachers = async function(limit = 100, offset = 0) {
    return this.request(`/teachers?limit=${limit}&offset=${offset}`, { tokenType: 'admin' });
  };

  // Search teachers by keyword
  ApiClient.prototype.searchTeachers = async function(keyword) {
    return this.request(`/teachers?keyword=${encodeURIComponent(keyword)}`);
  };

  // Create a new teacher account
  ApiClient.prototype.createTeacher = async function(data) {
    return this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Update a teacher account
  ApiClient.prototype.updateTeacher = async function(id, data) {
    return this.request(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Delete a teacher account
  ApiClient.prototype.deleteTeacher = async function(id) {
    return this.request(`/teachers/${id}`, {
      method: 'DELETE',
    });
  };
}
