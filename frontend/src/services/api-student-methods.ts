import { getStorageScope, setStorageValue } from '../utils/browser-storage.js';

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
      const scope = getStorageScope('student_cccd') ?? getStorageScope('studentCCCD') ?? 'local';
      setStorageValue('studentCCCD', cccd, scope);
      setStorageValue('student_cccd', cccd, scope);
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
      const scope = getStorageScope('student_cccd') ?? getStorageScope('studentCCCD') ?? 'local';
      setStorageValue('studentCCCD', cccd, scope);
      setStorageValue('student_cccd', cccd, scope);
    }

    return response;
  };

  // Extract OCR fields from uploaded CCCD image for registration prefill
  ApiClient.prototype.extractCCCDRegistrationFields = async function(imageId, type) {
    return this.request('/cccd-upload/extract', {
      method: 'POST',
      body: JSON.stringify({ imageId, type }),
    });
  };

  // Get paginated list of all students (admin)
  ApiClient.prototype.getStudents = async function(limit = 100, offset = 0) {
    return this.cachedRequest(
      `/students?limit=${limit}&offset=${offset}`,
      {},
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Search students by keyword
  ApiClient.prototype.searchStudents = async function(keyword) {
    return this.request(`/students/search?q=${encodeURIComponent(keyword)}`);
  };

  // Get student by CCCD number
  // Use role token from current context (admin/student) unless caller overrides.
  ApiClient.prototype.getStudentByCCCD = async function(cccd, options = {}) {
    return this.request(`/students/${cccd}`, options);
  };

  // Update student by numeric ID
  ApiClient.prototype.updateStudent = async function(id, data) {
    const response = await this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/students', '/reports/summary', '/reports/registrations']);
    return response;
  };

  // Update student profile using CCCD
  ApiClient.prototype.updateStudentByCCCD = async function(cccd, data) {
    const response = await this.request('/students/update-by-cccd', {
      method: 'PUT',
      body: JSON.stringify({ current_cccd: cccd, ...data }),
    });
    const nextCCCD = response?.data?.cccd || data?.cccd || cccd;
    if (response?.token) {
      this.setToken(response.token, 'student');
    }
    if (nextCCCD) {
      const scope = getStorageScope('student_cccd') ?? getStorageScope('studentCCCD') ?? 'local';
      setStorageValue('studentCCCD', nextCCCD, scope);
      setStorageValue('student_cccd', nextCCCD, scope);
    }
    this.invalidateCache(['/students']);
    return response;
  };

  // Get edit history for a student
  ApiClient.prototype.getStudentEditHistory = async function(studentId, limit = 100, offset = 0) {
    return this.request(`/students/${studentId}/history?limit=${limit}&offset=${offset}`);
  };

  // Create student via admin endpoint
  ApiClient.prototype.createStudentAdmin = async function(data) {
    const response = await this.request('/students/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/students', '/reports/summary', '/reports/registrations']);
    return response;
  };

  // Delete a student record
  ApiClient.prototype.deleteStudent = async function(id) {
    const response = await this.request(`/students/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache(['/students', '/reports/summary', '/reports/registrations']);
    return response;
  };
}
