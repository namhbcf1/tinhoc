// ========================================
// STUDENT METHODS MIXIN
// Student login, register, CRUD operations
// ========================================

export function applyStudentMethods(ApiClient) {
  // Login as student using CCCD + phone number
  ApiClient.prototype.loginStudent = async function(cccd, sdt) {
    const response = await this.request('/students/login', {
      method: 'POST',
      body: JSON.stringify({ cccd, sdt }),
    });

    if (response.token) {
      this.setToken(response.token, 'student');
    }
    // Normalize CCCD key(s) used across the app
    if (cccd) {
      localStorage.setItem('studentCCCD', cccd);
      localStorage.setItem('student_cccd', cccd);
    }

    return response;
  };

  // Register a new student account
  ApiClient.prototype.registerStudent = async function(data) {
    const response = await this.request('/students/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.token) {
      this.setToken(response.token, 'student');
    }
    // Normalize CCCD key(s) used across the app
    const cccd = data?.cccd || response?.data?.cccd || response?.data?.student?.cccd;
    if (cccd) {
      localStorage.setItem('studentCCCD', cccd);
      localStorage.setItem('student_cccd', cccd);
    }

    return response;
  };

  // Get paginated list of all students (admin)
  ApiClient.prototype.getStudents = async function(limit = 100, offset = 0) {
    return this.request(`/students?limit=${limit}&offset=${offset}`);
  };

  // Search students by keyword
  ApiClient.prototype.searchStudents = async function(keyword) {
    return this.request(`/students/search?q=${encodeURIComponent(keyword)}`);
  };

  // Get student by CCCD number
  ApiClient.prototype.getStudentByCCCD = async function(cccd) {
    return this.request(`/students/${cccd}`);
  };

  // Update student by numeric ID
  ApiClient.prototype.updateStudent = async function(id, data) {
    return this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Update student profile using CCCD
  ApiClient.prototype.updateStudentByCCCD = async function(cccd, data) {
    return this.request('/students/update-by-cccd', {
      method: 'PUT',
      body: JSON.stringify({ cccd, ...data }),
    });
  };

  // Get edit history for a student
  ApiClient.prototype.getStudentEditHistory = async function(studentId, limit = 100, offset = 0) {
    return this.request(`/students/${studentId}/history?limit=${limit}&offset=${offset}`);
  };

  // Create student via admin endpoint
  ApiClient.prototype.createStudentAdmin = async function(data) {
    return this.request('/students/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Delete a student record
  ApiClient.prototype.deleteStudent = async function(id) {
    return this.request(`/students/${id}`, {
      method: 'DELETE',
    });
  };
}
