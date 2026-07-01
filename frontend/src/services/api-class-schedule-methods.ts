// @ts-nocheck
// ========================================
// CLASS SCHEDULE METHODS MIXIN
// Class schedules CRUD + class-teacher assignments
// ========================================

export function applyClassScheduleMethods(ApiClient) {
  const invalidateClassCache = (client, classId) => {
    client.invalidateCache([
      '/classes',
      `/classes/${classId}/sessions`,
      `/class-schedules/class/${classId}`,
    ]);
  };

  // ---- Class Schedules ----

  // Get all schedules for a specific class
  ApiClient.prototype.getClassSchedules = async function(classId) {
    return this.request(`/class-schedules/class/${classId}`);
  };

  // Create a new class schedule entry
  ApiClient.prototype.createClassSchedule = async function(data) {
    return this.request('/class-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Update an existing class schedule
  ApiClient.prototype.updateClassSchedule = async function(id, data) {
    return this.request(`/class-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Delete a class schedule entry
  ApiClient.prototype.deleteClassSchedule = async function(id) {
    return this.request(`/class-schedules/${id}`, {
      method: 'DELETE',
    });
  };

  // ---- Class Sessions ----

  ApiClient.prototype.getClassSessions = async function(classId) {
    return this.request(`/classes/${classId}/sessions`);
  };

  ApiClient.prototype.createClassSession = async function(classId, data) {
    const response = await this.request(`/classes/${classId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    invalidateClassCache(this, classId);
    return response;
  };

  ApiClient.prototype.updateClassSession = async function(classId, sessionId, data) {
    const response = await this.request(`/classes/${classId}/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    invalidateClassCache(this, classId);
    return response;
  };

  ApiClient.prototype.deleteClassSession = async function(classId, sessionId) {
    const response = await this.request(`/classes/${classId}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    invalidateClassCache(this, classId);
    return response;
  };

  // ---- Class Teachers ----

  // Get teachers assigned to a class
  ApiClient.prototype.getClassTeachers = async function(classId) {
    return this.request(`/class-teachers/class/${classId}`);
  };

  // Assign a teacher (admin with role='teacher') to a class
  ApiClient.prototype.assignTeacherToClass = async function(classId, adminId, role = 'teacher') {
    return this.request('/class-teachers', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, admin_id: adminId, role }),
    });
  };

  // Remove a teacher from a class by assignment ID
  ApiClient.prototype.removeTeacherFromClass = async function(id) {
    return this.request(`/class-teachers/${id}`, {
      method: 'DELETE',
    });
  };
}
