import { Hono } from 'hono';
import { errorResponse, successResponse } from '../utils/helpers.js';
import { requireAdmin, requireAuth } from '../middleware/auth-middleware.js';
const studentFeedbacks = new Hono();
const ELIGIBLE_ENROLLMENT_STATUSES = ['approved', 'active', 'completed', 'enrolled', 'confirmed'];
function isStudentUser(user) {
    return Boolean(user && (user.type === 'student' || user.role === 'student'));
}
function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function normalizeRating(value) {
    const rating = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(rating) ? rating : NaN;
}
function anonymizeStudentName(fullName) {
    const normalized = normalizeText(fullName);
    if (!normalized)
        return 'Học viên ẩn danh';
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 1)
        return `${parts[0].charAt(0).toUpperCase()}.`;
    return parts.map((part) => `${part.charAt(0).toUpperCase()}.`).join(' ');
}
async function getEligibleClassRows(db, studentId) {
    const placeholders = ELIGIBLE_ENROLLMENT_STATUSES.map(() => '?').join(', ');
    const query = `
    SELECT DISTINCT
      oc.id AS online_class_id,
      oc.class_name,
      oc.schedule_time,
      oc.start_date,
      oc.end_date
    FROM online_class_enrollments e
    JOIN online_classes oc ON oc.id = e.online_class_id
    WHERE e.student_id = ?
      AND e.status IN (${placeholders})
    ORDER BY COALESCE(oc.start_date, oc.created_at) DESC, oc.id DESC
  `;
    const result = await db
        .prepare(query)
        .bind(studentId, ...ELIGIBLE_ENROLLMENT_STATUSES)
        .all();
    return result.results ?? [];
}
async function getEligibleEnrollment(db, studentId, classId) {
    const placeholders = ELIGIBLE_ENROLLMENT_STATUSES.map(() => '?').join(', ');
    return db
        .prepare(`
      SELECT e.id, e.status, oc.class_name
      FROM online_class_enrollments e
      JOIN online_classes oc ON oc.id = e.online_class_id
      WHERE e.student_id = ?
        AND e.online_class_id = ?
        AND e.status IN (${placeholders})
      LIMIT 1
    `)
        .bind(studentId, classId, ...ELIGIBLE_ENROLLMENT_STATUSES)
        .first();
}
async function getFeedbackDetail(db, feedbackId) {
    return db
        .prepare(`
      SELECT
        f.*,
        s.ho_ten_full AS student_name,
        s.cccd AS student_cccd,
        oc.class_name
      FROM student_feedbacks f
      JOIN students s ON s.id = f.student_id
      JOIN online_classes oc ON oc.id = f.online_class_id
      WHERE f.id = ?
      LIMIT 1
    `)
        .bind(feedbackId)
        .first();
}
studentFeedbacks.get('/my', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        if (!isStudentUser(user)) {
            return errorResponse('Endpoint dành riêng cho học viên', 403);
        }
        const studentId = Number(user.id);
        const [eligibleClasses, feedbackRows] = await Promise.all([
            getEligibleClassRows(c.env.DB, studentId),
            c.env.DB.prepare(`
        SELECT
          f.*,
          oc.class_name,
          oc.schedule_time,
          oc.start_date,
          oc.end_date
        FROM student_feedbacks f
        JOIN online_classes oc ON oc.id = f.online_class_id
        WHERE f.student_id = ?
        ORDER BY f.updated_at DESC, f.id DESC
      `).bind(studentId).all(),
        ]);
        const feedbacks = feedbackRows.results ?? [];
        const existingClassIds = new Set(feedbacks.map((item) => Number(item.online_class_id)));
        const availableClasses = eligibleClasses.filter((item) => !existingClassIds.has(Number(item.online_class_id)));
        return successResponse({
            feedbacks,
            available_classes: availableClasses,
        });
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi khi tải phản hồi của học viên', 500);
    }
});
studentFeedbacks.post('/', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        if (!isStudentUser(user)) {
            return errorResponse('Chỉ học viên mới được gửi phản hồi', 403);
        }
        const studentId = Number(user.id);
        const body = await c.req.json();
        const onlineClassId = Number.parseInt(String(body?.online_class_id ?? ''), 10);
        const rating = normalizeRating(body?.rating);
        const title = normalizeText(body?.title);
        const content = normalizeText(body?.content);
        if (!Number.isFinite(onlineClassId) || onlineClassId <= 0) {
            return errorResponse('online_class_id không hợp lệ', 400);
        }
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return errorResponse('rating phải từ 1 đến 5', 400);
        }
        if (!title) {
            return errorResponse('Tiêu đề phản hồi là bắt buộc', 400);
        }
        if (!content) {
            return errorResponse('Nội dung phản hồi là bắt buộc', 400);
        }
        const enrollment = await getEligibleEnrollment(c.env.DB, studentId, onlineClassId);
        if (!enrollment) {
            return errorResponse('Bạn chỉ có thể phản hồi cho lớp đã được ghi nhận học tập hợp lệ', 403);
        }
        const existing = await c.env.DB
            .prepare('SELECT id FROM student_feedbacks WHERE student_id = ? AND online_class_id = ?')
            .bind(studentId, onlineClassId)
            .first();
        if (existing) {
            return errorResponse('Bạn đã có phản hồi cho lớp này. Hãy cập nhật phản hồi hiện có.', 409);
        }
        const inserted = await c.env.DB.prepare(`
      INSERT INTO student_feedbacks (
        student_id,
        online_class_id,
        rating,
        title,
        content,
        status
      ) VALUES (?, ?, ?, ?, ?, 'submitted')
    `).bind(studentId, onlineClassId, rating, title, content).run();
        const feedbackId = Number(inserted.meta.last_row_id);
        return successResponse(await getFeedbackDetail(c.env.DB, feedbackId), 201);
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi gửi phản hồi', 500);
    }
});
studentFeedbacks.put('/:id', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        if (!isStudentUser(user)) {
            return errorResponse('Chỉ học viên mới được cập nhật phản hồi', 403);
        }
        const feedbackId = Number.parseInt(c.req.param('id'), 10);
        if (!Number.isFinite(feedbackId) || feedbackId <= 0) {
            return errorResponse('id phản hồi không hợp lệ', 400);
        }
        const studentId = Number(user.id);
        const existing = await c.env.DB
            .prepare('SELECT * FROM student_feedbacks WHERE id = ? AND student_id = ?')
            .bind(feedbackId, studentId)
            .first();
        if (!existing) {
            return errorResponse('Không tìm thấy phản hồi', 404);
        }
        if (existing.status === 'approved') {
            return errorResponse('Phản hồi đã được duyệt không thể chỉnh sửa', 409);
        }
        const body = await c.req.json();
        const rating = normalizeRating(body?.rating);
        const title = normalizeText(body?.title);
        const content = normalizeText(body?.content);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return errorResponse('rating phải từ 1 đến 5', 400);
        }
        if (!title) {
            return errorResponse('Tiêu đề phản hồi là bắt buộc', 400);
        }
        if (!content) {
            return errorResponse('Nội dung phản hồi là bắt buộc', 400);
        }
        await c.env.DB.prepare(`
      UPDATE student_feedbacks
      SET
        rating = ?,
        title = ?,
        content = ?,
        status = 'submitted',
        sentiment = NULL,
        teacher_response = NULL,
        review_note_internal = NULL,
        reviewer_admin_id = NULL,
        reviewed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(rating, title, content, feedbackId).run();
        return successResponse(await getFeedbackDetail(c.env.DB, feedbackId));
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi cập nhật phản hồi', 500);
    }
});
studentFeedbacks.get('/class/:classId', requireAdmin, async (c) => {
    try {
        const classId = Number.parseInt(c.req.param('classId'), 10);
        if (!Number.isFinite(classId) || classId <= 0) {
            return errorResponse('classId không hợp lệ', 400);
        }
        const result = await c.env.DB.prepare(`
      SELECT
        f.*,
        s.ho_ten_full AS student_name,
        s.cccd AS student_cccd,
        oc.class_name
      FROM student_feedbacks f
      JOIN students s ON s.id = f.student_id
      JOIN online_classes oc ON oc.id = f.online_class_id
      WHERE f.online_class_id = ?
      ORDER BY
        CASE f.status
          WHEN 'submitted' THEN 0
          WHEN 'rejected' THEN 1
          ELSE 2
        END,
        f.updated_at DESC,
        f.id DESC
    `).bind(classId).all();
        return successResponse(result.results ?? []);
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi khi tải danh sách phản hồi', 500);
    }
});
studentFeedbacks.get('/:id', requireAdmin, async (c) => {
    try {
        const feedbackId = Number.parseInt(c.req.param('id'), 10);
        if (!Number.isFinite(feedbackId) || feedbackId <= 0) {
            return errorResponse('id phản hồi không hợp lệ', 400);
        }
        const detail = await getFeedbackDetail(c.env.DB, feedbackId);
        if (!detail) {
            return errorResponse('Không tìm thấy phản hồi', 404);
        }
        return successResponse(detail);
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi khi tải phản hồi', 500);
    }
});
studentFeedbacks.put('/:id/review', requireAdmin, async (c) => {
    try {
        const feedbackId = Number.parseInt(c.req.param('id'), 10);
        if (!Number.isFinite(feedbackId) || feedbackId <= 0) {
            return errorResponse('id phản hồi không hợp lệ', 400);
        }
        const existing = await getFeedbackDetail(c.env.DB, feedbackId);
        if (!existing) {
            return errorResponse('Không tìm thấy phản hồi', 404);
        }
        const body = await c.req.json();
        const nextStatus = normalizeText(body?.status);
        const nextSentiment = normalizeText(body?.sentiment);
        const teacherResponse = normalizeText(body?.teacher_response);
        const reviewNoteInternal = normalizeText(body?.review_note_internal);
        if (nextStatus !== 'approved' && nextStatus !== 'rejected') {
            return errorResponse('status phải là approved hoặc rejected', 400);
        }
        if (nextStatus === 'approved') {
            if (!['positive', 'mixed', 'negative'].includes(nextSentiment)) {
                return errorResponse('sentiment không hợp lệ', 400);
            }
            if ((nextSentiment === 'mixed' || nextSentiment === 'negative') && !teacherResponse) {
                return errorResponse('Phản hồi mixed/negative bắt buộc có teacher_response', 400);
            }
        }
        if (nextStatus === 'rejected' && !reviewNoteInternal) {
            return errorResponse('Từ chối phản hồi cần ghi review_note_internal để học viên chỉnh sửa', 400);
        }
        const reviewer = c.get('user');
        await c.env.DB.prepare(`
      UPDATE student_feedbacks
      SET
        status = ?,
        sentiment = ?,
        teacher_response = ?,
        review_note_internal = ?,
        reviewer_admin_id = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(nextStatus, nextStatus === 'approved' ? nextSentiment : null, nextStatus === 'approved' ? (teacherResponse || null) : null, nextStatus === 'rejected' ? reviewNoteInternal : null, Number(reviewer.id), feedbackId).run();
        return successResponse(await getFeedbackDetail(c.env.DB, feedbackId));
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi review phản hồi', 500);
    }
});
export { anonymizeStudentName, };
export default studentFeedbacks;
