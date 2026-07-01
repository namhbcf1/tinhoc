// @ts-nocheck
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

function sanitizeDownloadFilename(filename) {
  if (!filename) return '';
  return String(filename)
    .replace(/^["']|["']$/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFilenameFromContentDisposition(contentDisposition) {
  if (!contentDisposition) return '';

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return sanitizeDownloadFilename(decodeURIComponent(utf8Match[1]));
    } catch {
      return sanitizeDownloadFilename(utf8Match[1]);
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return sanitizeDownloadFilename(quotedMatch[1]);
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch?.[1]) {
    return sanitizeDownloadFilename(plainMatch[1]);
  }

  return '';
}

export function applyExamScheduleMethods(ApiClient) {
  const invalidateExamCache = (client) => {
    client.invalidateCache([
      '/exam-schedules',
      '/exam-categories',
      '/exam-types',
      '/program-organizers',
      '/programs',
      '/program-levels',
      '/field-definitions',
      '/field-options',
    ]);
  };
  // Get all exam schedules with pagination (admin)
  ApiClient.prototype.getAllExamSchedules = async function(limit = 100, offset = 0) {
    return this.cachedRequest(`/exam-schedules?limit=${limit}&offset=${offset}`, {
      tokenType: 'admin',
    }, { ttlMs: 3 * 60 * 1000 });
  };

  // Get upcoming exams (admin)
  ApiClient.prototype.getUpcomingExams = async function(limit = 10) {
    return this.cachedRequest(`/exam-schedules/upcoming?limit=${limit}`, {
      tokenType: 'admin',
    }, { ttlMs: 3 * 60 * 1000 });
  };

  // Get exams for the currently logged-in student (admin teaching-staff fallback if no student token)
  ApiClient.prototype.getStudentExams = async function() {
    const studentToken = this.getToken('student');
    if (!studentToken) {
      const adminToken = this.getToken('admin');
      if (adminToken) {
        return this.cachedRequest('/teachers/my-exams', { tokenType: 'admin' }, { ttlMs: 3 * 60 * 1000 });
      }
      return { success: true, data: [] };
    }
    try {
      return await this.cachedRequest('/exam-schedules/my-exams', { tokenType: 'student' }, { ttlMs: 3 * 60 * 1000 });
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        this.setToken(null, 'student');
        return { success: true, data: [] };
      }
      throw err;
    }
  };

  ApiClient.prototype.getExamCategories = async function() {
    return this.cachedRequest('/exam-categories', {}, { ttlMs: 10 * 60 * 1000 });
  };

  ApiClient.prototype.getExamTypes = async function() {
    return this.cachedRequest('/exam-types', {}, { ttlMs: 10 * 60 * 1000 });
  };

  ApiClient.prototype.getProgramOrganizers = async function(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.cachedRequest(`/program-organizers${query ? `?${query}` : ''}`, { tokenType: 'admin' }, { ttlMs: 5 * 60 * 1000 });
  };

  ApiClient.prototype.createProgramOrganizer = async function(data) {
    const res = await this.request('/program-organizers', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.updateProgramOrganizer = async function(uuid, data) {
    const res = await this.request(`/program-organizers/${uuid}`, {
      method: 'PUT',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.getPrograms = async function(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.cachedRequest(`/programs${query ? `?${query}` : ''}`, { tokenType: 'admin' }, { ttlMs: 5 * 60 * 1000 });
  };

  ApiClient.prototype.createProgram = async function(data) {
    const res = await this.request('/programs', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.updateProgram = async function(uuid, data) {
    const res = await this.request(`/programs/${uuid}`, {
      method: 'PUT',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.getProgramLevels = async function(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.cachedRequest(`/program-levels${query ? `?${query}` : ''}`, { tokenType: 'admin' }, { ttlMs: 5 * 60 * 1000 });
  };

  ApiClient.prototype.createProgramLevel = async function(data) {
    const res = await this.request('/program-levels', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.updateProgramLevel = async function(uuid, data) {
    const res = await this.request(`/program-levels/${uuid}`, {
      method: 'PUT',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.getFieldDefinitions = async function(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.cachedRequest(`/field-definitions${query ? `?${query}` : ''}`, { tokenType: 'admin' }, { ttlMs: 5 * 60 * 1000 });
  };

  ApiClient.prototype.createFieldDefinition = async function(data) {
    const res = await this.request('/field-definitions', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.updateFieldDefinition = async function(uuid, data) {
    const res = await this.request(`/field-definitions/${uuid}`, {
      method: 'PUT',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.getFieldOptions = async function(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.cachedRequest(`/field-options${query ? `?${query}` : ''}`, { tokenType: 'admin' }, { ttlMs: 5 * 60 * 1000 });
  };

  ApiClient.prototype.createFieldOption = async function(data) {
    const res = await this.request('/field-options', {
      method: 'POST',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  ApiClient.prototype.updateFieldOption = async function(uuid, data) {
    const res = await this.request(`/field-options/${uuid}`, {
      method: 'PUT',
      tokenType: 'admin',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  // Register student for an exam schedule
  ApiClient.prototype.registerExam = async function(examId) {
    const res = await this.request(`/exam-schedules/${examId}/register`, {
      method: 'POST',
      tokenType: 'student'
    });
    invalidateExamCache(this);
    return res;
  };

  // Cancel student's exam registration
  ApiClient.prototype.cancelExam = async function(examId) {
    const res = await this.request(`/exam-schedules/${examId}/cancel`, {
      method: 'POST',
      tokenType: 'student'
    });
    invalidateExamCache(this);
    return res;
  };

  // Get list of students registered for an exam
  // withZoomCheckin: true → thêm cột zoom_checked_in_at từ online_class_attendance
  ApiClient.prototype.getExamStudents = async function(examId, { withZoomCheckin = false } = {}) {
    const qs = withZoomCheckin ? '?with_zoom_checkin=1' : '';
    return this.request(`/exam-schedules/${examId}/students${qs}`);
  };

  // Tab Điểm danh học tập: sessions + attendance của online_class gắn với kỳ thi
  ApiClient.prototype.getExamLearningAttendance = async function(examId) {
    return this.request(`/exam-schedules/${examId}/learning-attendance`);
  };

  // Tạo buổi học mới
  ApiClient.prototype.createExamLearningSession = async function(examId, body) {
    return this.request(`/exam-schedules/${examId}/learning-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  // OCR preview từ ảnh lịch học
  ApiClient.prototype.previewExamLearningSessionsImport = async function(examId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.request(`/exam-schedules/${examId}/learning-sessions/import-preview`, {
      method: 'POST',
      body: formData,
    });
  };

  // Commit tạo hàng loạt buổi học từ rows đã duyệt
  ApiClient.prototype.commitExamLearningSessionsImport = async function(examId, rows) {
    return this.request(`/exam-schedules/${examId}/learning-sessions/import-commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
  };

  // Xóa buổi học
  ApiClient.prototype.deleteExamLearningSession = async function(examId, sessionId) {
    return this.request(`/exam-schedules/${examId}/learning-sessions/${sessionId}`, {
      method: 'DELETE',
    });
  };

  // Chấm điểm danh thủ công
  ApiClient.prototype.updateExamLearningAttendance = async function(examId, sessionId, studentId, body) {
    return this.request(`/exam-schedules/${examId}/learning-sessions/${sessionId}/attendance/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  // Remove a student from an exam
  ApiClient.prototype.removeStudentFromExam = async function(examId, studentId) {
    const res = await this.request(`/exam-schedules/${examId}/students/${studentId}`, {
      method: 'DELETE',
    });
    invalidateExamCache(this);
    return res;
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
    const res = await this.request('/exam-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  // Update an existing exam schedule
  ApiClient.prototype.updateExamSchedule = async function(id, data) {
    const res = await this.request(`/exam-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    invalidateExamCache(this);
    return res;
  };

  // Soft-delete an exam schedule
  ApiClient.prototype.deleteExamSchedule = async function(id) {
    const res = await this.request(`/exam-schedules/${id}`, {
      method: 'DELETE',
    });
    invalidateExamCache(this);
    return res;
  };

  // Download exam participant list as Excel file
  ApiClient.prototype.downloadExamListExcel = async function(examId, options = {}) {
    const scope = options?.scope || 'approved';
    const query = new URLSearchParams({ scope }).toString();
    const url = `${this.baseURL}/export/exam/${examId}/exam-list?${query}`;
    const token = this.getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Lỗi tải file danh sách dự thi');
    const contentDisposition = response.headers.get('content-disposition') || '';
    const serverFilename = getFilenameFromContentDisposition(contentDisposition);
    triggerBlobDownload(await response.blob(), serverFilename || `DANHSACHDUTHI-${examId}.xlsx`);
  };

  // Preview exam participant list rendered from backend export source-of-truth
  ApiClient.prototype.getExamListExcelPreview = async function(examId, options = {}) {
    const scope = options?.scope || 'approved';
    const query = new URLSearchParams({ scope }).toString();
    return this.request(`/export/exam/${examId}/exam-list/preview?${query}`, {
      tokenType: 'admin',
    });
  };

  // Get pending (awaiting approval) students for an exam
  ApiClient.prototype.getPendingExamStudents = async function(examId) {
    return this.request(`/exam-schedules/${examId}/pending`);
  };

  // Update exam student's fee marker
  ApiClient.prototype.updateExamStudentPaymentStatus = async function(examId, studentId, paymentStatus) {
    const res = await this.request(`/exam-schedules/${examId}/students/${studentId}/payment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: paymentStatus }),
    });
    invalidateExamCache(this);
    return res;
  };

  // Approve a single student's exam registration
  ApiClient.prototype.approveExamStudent = async function(examId, studentId) {
    const res = await this.request(`/exam-schedules/${examId}/approve/${studentId}`, {
      method: 'POST',
    });
    invalidateExamCache(this);
    return res;
  };

  // Approve all pending students for an exam at once
  ApiClient.prototype.approveAllExamStudents = async function(examId) {
    const res = await this.request(`/exam-schedules/${examId}/approve-all`, {
      method: 'POST',
    });
    invalidateExamCache(this);
    return res;
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
