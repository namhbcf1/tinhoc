// backend/src/routes/exam-management.js
// Exam CRUD: exams, sections, question groups, questions
import { Hono } from 'hono';
import { verifyJWT, errorResponse, successResponse, jsonResponse } from '../utils/helpers.js';

const exam = new Hono();

// ========================================
// AUTH MIDDLEWARE
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

const adminOnly = async (c, next) => {
  const user = c.get('user');
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return errorResponse('Admin access required', 403);
  }
  await next();
};

// ========================================
// EXAMS
// ========================================

/**
 * GET /api/exams - List exams with filters + pagination
 */
exam.get('/', authMiddleware, async (c) => {
  const db = c.env.DB;
  const { search, status, level, courseId, sortBy = 'created_at', sortOrder = 'DESC', page = '1', pageSize = '20' } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const size = Math.min(100, Math.max(1, parseInt(pageSize)));
  const offset = (pageNum - 1) * size;

  const conditions = ['1=1'];
  const params = [];

  if (search) { conditions.push('(title LIKE ? OR code LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (level) { conditions.push('level = ?'); params.push(level); }
  if (courseId) { conditions.push('course_id = ?'); params.push(parseInt(courseId)); }

  const where = conditions.join(' AND ');
  const allowedSort = ['created_at', 'title', 'level', 'status', 'duration'];
  const sortCol = allowedSort.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  try {
    const rows = await db.prepare(
      `SELECT * FROM exams WHERE ${where} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`
    ).bind(...params, size, offset).all();

    const total = await db.prepare(`SELECT COUNT(*) as cnt FROM exams WHERE ${where}`)
      .bind(...params).first();

    return jsonResponse({
      success: true,
      exams: rows.results,
      total: total?.cnt || 0,
      page: pageNum,
      pageSize: size,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * POST /api/exams - Create exam
 */
exam.post('/', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { title, description, code, level = 'B1', duration, status = 'draft', courseId, thumbnailUrl, questionsPerExam = 0 } = await c.req.json();

  if (!title || !duration) return errorResponse('title and duration required', 400);

  try {
    const result = await db.prepare(
      `INSERT INTO exams (title, description, code, level, duration, status, course_id, thumbnail_url, questions_per_exam, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(title, description || null, code || null, level, parseInt(duration), status, courseId || null, thumbnailUrl || null, questionsPerExam, user.id).run();

    const created = await db.prepare('SELECT * FROM exams WHERE id = ?').bind(result.meta.last_row_id).first();
    return jsonResponse({ success: true, exam: created }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * GET /api/exams/published - Public list of published exams
 */
exam.get('/published', async (c) => {
  const db = c.env.DB;
  try {
    const rows = await db.prepare(
      `SELECT id, title, description, code, level, duration, thumbnail_url FROM exams WHERE status = 'published' ORDER BY created_at DESC`
    ).all();
    return jsonResponse({ success: true, exams: rows.results });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * GET /api/exams/:id - Get single exam
 */
exam.get('/:id', authMiddleware, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  try {
    const row = await db.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first();
    if (!row) return errorResponse('Exam not found', 404);
    return jsonResponse({ success: true, exam: row });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * PUT /api/exams?id= - Update exam
 */
exam.put('/', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.query();
  if (!id) return errorResponse('id query param required', 400);

  const body = await c.req.json();
  const fields = ['title','description','code','level','duration','status','course_id','thumbnail_url','questions_per_exam'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    const key = f.replace(/_([a-z])/g, (_, k) => k.toUpperCase()); // camelCase from body
    const val = body[key] !== undefined ? body[key] : body[f];
    if (val !== undefined) { updates.push(`${f} = ?`); params.push(val); }
  }
  if (!updates.length) return errorResponse('No fields to update', 400);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  try {
    await db.prepare(`UPDATE exams SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    const updated = await db.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first();
    return jsonResponse({ success: true, exam: updated });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * DELETE /api/exams?id= - Delete exam
 */
exam.delete('/', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.query();
  if (!id) return errorResponse('id query param required', 400);
  try {
    const exists = await db.prepare('SELECT id FROM exams WHERE id = ?').bind(id).first();
    if (!exists) return errorResponse('Exam not found', 404);
    await db.prepare('DELETE FROM exams WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true, message: 'Exam deleted' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * GET /api/exams/:id/stats - Exam statistics
 */
exam.get('/:id/stats', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  try {
    const attemptStats = await db.prepare(`
      SELECT
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        AVG(CASE WHEN total_score IS NOT NULL THEN total_score END) as avg_score,
        MAX(total_score) as max_score,
        MIN(CASE WHEN total_score IS NOT NULL THEN total_score END) as min_score
      FROM exam_attempts WHERE exam_id = ?
    `).bind(id).first();

    const qCount = await db.prepare('SELECT COUNT(*) as cnt FROM exam_questions WHERE exam_id = ?').bind(id).first();
    const sCount = await db.prepare('SELECT COUNT(*) as cnt FROM exam_sections WHERE exam_id = ?').bind(id).first();

    return jsonResponse({
      success: true,
      stats: {
        totalAttempts: attemptStats?.total_attempts || 0,
        completed: attemptStats?.completed || 0,
        avgScore: attemptStats?.avg_score,
        maxScore: attemptStats?.max_score,
        minScore: attemptStats?.min_score,
        questionCount: qCount?.cnt || 0,
        sectionCount: sCount?.cnt || 0,
      }
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

/**
 * POST /api/exams/:id/duplicate - Duplicate exam with sections, groups, questions
 */
exam.post('/:id/duplicate', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();
  try {
    const src = await db.prepare('SELECT * FROM exams WHERE id = ?').bind(id).first();
    if (!src) return errorResponse('Exam not found', 404);

    // Create copy
    const newExam = await db.prepare(
      `INSERT INTO exams (title, description, code, level, duration, status, course_id, thumbnail_url, questions_per_exam, created_by)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
    ).bind(`${src.title} (Copy)`, src.description, null, src.level, src.duration, src.course_id, src.thumbnail_url, src.questions_per_exam, user.id).run();
    const newExamId = newExam.meta.last_row_id;

    // Duplicate sections
    const sections = await db.prepare('SELECT * FROM exam_sections WHERE exam_id = ?').bind(id).all();
    const sectionIdMap = {};
    for (const s of sections.results) {
      const ns = await db.prepare(
        `INSERT INTO exam_sections (exam_id, type, title, order_index, duration, instructions) VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(newExamId, s.type, s.title, s.order_index, s.duration, s.instructions).run();
      sectionIdMap[s.id] = ns.meta.last_row_id;
    }

    // Duplicate groups
    const groups = await db.prepare('SELECT * FROM exam_question_groups WHERE exam_id = ?').bind(id).all();
    const groupIdMap = {};
    for (const g of groups.results) {
      const ng = await db.prepare(
        `INSERT INTO exam_question_groups (exam_id, section_id, title, text_content, audio_url, image_url, order_index, settings_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newExamId, sectionIdMap[g.section_id], g.title, g.text_content, g.audio_url, g.image_url, g.order_index, g.settings_json).run();
      groupIdMap[g.id] = ng.meta.last_row_id;
    }

    // Duplicate questions
    const questions = await db.prepare('SELECT * FROM exam_questions WHERE exam_id = ?').bind(id).all();
    for (const q of questions.results) {
      await db.prepare(
        `INSERT INTO exam_questions (exam_id, section_id, group_id, content, type, options_json, correct_answer, points, settings_json, order_index, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(newExamId, sectionIdMap[q.section_id], q.group_id ? groupIdMap[q.group_id] : null, q.content, q.type, q.options_json, q.correct_answer, q.points, q.settings_json, q.order_index, q.explanation).run();
    }

    return jsonResponse({ success: true, id: newExamId }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// SECTIONS
// ========================================

exam.get('/:id/sections', authMiddleware, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  try {
    const rows = await db.prepare('SELECT * FROM exam_sections WHERE exam_id = ? ORDER BY order_index ASC').bind(id).all();
    return jsonResponse({ success: true, sections: rows.results });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.post('/:id/sections', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { type, title, duration = 0, instructions, orderIndex = 0 } = await c.req.json();
  if (!type || !title) return errorResponse('type and title required', 400);
  try {
    const r = await db.prepare(
      `INSERT INTO exam_sections (exam_id, type, title, order_index, duration, instructions) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, type, title, orderIndex, duration, instructions || null).run();
    const section = await db.prepare('SELECT * FROM exam_sections WHERE id = ?').bind(r.meta.last_row_id).first();
    return jsonResponse({ success: true, section }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.put('/:id/sections', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { sectionId } = c.req.query();
  if (!sectionId) return errorResponse('sectionId required', 400);
  const body = await c.req.json();
  const allowed = { type: 'type', title: 'title', duration: 'duration', instructions: 'instructions', orderIndex: 'order_index' };
  const updates = [];
  const params = [];
  for (const [key, col] of Object.entries(allowed)) {
    if (body[key] !== undefined) { updates.push(`${col} = ?`); params.push(body[key]); }
  }
  if (!updates.length) return errorResponse('No fields to update', 400);
  params.push(sectionId);
  try {
    await db.prepare(`UPDATE exam_sections SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    const section = await db.prepare('SELECT * FROM exam_sections WHERE id = ?').bind(sectionId).first();
    return jsonResponse({ success: true, section });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.delete('/:id/sections', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { sectionId } = c.req.query();
  if (!sectionId) return errorResponse('sectionId required', 400);
  try {
    await db.prepare('DELETE FROM exam_sections WHERE id = ?').bind(sectionId).run();
    return jsonResponse({ success: true, message: 'Section deleted' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// QUESTION GROUPS
// ========================================

exam.get('/:id/groups', authMiddleware, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { sectionId } = c.req.query();
  try {
    let query = 'SELECT * FROM exam_question_groups WHERE exam_id = ?';
    const params = [id];
    if (sectionId) { query += ' AND section_id = ?'; params.push(sectionId); }
    query += ' ORDER BY order_index ASC';
    const rows = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, groups: rows.results });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.post('/:id/groups', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { sectionId, title, textContent, audioUrl, imageUrl, orderIndex = 0, settingsJson } = await c.req.json();
  if (!sectionId) return errorResponse('sectionId required', 400);
  try {
    const r = await db.prepare(
      `INSERT INTO exam_question_groups (exam_id, section_id, title, text_content, audio_url, image_url, order_index, settings_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, sectionId, title || null, textContent || null, audioUrl || null, imageUrl || null, orderIndex, settingsJson || null).run();
    const group = await db.prepare('SELECT * FROM exam_question_groups WHERE id = ?').bind(r.meta.last_row_id).first();
    return jsonResponse({ success: true, group }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.put('/:id/groups', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { groupId } = c.req.query();
  if (!groupId) return errorResponse('groupId required', 400);
  const body = await c.req.json();
  const map = { sectionId: 'section_id', title: 'title', textContent: 'text_content', audioUrl: 'audio_url', imageUrl: 'image_url', orderIndex: 'order_index', settingsJson: 'settings_json' };
  const updates = [];
  const params = [];
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) { updates.push(`${col} = ?`); params.push(body[key]); }
  }
  if (!updates.length) return errorResponse('No fields to update', 400);
  params.push(groupId);
  try {
    await db.prepare(`UPDATE exam_question_groups SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    const group = await db.prepare('SELECT * FROM exam_question_groups WHERE id = ?').bind(groupId).first();
    return jsonResponse({ success: true, group });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.delete('/:id/groups', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { groupId } = c.req.query();
  if (!groupId) return errorResponse('groupId required', 400);
  try {
    await db.prepare('DELETE FROM exam_question_groups WHERE id = ?').bind(groupId).run();
    return jsonResponse({ success: true, message: 'Group deleted' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

// ========================================
// QUESTIONS
// ========================================

exam.get('/:id/questions', authMiddleware, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { sectionId, groupId } = c.req.query();
  try {
    let query = 'SELECT * FROM exam_questions WHERE exam_id = ?';
    const params = [id];
    if (sectionId) { query += ' AND section_id = ?'; params.push(sectionId); }
    if (groupId) { query += ' AND group_id = ?'; params.push(groupId); }
    query += ' ORDER BY order_index ASC';
    const rows = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, questions: rows.results });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.post('/:id/questions', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { id } = c.req.param();
  const { sectionId, groupId, content, type, options, correctAnswer, points = 1, settings, orderIndex = 0, explanation } = await c.req.json();
  if (!sectionId || !content || !type) return errorResponse('sectionId, content, type required', 400);
  try {
    const r = await db.prepare(
      `INSERT INTO exam_questions (exam_id, section_id, group_id, content, type, options_json, correct_answer, points, settings_json, order_index, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, sectionId, groupId || null, content, type,
      options ? JSON.stringify(options) : null, correctAnswer || null, points,
      settings ? JSON.stringify(settings) : null, orderIndex, explanation || null).run();
    const question = await db.prepare('SELECT * FROM exam_questions WHERE id = ?').bind(r.meta.last_row_id).first();
    return jsonResponse({ success: true, question }, 201);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.put('/:id/questions', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { questionId } = c.req.query();
  if (!questionId) return errorResponse('questionId required', 400);
  const body = await c.req.json();
  const map = {
    sectionId: 'section_id', groupId: 'group_id', content: 'content', type: 'type',
    correctAnswer: 'correct_answer', points: 'points', orderIndex: 'order_index', explanation: 'explanation'
  };
  const updates = [];
  const params = [];
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) { updates.push(`${col} = ?`); params.push(body[key]); }
  }
  if (body.options !== undefined) { updates.push('options_json = ?'); params.push(JSON.stringify(body.options)); }
  if (body.settings !== undefined) { updates.push('settings_json = ?'); params.push(JSON.stringify(body.settings)); }
  if (!updates.length) return errorResponse('No fields to update', 400);
  params.push(questionId);
  try {
    await db.prepare(`UPDATE exam_questions SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    const question = await db.prepare('SELECT * FROM exam_questions WHERE id = ?').bind(questionId).first();
    return jsonResponse({ success: true, question });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

exam.delete('/:id/questions', authMiddleware, adminOnly, async (c) => {
  const db = c.env.DB;
  const { questionId } = c.req.query();
  if (!questionId) return errorResponse('questionId required', 400);
  try {
    await db.prepare('DELETE FROM exam_questions WHERE id = ?').bind(questionId).run();
    return jsonResponse({ success: true, message: 'Question deleted' });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
});

export default exam;
