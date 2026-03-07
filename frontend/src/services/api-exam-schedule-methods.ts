// ========================================
// EXAM SCHEDULE METHODS MIXIN
// Exam schedule CRUD, student management, trash/restore, approval workflows
// ========================================

/** Download a blob URL and trigger browser save dialog */
function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function applyExamScheduleMethods(ApiClient) {
  // Get all exam schedules with pagination (admin)
  ApiClient.prototype.getAllExamSchedules = async function(limit = 100, offset = 0) {
    return this.request(`/exam-schedules?limit=${limit}&offset=${offset}`, {
      tokenType: 'admin',
    });
  };

  // Get upcoming exams (admin)
  ApiClient.prototype.getUpcomingExams = async function(limit = 10) {
    return this.request(`/exam-schedules/upcoming?limit=${limit}`, {
      tokenType: 'admin',
    });
  };

  // Get exams for the currently logged-in student (teacher fallback if no student token)
  ApiClient.prototype.getStudentExams = async function() {
    const studentToken = this.getToken('student');
    if (!studentToken) {
      // Fall back to teacher view or return empty to avoid 401 spam
      const teacherToken = this.getToken('teacher');
      if (teacherToken) return this.request('/teachers/my-exams', { tokenType: 'teacher' });
      return { success: true, data: [] };
    }
    try {
      return await this.request('/exam-schedules/my-exams', { tokenType: 'student' });
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        this.setToken(null, 'student');
        return { success: true, data: [] };
      }
      throw err;
    }
  };

  // Register student for an exam schedule
  ApiClient.prototype.registerExam = async function(examId) {
    return this.request(`/exam-schedules/${examId}/register`, {
      method: 'POST',
      tokenType: 'student'
    });
  };

  // Cancel student's exam registration
  ApiClient.prototype.cancelExam = async function(examId) {
    return this.request(`/exam-schedules/${examId}/cancel`, {
      method: 'POST',
      tokenType: 'student'
    });
  };

  // Get list of students registered for an exam
  ApiClient.prototype.getExamStudents = async function(examId) {
    return this.request(`/exam-schedules/${examId}/students`);
  };

  // Remove a student from an exam
  ApiClient.prototype.removeStudentFromExam = async function(examId, studentId) {
    return this.request(`/exam-schedules/${examId}/students/${studentId}`, {
      method: 'DELETE',
    });
  };

  // Get exam schedules associated with a class
  ApiClient.prototype.getExamSchedulesByClass = async function(classId) {
    return this.request(`/exam-schedules/class/${classId}`);
  };

  // Add multiple students to an exam (admin)
  ApiClient.prototype.addStudentsToExam = async function(examId, studentIds) {
    return this.request(`/exam-schedules/${examId}/students`, {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds }),
    });
  };

  // Add students to exam with optional force flag to bypass restrictions
  ApiClient.prototype.addStudentsToExamWithForce = async function(examId, studentIds, force = false) {
    return this.request(`/exam-schedules/${examId}/students`, {
      method: 'POST',
      body: JSON.stringify({ student_ids: studentIds, force: !!force }),
    });
  };

  // Create a new exam schedule
  ApiClient.prototype.createExamSchedule = async function(data) {
    return this.request('/exam-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  // Update an existing exam schedule
  ApiClient.prototype.updateExamSchedule = async function(id, data) {
    return this.request(`/exam-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  // Soft-delete an exam schedule
  ApiClient.prototype.deleteExamSchedule = async function(id) {
    return this.request(`/exam-schedules/${id}`, {
      method: 'DELETE',
    });
  };

  // Download exam participant list as Excel file
  ApiClient.prototype.downloadExamListExcel = async function(examId) {
    const url = `${this.baseURL}/export/exam/${examId}/exam-list`;
    const token = this.getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Lỗi tải file danh sách dự thi');
    triggerBlobDownload(await response.blob(), `DANHSACHDUTHI-${examId}.xlsx`);
  };

  // Get pending (awaiting approval) students for an exam
  ApiClient.prototype.getPendingExamStudents = async function(examId) {
    return this.request(`/exam-schedules/${examId}/pending`);
  };

  // Approve a single student's exam registration
  ApiClient.prototype.approveExamStudent = async function(examId, studentId) {
    return this.request(`/exam-schedules/${examId}/approve/${studentId}`, {
      method: 'POST',
    });
  };

  // Approve all pending students for an exam at once
  ApiClient.prototype.approveAllExamStudents = async function(examId) {
    return this.request(`/exam-schedules/${examId}/approve-all`, {
      method: 'POST',
    });
  };

  // Get registration conflicts across exam schedules (admin)
  ApiClient.prototype.getExamRegistrationConflicts = async function() {
    return this.request('/exam-schedules/conflicts', {
      tokenType: 'admin',
    });
  };

  // Get full exam registration history for a student (admin)
  ApiClient.prototype.getStudentExamRegistrationHistory = async function(studentId) {
    return this.request(`/exam-schedules/student/${studentId}/registrations`, {
      tokenType: 'admin',
    });
  };

  // ---- Trash (Soft Delete) ----

  // Get soft-deleted exam schedules
  ApiClient.prototype.getTrashExamSchedules = async function() {
    return this.request('/exam-schedules/trash');
  };

  // Restore a soft-deleted exam schedule
  ApiClient.prototype.restoreExamSchedule = async function(id) {
    return this.request(`/exam-schedules/${id}/restore`, {
      method: 'POST',
    });
  };

  // Permanently delete an exam schedule
  ApiClient.prototype.permanentDeleteExamSchedule = async function(id) {
    return this.request(`/exam-schedules/${id}/permanent`, {
      method: 'DELETE',
    });
  };

  // Reject a student's exam registration
  ApiClient.prototype.rejectExamStudent = async function(examId, studentId) {
    return this.request(`/exam-schedules/${examId}/reject/${studentId}`, {
      method: 'POST',
    });
  };
}
