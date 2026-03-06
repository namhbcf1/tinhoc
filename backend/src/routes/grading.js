// backend/src/routes/grading.js
// Manual grading endpoints: pending list, attempt detail, submit grade
import { Hono } from 'hono';
import { verifyJWT, errorResponse, jsonResponse } from '../utils/helpers.js';

const grading = new Hono();

// ========================================
// AUTH MIDDLEWARE (admin/teacher only)
// ========================================

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return errorResponse('Missing auth token', 401);
  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return errorResponse('Invalid or expired token', 401);
  c.set('user', payload);
  await next();
};

const gradingAccess = async (c, next) => {
  const user = c.get('user');
  const allowed = ['admin', 'super_admin', 'teacher'];
  if (!user || !allowed.includes(user.role)) {
    return errorResponse('Grading access required (admin/teacher)', 403);
  }
  await next();
};

// ========================================
// GET /api/grading/pending - Attempts needing grading
// ========================================

grading.get('/pending', authMiddleware, gradingAccess, async (c) => {
  const db = c.env.DB;
  const { examId, page = '1', pageSize = '20' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page));
  const size = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (pageNum - 1) * size;

  try {
    const conditions = [`ea.grading_status = 'pending' AND ea.status = 'completed'`];
    const params = [];
    if (examId) { conditions.push('ea.exam_id = ?'); params.push(examId); }

    const where = conditions.join(' AND ');

    const rows = await db.prepare(`
      SELECT ea.id as attempt_id, ea.exam_id, ea.student_id, ea.submit_time,
             ea.total_score, ea.grading_status,
             e.title as exam_title, e.level,
             s.ho_ten_full as student_name, s.cccd as student_cccd,
             (SELECT COUNT(*) FROM exam_answers ans
              JOIN exam_questions eq ON ans.question_id = eq.id
              WHERE ans.attempt_id = ea.id AND eq.type != 'MULTIPLE_CHOICE' AND ans.score IS NULL
             ) as ungraded_count
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      LEFT JOIN students s ON ea.student_id = s.id
      WHERE ${where}
      ORDER BY ea.submit_time ASC
      LIMIT ? OFFSET ?
    `).bind(...params, size, offset).all();

    const total = await db.prepare(
      `SELECT COUNT(*) as cnt FROM exam_attempts ea WHERE ${where}`
    ).bind(...params).first();

    return jsonResponse({
      success: true,
      attempts: rows.results,
      total: total?.cnt || 0,
      page: pageNum,
      pageSize: size,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// GET /api/grading/:attemptId - Attempt detail for grading
// ========================================

grading.get('/:attemptId', authMiddleware, gradingAccess, async (c) => {
  const db = c.env.DB;
  const { attemptId } = c.req.param();

  try {
    const attempt = await db.prepare(`
      SELECT ea.*, e.title as exam_title, e.level,
             s.ho_ten_full as student_name, s.cccd as student_cccd
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      LEFT JOIN students s ON ea.student_id = s.id
      WHERE ea.id = ?
    `).bind(attemptId).first();

    if (!attempt) return errorResponse('Attempt not found', 404);

    // Get all answers with full question context
    const answers = await db.prepare(`
      SELECT ans.id as answer_id, ans.attempt_id, ans.question_id,
             ans.answer_text, ans.audio_url, ans.score, ans.feedback,
             eq.content as question_content, eq.type as question_type,
             eq.points as max_points, eq.correct_answer, eq.explanation,
             es.type as section_type, es.title as section_title,
             eqg.title as group_title, eqg.text_content as group_text, eqg.audio_url as group_audio
      FROM exam_answers ans
      JOIN exam_questions eq ON ans.question_id = eq.id
      JOIN exam_sections es ON eq.section_id = es.id
      LEFT JOIN exam_question_groups eqg ON eq.group_id = eqg.id
      WHERE ans.attempt_id = ?
      ORDER BY es.order_index ASC, eq.order_index ASC
    `).bind(attemptId).all();

    return jsonResponse({
      success: true,
      attempt,
      answers: answers.results,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// POST /api/grading/submit - Submit grade for a question answer
// ========================================

grading.post('/submit', authMiddleware, gradingAccess, async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { attemptId, questionId, pointsEarned, feedback, rubricId } = await c.req.json();

  if (!attemptId || !questionId || pointsEarned === undefined) {
    return errorResponse('attemptId, questionId, pointsEarned required', 400);
  }

  try {
    // Update the answer score
    await db.prepare(`
      UPDATE exam_answers
      SET score = ?, feedback = ?, graded_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE attempt_id = ? AND question_id = ?
    `).bind(pointsEarned, feedback || null, user.id, attemptId, questionId).run();

    // Recalculate total scores per section
    const sectionTotals = await db.prepare(`
      SELECT es.type as section_type, SUM(ans.score) as section_score
      FROM exam_answers ans
      JOIN exam_questions eq ON ans.question_id = eq.id
      JOIN exam_sections es ON eq.section_id = es.id
      WHERE ans.attempt_id = ? AND ans.score IS NOT NULL
      GROUP BY es.type
    `).bind(attemptId).all();

    const scores = { LISTENING: null, READING: null, WRITING: null, SPEAKING: null };
    for (const row of sectionTotals.results) {
      scores[row.section_type] = row.section_score;
    }
    const total = Object.values(scores).filter(v => v !== null).reduce((a, b) => a + b, 0);

    // Check if all non-MCQ answers are graded
    const ungraded = await db.prepare(`
      SELECT COUNT(*) as cnt
      FROM exam_answers ans
      JOIN exam_questions eq ON ans.question_id = eq.id
      WHERE ans.attempt_id = ? AND eq.type != 'MULTIPLE_CHOICE' AND ans.score IS NULL
    `).bind(attemptId).first();

    const allGraded = (ungraded?.cnt || 0) === 0;

    await db.prepare(`
      UPDATE exam_attempts SET
        score_listening = ?, score_reading = ?, score_writing = ?, score_speaking = ?,
        total_score = ?,
        grading_status = ?,
        graded_by = ?, graded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      scores.LISTENING, scores.READING, scores.WRITING, scores.SPEAKING,
      total,
      allGraded ? 'finalized' : 'pending',
      user.id, attemptId
    ).run();

    return jsonResponse({
      success: true,
      message: 'Grade submitted',
      allGraded,
      totalScore: total,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

export default grading;
