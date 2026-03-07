// backend/src/routes/exam-taking.ts
// Student exam-taking flow: start, fetch data, save answers, submit, result, history
import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { verifyJWT, errorResponse, jsonResponse } from '../utils/helpers.js';

const examTaking = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// ========================================
// AUTH MIDDLEWARE
// ========================================

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return errorResponse('Missing auth token', 401);
  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return errorResponse('Invalid or expired token', 401);
  c.set('user', payload);
  await next();
};

// ========================================
// GET /api/exams/my-history - Student attempt history
// NOTE: Must be registered before /:id routes
// ========================================

examTaking.get('/my-history', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  try {
    const rows = await db.prepare(`
      SELECT ea.*, e.title as exam_title, e.level, e.code
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.student_id = ?
      ORDER BY ea.start_time DESC
    `).bind(user.id).all();

    const attempts = rows.results.map((a: any) => ({
      ...a,
      options_json: undefined,
      correct_answer: undefined,
    }));

    return jsonResponse({ success: true, attempts });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// POST /api/exams/:id/start - Create attempt
// ========================================

examTaking.post('/:id/start', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();

  try {
    const examRow = await db.prepare(`SELECT id, status, duration FROM exams WHERE id = ?`).bind(id).first() as any;
    if (!examRow) return errorResponse('Exam not found', 404);
    if (examRow.status !== 'published') return errorResponse('Exam is not available', 403);

    // Check for existing in-progress attempt
    const existing = await db.prepare(
      `SELECT id FROM exam_attempts WHERE exam_id = ? AND student_id = ? AND status = 'in_progress'`
    ).bind(id, user.id).first() as any;

    if (existing) {
      return jsonResponse({ success: true, attemptId: existing.id, resumed: true });
    }

    const result = await db.prepare(
      `INSERT INTO exam_attempts (exam_id, student_id, status) VALUES (?, ?, 'in_progress')`
    ).bind(id, user.id).run();

    return jsonResponse({ success: true, attemptId: result.meta.last_row_id, resumed: false }, 201);
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// GET /api/exams/:id/data - Full question tree (no correct answers for students)
// ========================================

examTaking.get('/:id/data', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  try {
    const examRow = await db.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first() as any;
    if (!examRow) return errorResponse('Exam not found', 404);
    if (!isAdmin && examRow.status !== 'published') return errorResponse('Exam not available', 403);

    const sections = await db.prepare(
      'SELECT * FROM exam_sections WHERE exam_id = ? ORDER BY order_index ASC'
    ).bind(id).all();

    const groups = await db.prepare(
      'SELECT * FROM exam_question_groups WHERE exam_id = ? ORDER BY order_index ASC'
    ).bind(id).all();

    const questions = await db.prepare(
      'SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY order_index ASC'
    ).bind(id).all();

    // Build tree
    const groupMap: Record<string, any> = {};
    for (const g of groups.results as any[]) {
      groupMap[g.id] = { ...g, questions: [] };
    }

    const standaloneBySection: Record<string, any[]> = {};
    for (const q of questions.results as any[]) {
      // Parse JSON fields
      const question = {
        ...q,
        options: q.options_json ? JSON.parse(q.options_json) : null,
        settings: q.settings_json ? JSON.parse(q.settings_json) : null,
      };
      // Strip correct answers for students
      if (!isAdmin) delete question.correct_answer;
      delete question.options_json;
      delete question.settings_json;

      if (q.group_id && groupMap[q.group_id]) {
        groupMap[q.group_id].questions.push(question);
      } else {
        if (!standaloneBySection[q.section_id]) standaloneBySection[q.section_id] = [];
        standaloneBySection[q.section_id].push(question);
      }
    }

    const sectionsWithData = (sections.results as any[]).map(s => ({
      ...s,
      groups: (groups.results as any[]).filter(g => g.section_id === s.id).map(g => groupMap[g.id]),
      standaloneQuestions: standaloneBySection[s.id] || [],
    }));

    return jsonResponse({
      success: true,
      data: {
        exam: { id: examRow.id, title: examRow.title, duration: examRow.duration, level: examRow.level, code: examRow.code },
        sections: sectionsWithData,
      }
    });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// POST /api/exams/:id/answers - Save answer (upsert)
// ========================================

examTaking.post('/:id/answers', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();
  const { attemptId, questionId, answerText, audioUrl } = await c.req.json();

  if (!attemptId || !questionId) return errorResponse('attemptId and questionId required', 400);

  try {
    // Verify attempt ownership
    const attempt = await db.prepare(
      `SELECT id, status FROM exam_attempts WHERE id = ? AND student_id = ? AND exam_id = ?`
    ).bind(attemptId, user.id, id).first() as any;
    if (!attempt) return errorResponse('Attempt not found or access denied', 403);
    if (attempt.status !== 'in_progress') return errorResponse('Attempt already submitted', 400);

    await db.prepare(`
      INSERT INTO exam_answers (attempt_id, question_id, answer_text, audio_url, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(attempt_id, question_id) DO UPDATE SET
        answer_text = excluded.answer_text,
        audio_url = excluded.audio_url,
        updated_at = CURRENT_TIMESTAMP
    `).bind(attemptId, questionId, answerText || null, audioUrl || null).run();

    return jsonResponse({ success: true });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// POST /api/exams/:id/submit - Submit exam + auto-grade MCQ
// ========================================

examTaking.post('/:id/submit', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();
  const { attemptId } = await c.req.json();

  if (!attemptId) return errorResponse('attemptId required', 400);

  try {
    const attempt = await db.prepare(
      `SELECT id, status FROM exam_attempts WHERE id = ? AND student_id = ? AND exam_id = ?`
    ).bind(attemptId, user.id, id).first() as any;
    if (!attempt) return errorResponse('Attempt not found or access denied', 403);
    if (attempt.status !== 'in_progress') return errorResponse('Already submitted', 400);

    // Auto-grade MULTIPLE_CHOICE
    const answers = await db.prepare(`
      SELECT ea.id, ea.answer_text, eq.correct_answer, eq.points, eq.type, eq.section_id,
             es.type as section_type
      FROM exam_answers ea
      JOIN exam_questions eq ON ea.question_id = eq.id
      JOIN exam_sections es ON eq.section_id = es.id
      WHERE ea.attempt_id = ?
    `).bind(attemptId).all();

    const sectionScores: Record<string, number> = { LISTENING: 0, READING: 0, WRITING: 0, SPEAKING: 0 };
    let needsManualGrading = false;

    for (const ans of answers.results as any[]) {
      if (ans.type === 'MULTIPLE_CHOICE' && ans.correct_answer) {
        const earned = ans.answer_text?.trim() === ans.correct_answer?.trim() ? ans.points : 0;
        await db.prepare('UPDATE exam_answers SET score = ? WHERE id = ?').bind(earned, ans.id).run();
        if (ans.section_type) sectionScores[ans.section_type] = (sectionScores[ans.section_type] || 0) + earned;
      } else {
        needsManualGrading = true;
      }
    }

    const totalAutoScore = Object.values(sectionScores).reduce((a, b) => a + b, 0);
    const gradingStatus = needsManualGrading ? 'pending' : 'auto_graded';

    await db.prepare(`
      UPDATE exam_attempts SET
        status = 'completed', submit_time = CURRENT_TIMESTAMP,
        score_listening = ?, score_reading = ?, score_writing = ?, score_speaking = ?,
        total_score = ?, grading_status = ?
      WHERE id = ?
    `).bind(
      sectionScores.LISTENING || null, sectionScores.READING || null,
      sectionScores.WRITING || null, sectionScores.SPEAKING || null,
      totalAutoScore || null, gradingStatus, attemptId
    ).run();

    return jsonResponse({ success: true, message: 'Exam submitted', gradingStatus });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// GET /api/exams/:id/result - Get result
// ========================================

examTaking.get('/:id/result', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();
  const { attemptId } = c.req.query();
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (!attemptId) return errorResponse('attemptId required', 400);

  try {
    const attempt = await db.prepare(`
      SELECT ea.*, e.title as exam_title, e.level
      FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
      WHERE ea.id = ? AND ea.exam_id = ?
    `).bind(attemptId, id).first() as any;

    if (!attempt) return errorResponse('Attempt not found', 404);
    if (!isAdmin && attempt.student_id !== user.id) return errorResponse('Access denied', 403);

    // Get answers with question info
    const answers = await db.prepare(`
      SELECT ea.*, eq.content, eq.type, eq.points,
             CASE WHEN ? THEN eq.correct_answer ELSE NULL END as correct_answer,
             eq.explanation
      FROM exam_answers ea
      JOIN exam_questions eq ON ea.question_id = eq.id
      WHERE ea.attempt_id = ?
    `).bind(isAdmin ? 1 : 0, attemptId).all();

    return jsonResponse({
      success: true,
      attempt,
      answers: answers.results,
    });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// GET /api/exams/:id/history - Exam attempt history for a specific exam
// ========================================

examTaking.get('/:id/history', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  try {
    let query = `SELECT ea.*, s.ho_ten_full as student_name FROM exam_attempts ea
      LEFT JOIN students s ON ea.student_id = s.id WHERE ea.exam_id = ?`;
    const params: any[] = [id];
    if (!isAdmin) { query += ' AND ea.student_id = ?'; params.push(user.id); }
    query += ' ORDER BY ea.start_time DESC';

    const rows = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, attempts: rows.results });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// POST /api/exams/:id/security - Log security event
// ========================================

examTaking.post('/:id/security', authMiddleware, async (c) => {
  const db = c.env.DB;
  const user = c.get('user') as any;
  const { id } = c.req.param();
  const { attemptId, eventType, eventData } = await c.req.json();

  try {
    // Log to console for now; can extend to security_events table
    console.log(`[SECURITY] exam=${id} attempt=${attemptId} student=${user.id} event=${eventType}`, eventData);
    return jsonResponse({ success: true });
  } catch (e: any) {
    return errorResponse(e.message, 500);
  }
});

export default examTaking;
