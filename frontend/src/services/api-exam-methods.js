// ========================================
// EXAM METHODS MIXIN
// VSTEP exam engine (student) + exam bank management (admin)
// ========================================

export function applyExamMethods(ApiClient) {
  // ---- VSTEP Exam Engine (Student) ----

  // Get details of a VSTEP exam attempt
  ApiClient.prototype.getVstepAttempt = async function(attemptId) {
    return this.request(`/vstep/attempts/${attemptId}`, { tokenType: 'student' });
  };

  // Get VSTEP exam definition
  ApiClient.prototype.getVstepExam = async function(examId) {
    return this.request(`/vstep/exams/${examId}`, { tokenType: 'student' });
  };

  // Save an answer for a question in a VSTEP attempt
  ApiClient.prototype.saveVstepAnswer = async function(attemptId, questionId, value) {
    return this.request(`/vstep/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ question_id: questionId, value }),
      tokenType: 'student',
    });
  };

  // Submit a completed VSTEP attempt with all answers
  ApiClient.prototype.submitVstepAttempt = async function(attemptId, answers) {
    return this.request(`/vstep/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
      tokenType: 'student',
    });
  };

  // Log a security/proctoring event during a VSTEP exam
  ApiClient.prototype.logVstepSecurityEvent = async function(examId, attemptId, eventType, eventData) {
    return this.request(`/vstep/attempts/${attemptId}/security-log`, {
      method: 'POST',
      body: JSON.stringify({ exam_id: examId, event_type: eventType, event_data: eventData }),
      tokenType: 'student',
    });
  };

  // Get published VSTEP exams available for students to take
  ApiClient.prototype.getPublishedExams = async function() {
    return this.request('/vstep/exams?status=published', { tokenType: 'student' });
  };

  // Get current student's VSTEP exam attempt history
  ApiClient.prototype.getMyExamHistory = async function(limit = 5) {
    return this.request(`/vstep/attempts/my-history?limit=${limit}`, { tokenType: 'student' });
  };

  // ---- Exam Bank Management (Admin) ----

  // Get exams from exam bank with optional filters
  ApiClient.prototype.getExams = async function(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    return this.request(`/exams?${query.toString()}`, { tokenType: 'admin' });
  };

  // Get a single exam from the bank
  ApiClient.prototype.getExam = async function(examId) {
    return this.request(`/exams/${examId}`, { tokenType: 'admin' });
  };

  // Create a new exam in the bank
  ApiClient.prototype.createExam = async function(data) {
    return this.request('/exams', { method: 'POST', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Update an exam in the bank
  ApiClient.prototype.updateExam = async function(examId, data) {
    return this.request(`/exams/${examId}`, { method: 'PUT', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Delete an exam from the bank
  ApiClient.prototype.deleteExam = async function(examId) {
    return this.request(`/exams/${examId}`, { method: 'DELETE', tokenType: 'admin' });
  };

  // Get statistics for an exam
  ApiClient.prototype.getExamStats = async function(examId) {
    return this.request(`/exams/${examId}/stats`, { tokenType: 'admin' });
  };

  // Get question categories
  ApiClient.prototype.getCategories = async function() {
    return this.request('/categories', { tokenType: 'admin' });
  };

  // ---- Sections ----

  // Get sections of an exam
  ApiClient.prototype.getExamSections = async function(examId) {
    return this.request(`/exams/${examId}/sections`, { tokenType: 'admin' });
  };

  // Create a section in an exam
  ApiClient.prototype.createExamSection = async function(examId, data) {
    return this.request(`/exams/${examId}/sections`, { method: 'POST', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Update a section in an exam
  ApiClient.prototype.updateExamSection = async function(examId, sectionId, data) {
    return this.request(`/exams/${examId}/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Delete a section from an exam
  ApiClient.prototype.deleteExamSection = async function(examId, sectionId) {
    return this.request(`/exams/${examId}/sections/${sectionId}`, { method: 'DELETE', tokenType: 'admin' });
  };

  // ---- Groups ----

  // Get question groups in a section
  ApiClient.prototype.getExamGroups = async function(examId, sectionId) {
    return this.request(`/exams/${examId}/sections/${sectionId}/groups`, { tokenType: 'admin' });
  };

  // Create a question group in an exam
  ApiClient.prototype.createExamGroup = async function(examId, data) {
    return this.request(`/exams/${examId}/groups`, { method: 'POST', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Update a question group
  ApiClient.prototype.updateExamGroup = async function(examId, groupId, data) {
    return this.request(`/exams/${examId}/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Delete a question group
  ApiClient.prototype.deleteExamGroup = async function(examId, groupId) {
    return this.request(`/exams/${examId}/groups/${groupId}`, { method: 'DELETE', tokenType: 'admin' });
  };

  // ---- Questions ----

  // Get all questions in an exam
  ApiClient.prototype.getExamQuestions = async function(examId) {
    return this.request(`/exams/${examId}/questions`, { tokenType: 'admin' });
  };

  // Create a question in an exam
  ApiClient.prototype.createExamQuestion = async function(examId, data) {
    return this.request(`/exams/${examId}/questions`, { method: 'POST', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Update a question in an exam
  ApiClient.prototype.updateExamQuestion = async function(examId, questionId, data) {
    return this.request(`/exams/${examId}/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(data), tokenType: 'admin' });
  };

  // Delete a question from an exam
  ApiClient.prototype.deleteExamQuestion = async function(examId, questionId) {
    return this.request(`/exams/${examId}/questions/${questionId}`, { method: 'DELETE', tokenType: 'admin' });
  };

  // ---- Grading ----

  // Get detailed attempt for manual grading (admin)
  ApiClient.prototype.getAttemptDetail = async function(attemptId) {
    return this.request(`/exams/attempts/${attemptId}`, { tokenType: 'admin' });
  };

  // Submit a manual grade for a question in an attempt
  ApiClient.prototype.submitGrade = async function(attemptId, questionId, score, feedback) {
    return this.request(`/exams/attempts/${attemptId}/grade`, {
      method: 'POST',
      body: JSON.stringify({ questionId, score, feedback }),
      tokenType: 'admin',
    });
  };
}
