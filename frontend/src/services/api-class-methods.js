// ========================================
// CLASS METHODS MIXIN
// Offline classes CRUD + online classes + class videos
// ========================================

export function applyClassMethods(ApiClient) {
  // Get all offline classes
  ApiClient.prototype.getClasses = async function() {
    return this.request('/classes');
  };

  // Get open/public classes (no auth required)
  ApiClient.prototype.getOpenClasses = async function() {
    return this.request('/classes/open');
  };

  // Get single class by ID (fetches full list and filters locally to avoid 404 spam)
  ApiClient.prototype.getClass = async function(id) {
    const listResp = await this.request('/classes');
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
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Update an offline class
  ApiClient.prototype.updateClass = async function(id, data) {
    return this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Delete an offline class
  ApiClient.prototype.deleteClass = async function(id) {
    return this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
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
