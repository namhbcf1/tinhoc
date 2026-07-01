// @ts-nocheck
// ========================================
// FEEDBACK METHODS MIXIN
// Student feedback submissions + admin review + public listing
// ========================================

export function applyFeedbackMethods(ApiClient) {
  ApiClient.prototype.getMyStudentFeedbacks = async function () {
    return this.request('/student-feedbacks/my', {
      tokenType: 'student',
    });
  };

  ApiClient.prototype.submitStudentFeedback = async function (body) {
    return this.request('/student-feedbacks', {
      method: 'POST',
      tokenType: 'student',
      body: JSON.stringify(body),
    });
  };

  ApiClient.prototype.updateStudentFeedback = async function (feedbackId, body) {
    return this.request(`/student-feedbacks/${feedbackId}`, {
      method: 'PUT',
      tokenType: 'student',
      body: JSON.stringify(body),
    });
  };

  ApiClient.prototype.listClassStudentFeedbacks = async function (classId) {
    return this.request(`/student-feedbacks/class/${classId}`, {
      tokenType: 'admin',
    });
  };

  ApiClient.prototype.getStudentFeedback = async function (feedbackId) {
    return this.request(`/student-feedbacks/${feedbackId}`, {
      tokenType: 'admin',
    });
  };

  ApiClient.prototype.reviewStudentFeedback = async function (feedbackId, body) {
    return this.request(`/student-feedbacks/${feedbackId}/review`, {
      method: 'PUT',
      tokenType: 'admin',
      body: JSON.stringify(body),
    });
  };

  ApiClient.prototype.getPublicStudentFeedbacks = async function (params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.cachedRequest(`/public/student-feedbacks${suffix}`, {
      tokenType: null,
    }, { enabled: true, ttlMs: 60_000 });
  };
}
