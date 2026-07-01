// @ts-nocheck
// ========================================
// REVIEW METHODS MIXIN
// Admin: CRUD báo cáo đánh giá học viên
// Student: xem báo cáo đã published của mình
// ========================================

export function applyReviewMethods(ApiClient) {
  // ---- STUDENT ----

  /** Học viên lấy tất cả báo cáo đã publish của mình */
  ApiClient.prototype.getMyReviews = async function () {
    return this.request('/student-reviews/my', {
      tokenType: 'student',
    });
  };

  // ---- ADMIN ----

  /** Danh sách báo cáo trong lớp (summary, không kèm child rows) */
  ApiClient.prototype.listClassReviews = async function (classId) {
    return this.request(`/student-reviews/class/${classId}`);
  };

  /** Chi tiết 1 báo cáo của học viên trong lớp (full: skills + test_scores) */
  ApiClient.prototype.getClassReview = async function (classId, studentId) {
    return this.request(`/student-reviews/class/${classId}/student/${studentId}`);
  };

  /** Tạo hoặc upsert báo cáo */
  ApiClient.prototype.upsertClassReview = async function (classId, studentId, body) {
    return this.request(`/student-reviews/class/${classId}/student/${studentId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  /** Cập nhật nội dung báo cáo */
  ApiClient.prototype.updateReview = async function (reviewId, body) {
    return this.request(`/student-reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  };

  /** Publish báo cáo (draft → published) */
  ApiClient.prototype.publishReview = async function (reviewId) {
    return this.request(`/student-reviews/${reviewId}/publish`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  };

  /** Revert về draft */
  ApiClient.prototype.unpublishReview = async function (reviewId) {
    return this.request(`/student-reviews/${reviewId}/unpublish`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  };

  /** Xóa báo cáo */
  ApiClient.prototype.deleteReview = async function (reviewId) {
    return this.request(`/student-reviews/${reviewId}`, {
      method: 'DELETE',
    });
  };
}
