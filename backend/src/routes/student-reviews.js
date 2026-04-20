/**
 * Router: student-reviews
 * Báo cáo đánh giá học viên theo từng lớp.
 * Admin: tạo/sửa/xóa/publish báo cáo
 * Học viên: chỉ xem báo cáo đã published của mình
 */
import { Hono } from 'hono';
import { errorResponse, successResponse } from '../utils/helpers.js';
import { requireAdmin, requireAuth } from '../middleware/auth-middleware.js';
const studentReviews = new Hono();
// ─────────────────────────────────────────────────────────
// Helpers — inline queries (không tách file riêng vì nhỏ)
// ─────────────────────────────────────────────────────────
async function getReviewFull(db, reviewId) {
    const review = await db
        .prepare('SELECT * FROM student_reviews WHERE id = ?')
        .bind(reviewId)
        .first();
    if (!review)
        return null;
    return attachChildren(db, review);
}
async function attachChildren(db, review) {
    const [skills, scores] = await Promise.all([
        db.prepare('SELECT * FROM student_review_skills WHERE review_id = ? ORDER BY sort_order ASC')
            .bind(review.id).all(),
        db.prepare('SELECT * FROM student_review_test_scores WHERE review_id = ? ORDER BY sort_order ASC')
            .bind(review.id).all(),
    ]);
    return {
        ...review,
        homework_tracking: JSON.parse(review.homework_tracking || '[]'),
        skills: skills.results,
        test_scores: scores.results,
    };
}
async function syncSkills(db, reviewId, skills) {
    await db.prepare('DELETE FROM student_review_skills WHERE review_id = ?').bind(reviewId).run();
    for (let i = 0; i < skills.length; i++) {
        const s = skills[i];
        await db.prepare(`INSERT INTO student_review_skills
         (review_id, skill, score_raw, score_num, skill_status, comments, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(reviewId, s.skill, s.score_raw ?? null, s.score_num ?? null, s.skill_status ?? null, s.comments ?? null, s.sort_order ?? i).run();
    }
}
async function syncTestScores(db, reviewId, scores) {
    await db.prepare('DELETE FROM student_review_test_scores WHERE review_id = ?').bind(reviewId).run();
    for (let i = 0; i < scores.length; i++) {
        const r = scores[i];
        await db.prepare(`INSERT INTO student_review_test_scores
         (review_id, skill_label, max_score, student_score, score_notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`).bind(reviewId, r.skill_label, r.max_score ?? null, r.student_score ?? null, r.score_notes ?? null, r.sort_order ?? i).run();
    }
}
// ─────────────────────────────────────────────────────────
// STUDENT — GET /student-reviews/my
// Phải khai báo TRƯỚC route /class/:classId để tránh match nhầm
// ─────────────────────────────────────────────────────────
studentReviews.get('/my', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        // Chỉ chấp nhận student token
        if (user.type !== 'student') {
            return errorResponse('Endpoint dành riêng cho học viên', 403);
        }
        const studentId = user.id;
        const rows = await c.env.DB
            .prepare(`
        SELECT
          sr.id, sr.online_class_id, sr.period_label, sr.report_title,
          sr.overall_summary, sr.recommendations, sr.homework_tracking,
          sr.status, sr.created_at, sr.updated_at,
          oc.class_name
        FROM student_reviews sr
        JOIN online_classes oc ON oc.id = sr.online_class_id
        WHERE sr.student_id = ? AND sr.status = 'published'
        ORDER BY sr.updated_at DESC
      `)
            .bind(studentId)
            .all();
        const reviews = await Promise.all(rows.results.map((r) => attachChildren(c.env.DB, r)));
        return successResponse(reviews);
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi khi tải báo cáo', 500);
    }
});
// ─────────────────────────────────────────────────────────
// ADMIN — List reviews for a class
// GET /student-reviews/class/:classId
// ─────────────────────────────────────────────────────────
studentReviews.get('/class/:classId', requireAdmin, async (c) => {
    try {
        const classId = parseInt(c.req.param('classId'), 10);
        if (isNaN(classId))
            return errorResponse('classId không hợp lệ', 400);
        const rows = await c.env.DB
            .prepare(`
        SELECT
          sr.id, sr.student_id, sr.online_class_id,
          sr.period_label, sr.report_title, sr.status,
          sr.overall_summary, sr.created_at, sr.updated_at,
          s.ho_ten_full AS student_name, s.ten AS student_short_name, s.cccd
        FROM student_reviews sr
        JOIN students s ON s.id = sr.student_id
        WHERE sr.online_class_id = ?
        ORDER BY s.ho_ten_full ASC
      `)
            .bind(classId)
            .all();
        return successResponse(rows.results);
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
// ─────────────────────────────────────────────────────────
// ADMIN — Get single full review
// GET /student-reviews/class/:classId/student/:studentId
// ─────────────────────────────────────────────────────────
studentReviews.get('/class/:classId/student/:studentId', requireAdmin, async (c) => {
    try {
        const classId = parseInt(c.req.param('classId'), 10);
        const studentId = parseInt(c.req.param('studentId'), 10);
        if (isNaN(classId) || isNaN(studentId))
            return errorResponse('Tham số không hợp lệ', 400);
        const row = await c.env.DB
            .prepare('SELECT * FROM student_reviews WHERE student_id = ? AND online_class_id = ?')
            .bind(studentId, classId)
            .first();
        if (!row)
            return successResponse(null);
        return successResponse(await attachChildren(c.env.DB, row));
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
// ─────────────────────────────────────────────────────────
// ADMIN — Create or upsert review
// POST /student-reviews/class/:classId/student/:studentId
// ─────────────────────────────────────────────────────────
studentReviews.post('/class/:classId/student/:studentId', requireAdmin, async (c) => {
    try {
        const classId = parseInt(c.req.param('classId'), 10);
        const studentId = parseInt(c.req.param('studentId'), 10);
        if (isNaN(classId) || isNaN(studentId))
            return errorResponse('Tham số không hợp lệ', 400);
        const user = c.get('user');
        const body = await c.req.json();
        const { period_label, report_title, overall_summary, recommendations, homework_tracking = [], skills = [], test_scores = [], } = body;
        const homeworkJson = JSON.stringify(homework_tracking);
        await c.env.DB.prepare(`
      INSERT INTO student_reviews
        (student_id, online_class_id, period_label, report_title,
         overall_summary, recommendations, homework_tracking, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, online_class_id) DO UPDATE SET
        period_label       = excluded.period_label,
        report_title       = excluded.report_title,
        overall_summary    = excluded.overall_summary,
        recommendations    = excluded.recommendations,
        homework_tracking  = excluded.homework_tracking,
        updated_by         = excluded.updated_by,
        updated_at         = CURRENT_TIMESTAMP
    `).bind(studentId, classId, period_label ?? null, report_title ?? null, overall_summary ?? null, recommendations ?? null, homeworkJson, user.id, user.id).run();
        const review = await c.env.DB
            .prepare('SELECT id FROM student_reviews WHERE student_id = ? AND online_class_id = ?')
            .bind(studentId, classId)
            .first();
        if (!review)
            return errorResponse('Không tạo được báo cáo', 500);
        await syncSkills(c.env.DB, review.id, skills);
        await syncTestScores(c.env.DB, review.id, test_scores);
        return successResponse(await getReviewFull(c.env.DB, review.id), 201);
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
// ─────────────────────────────────────────────────────────
// ADMIN — Update review fields
// PUT /student-reviews/:id
// ─────────────────────────────────────────────────────────
studentReviews.put('/:id/publish', requireAdmin, async (c) => {
    try {
        const id = parseInt(c.req.param('id'), 10);
        const user = c.get('user');
        await c.env.DB.prepare('UPDATE student_reviews SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('published', user.id, id).run();
        return successResponse({ id, status: 'published' });
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
studentReviews.put('/:id/unpublish', requireAdmin, async (c) => {
    try {
        const id = parseInt(c.req.param('id'), 10);
        const user = c.get('user');
        await c.env.DB.prepare('UPDATE student_reviews SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind('draft', user.id, id).run();
        return successResponse({ id, status: 'draft' });
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
studentReviews.put('/:id', requireAdmin, async (c) => {
    try {
        const id = parseInt(c.req.param('id'), 10);
        const user = c.get('user');
        const body = await c.req.json();
        const { period_label, report_title, overall_summary, recommendations, homework_tracking, skills, test_scores, } = body;
        await c.env.DB.prepare(`
      UPDATE student_reviews SET
        period_label      = COALESCE(?, period_label),
        report_title      = COALESCE(?, report_title),
        overall_summary   = COALESCE(?, overall_summary),
        recommendations   = COALESCE(?, recommendations),
        homework_tracking = COALESCE(?, homework_tracking),
        updated_by        = ?,
        updated_at        = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(period_label ?? null, report_title ?? null, overall_summary ?? null, recommendations ?? null, homework_tracking ? JSON.stringify(homework_tracking) : null, user.id, id).run();
        if (skills)
            await syncSkills(c.env.DB, id, skills);
        if (test_scores)
            await syncTestScores(c.env.DB, id, test_scores);
        return successResponse(await getReviewFull(c.env.DB, id));
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
// ─────────────────────────────────────────────────────────
// ADMIN — Delete review
// DELETE /student-reviews/:id
// ─────────────────────────────────────────────────────────
studentReviews.delete('/:id', requireAdmin, async (c) => {
    try {
        const id = parseInt(c.req.param('id'), 10);
        await c.env.DB.prepare('DELETE FROM student_reviews WHERE id = ?').bind(id).run();
        return successResponse({ deleted: true, id });
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi server', 500);
    }
});
export default studentReviews;
