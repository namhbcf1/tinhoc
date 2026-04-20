// ========================================
// MY CLASSES METHODS MIXIN
// Học viên xem lớp online của mình + track Zoom join tự động điểm danh
// ========================================

export function applyMyClassesMethods(ApiClient: any) {
  /**
   * GET /online-classes/my-enrolled
   * Trả danh sách lớp học viên đang active, kèm join_link + trạng thái hôm nay.
   */
  ApiClient.prototype.getMyEnrolledClasses = async function () {
    return this.request('/online-classes/my-enrolled', {
      method: 'GET',
      tokenType: 'student',
    });
  };

  /**
   * POST /online-classes/:id/track-zoom-join
   * Học viên bấm nút vào phòng học → tự động ghi điểm danh nếu đúng buổi, trả về join_link.
   */
  ApiClient.prototype.trackZoomJoin = async function (
    classId: number,
    source?: 'zoom_click' | 'meet_click'
  ) {
    return this.request(`/online-classes/${classId}/track-zoom-join`, {
      method: 'POST',
      body: JSON.stringify(source ? { source } : {}),
      tokenType: 'student',
    });
  };
}
