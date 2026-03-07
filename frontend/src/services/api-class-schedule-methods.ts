// ========================================
// CLASS SCHEDULE METHODS MIXIN
// Class schedules CRUD + class-teacher assignments
// ========================================

export function applyClassScheduleMethods(ApiClient) {
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

  // ---- Class Teachers ----

  // Get teachers assigned to a class
  ApiClient.prototype.getClassTeachers = async function(classId) {
    return this.request(`/class-teachers/class/${classId}`);
  };

  // Assign a teacher to a class with an optional role
  ApiClient.prototype.assignTeacherToClass = async function(classId, teacherId, role = 'teacher') {
    return this.request('/class-teachers', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, teacher_id: teacherId, role }),
    });
  };

  // Remove a teacher from a class by assignment ID
  ApiClient.prototype.removeTeacherFromClass = async function(id) {
    return this.request(`/class-teachers/${id}`, {
      method: 'DELETE',
    });
  };
}
