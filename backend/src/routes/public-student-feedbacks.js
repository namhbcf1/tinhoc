import { Hono } from 'hono';
import { errorResponse, successResponse } from '../utils/helpers.js';
import { anonymizeStudentName } from './student-feedbacks.js';
const publicStudentFeedbacks = new Hono();
function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
publicStudentFeedbacks.get('/', async (c) => {
    try {
        const sentiment = String(c.req.query('sentiment') || '').trim();
        const classId = String(c.req.query('class_id') || '').trim();
        const limit = Math.min(parsePositiveInt(c.req.query('limit'), 12), 50);
        const page = parsePositiveInt(c.req.query('page'), 1);
        const offset = (page - 1) * limit;
        const conditions = [`f.status = 'approved'`];
        const bindings = [];
        if (['positive', 'mixed', 'negative'].includes(sentiment)) {
            conditions.push('f.sentiment = ?');
            bindings.push(sentiment);
        }
        const classIdNum = Number.parseInt(classId, 10);
        if (Number.isFinite(classIdNum) && classIdNum > 0) {
            conditions.push('f.online_class_id = ?');
            bindings.push(classIdNum);
        }
        const whereClause = conditions.join(' AND ');
        const countRow = await c.env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM student_feedbacks f
      WHERE ${whereClause}
    `).bind(...bindings).first();
        const rows = await c.env.DB.prepare(`
      SELECT
        f.id,
        f.online_class_id,
        f.rating,
        f.title,
        f.content,
        f.sentiment,
        f.teacher_response,
        f.created_at,
        f.updated_at,
        f.reviewed_at,
        s.ho_ten_full AS student_name,
        oc.class_name
      FROM student_feedbacks f
      JOIN students s ON s.id = f.student_id
      JOIN online_classes oc ON oc.id = f.online_class_id
      WHERE ${whereClause}
      ORDER BY COALESCE(f.reviewed_at, f.updated_at, f.created_at) DESC, f.id DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();
        const items = (rows.results ?? []).map((row) => ({
            ...row,
            student_name: anonymizeStudentName(row.student_name),
            public_at: row.reviewed_at || row.updated_at || row.created_at,
        }));
        return successResponse({
            items,
            pagination: {
                page,
                limit,
                total: Number(countRow?.total || 0),
            },
        });
    }
    catch (err) {
        return errorResponse(err?.message || 'Lỗi khi tải feedback công khai', 500);
    }
});
export default publicStudentFeedbacks;
