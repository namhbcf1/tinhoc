// @ts-nocheck
// ========================================
// CLASS METHODS MIXIN
// Offline classes CRUD + online classes + class videos
// ========================================

export function applyClassMethods(ApiClient) {
  // Get all offline classes
  ApiClient.prototype.getClasses = async function() {
    return this.cachedRequest('/classes', {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Get open/public classes (no auth required)
  ApiClient.prototype.getOpenClasses = async function() {
    return this.cachedRequest('/classes/open', {}, { ttlMs: 5 * 60 * 1000 });
  };

  // Get single class by ID (fetches full list and filters locally to avoid 404 spam)
  ApiClient.prototype.getClass = async function(id) {
    const listResp = await this.cachedRequest('/classes', {}, { ttlMs: 5 * 60 * 1000 });
    if (listResp?.success && Array.isArray(listResp.data)) {
      const found = listResp.data.find(
        (c) => String(c.id) === String(id) || String(c.class_id) === String(id)
      );
      if (found) {
        return { success: true, data: found };
      }
    }
    return {
      success: false,
      data: null,
      error: 'Không tìm thấy lớp',
    };
  };

  // Create a new offline class
  ApiClient.prototype.createClass = async function(data) {
    const response = await this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/classes', '/reports/summary', '/reports/students-by-class']);
    return response;
  };

  // Update an offline class
  ApiClient.prototype.updateClass = async function(id, data) {
    const response = await this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.invalidateCache(['/classes', '/reports/summary', '/reports/students-by-class']);
    return response;
  };

  // Delete an offline class
  ApiClient.prototype.deleteClass = async function(id) {
    const response = await this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache(['/classes', '/reports/summary', '/reports/students-by-class']);
    return response;
  };

  // ---- Online Classes ----

  // Get all online classes (admin)
  ApiClient.prototype.getOnlineClasses = async function(limit = 100, offset = 0) {
    return this.request(`/online-classes?limit=${limit}&offset=${offset}`, {
      tokenType: 'admin',
    });
  };

  // Get single online class by ID
  ApiClient.prototype.getOnlineClass = async function(id) {
    return this.request(`/online-classes/${id}`, {
      tokenType: 'admin',
    });
  };

  // Get online classes visible to the current student
  ApiClient.prototype.getStudentOnlineClasses = async function(params = {}, studentCCCD = null) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });

    const endpoint = `/online-classes${query.toString() ? `?${query.toString()}` : ''}`;
    return this.cachedRequest(
      endpoint,
      {
        tokenType: 'student',
        headers: studentCCCD ? { 'X-Student-CCCD': studentCCCD } : {},
      },
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Get student-specific join status for an online class
  ApiClient.prototype.getStudentOnlineClassStatus = async function(id, studentCCCD = null) {
    return this.request(`/online-classes/${id}/my-status`, {
      tokenType: 'student',
      headers: studentCCCD ? { 'X-Student-CCCD': studentCCCD } : {},
    });
  };

  // Get student-facing detail for an online class
  ApiClient.prototype.getStudentOnlineClassDetail = async function(id, studentCCCD = null) {
    return this.cachedRequest(
      `/online-classes/${id}`,
      {
        tokenType: 'student',
        headers: studentCCCD ? { 'X-Student-CCCD': studentCCCD } : {},
      },
      { ttlMs: 5 * 60 * 1000 }
    );
  };

  // Student self-enrollment for an online class
  ApiClient.prototype.enrollInOnlineClass = async function(id, studentCCCD = null) {
    const response = await this.request(`/online-classes/${id}/enroll`, {
      method: 'POST',
      tokenType: 'student',
      headers: studentCCCD ? { 'X-Student-CCCD': studentCCCD } : {},
    });
    this.invalidateCache(['/online-classes']);
    return response;
  };


  // Get available students for a class (not registered yet)
  ApiClient.prototype.getAvailableStudents = async function(classId, keyword = '') {
    const query = keyword ? `?q=${encodeURIComponent(keyword)}` : '';
    return this.request(`/online-classes/${classId}/available-students${query}`);
  };

  // Add student to online class (admin action)
  ApiClient.prototype.addStudentToClass = async function(classId, studentId) {
    return this.request(`/online-classes/${classId}/students`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId }),
    });
  };

  // ---- Class Videos ----

  // Get videos for a class (student view)
  ApiClient.prototype.getClassVideos = async function(classId) {
    return this.request(`/classes/${classId}/videos`, {
      method: 'GET',
      tokenType: 'student',
    });
  };

  // Record that student played a video
  ApiClient.prototype.playVideo = async function(videoId) {
    return this.request(`/videos/${videoId}/play`, {
      method: 'POST',
      tokenType: 'student',
    });
  };
}
