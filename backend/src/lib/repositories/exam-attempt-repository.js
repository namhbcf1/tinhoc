// ========================================
// EXAM ATTEMPT REPOSITORY
// Handles: createExamAttempt, getCurrentAttempt, getExamAttempt,
//          updateExamAttempt, submitExamAttempt, getMyAttempts
// Depends on: getExamTestById, getExamTestWithDetails, calculateScore
// ========================================

import { getExamTestById } from './exam-test-repository.js';
import { getExamTestWithDetails } from './exam-test-detail-repository.js';
import { calculateScore } from './exam-answer-repository.js';

export async function createExamAttempt(db, studentId, testId) {
  const test = await getExamTestById(db, testId);
  if (!test) throw new Error('Test not found');

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (test.duration_minutes * 60 * 1000) + (10 * 60 * 1000)).toISOString();

  const result = await db.prepare(`
    INSERT INTO exam_attempts (
      student_id, test_id, test_version, start_time, expires_at, status
    ) VALUES (?, ?, ?, ?, ?, 'in_progress')
  `).bind(studentId, testId, test.version, now, expiresAt).run();

  const attemptId = result.meta.last_row_id;

  const sections = await db.prepare(`
    SELECT * FROM exam_sections WHERE test_id = ? ORDER BY order_index ASC
  `).bind(testId).all();

  for (const section of sections.results || []) {
    await db.prepare(`
      INSERT INTO exam_attempt_sections (attempt_id, section_id, started_at)
      VALUES (?, ?, ?)
    `).bind(attemptId, section.id, now).run();
  }

  return { id: attemptId, ...result };
}

export async function getCurrentAttempt(db, studentId, testId) {
  const result = await db.prepare(`
    SELECT * FROM exam_attempts
    WHERE student_id = ? AND test_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(studentId, testId).first();
  return result;
}

export async function getExamAttempt(db, attemptId) {
  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ?
  `).bind(attemptId).first();

  if (!attempt) return null;

  const test = await getExamTestWithDetails(db, attempt.test_id, false);
  const answers = await db.prepare(`
    SELECT * FROM exam_attempt_answers WHERE attempt_id = ?
  `).bind(attemptId).all();

  const answersMap = {};
  (answers.results || []).forEach(a => {
    answersMap[a.question_id] = {
      answerData: a.answer_data ? JSON.parse(a.answer_data) : null,
      isCorrect: a.is_correct,
      pointsEarned: a.points_earned
    };
  });

  return { attempt, test, answers: answersMap };
}

export async function updateExamAttempt(db, attemptId, data) {
  const updates = [];
  const params = [];

  if (data.end_time !== undefined) {
    updates.push('end_time = ?');
    params.push(data.end_time);
  }

  if (data.time_spent_seconds !== undefined) {
    updates.push('time_spent_seconds = ?');
    params.push(data.time_spent_seconds);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }

  if (data.last_heartbeat !== undefined) {
    updates.push('last_heartbeat = ?');
    params.push(data.last_heartbeat);
  }

  if (updates.length === 0) return { meta: { changes: 0 } };

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(attemptId);

  const result = await db.prepare(`
    UPDATE exam_attempts SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run();

  return result;
}

export async function submitExamAttempt(db, attemptId) {
  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ?
  `).bind(attemptId).first();

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status !== 'in_progress') throw new Error('Attempt already submitted');

  const scoreResult = await calculateScore(db, attemptId);

  const now = new Date().toISOString();
  const result = await db.prepare(`
    UPDATE exam_attempts
    SET status = 'submitted',
        submitted_at = ?,
        score = ?,
        max_score = ?,
        section_scores = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    now,
    scoreResult.totalScore,
    scoreResult.maxScore,
    JSON.stringify(scoreResult.sectionScores),
    attemptId
  ).run();

  return result;
}

export async function getMyAttempts(db, studentId, filters = {}) {
  let query = `
    SELECT a.*, t.title, t.level, et.code as exam_type_code, et.name as exam_type_name
    FROM exam_attempts a
    JOIN exam_tests t ON a.test_id = t.id
    JOIN exam_types et ON t.exam_type_id = et.id
    WHERE a.student_id = ?
  `;
  const params = [studentId];

  if (filters.status) {
    query += ' AND a.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY a.created_at DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}
