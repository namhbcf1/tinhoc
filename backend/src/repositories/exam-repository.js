export async function getCurrentAttempt(db, studentId, testId) {
  const result = await db.prepare(`
    SELECT
      id, student_id, test_id, test_version, start_time, end_time,
      submitted_at, expires_at, score, max_score, status,
      time_spent_seconds, last_heartbeat, section_scores,
      created_at, updated_at
    FROM exam_attempts
    WHERE student_id = ? AND test_id = ? AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(studentId, testId).first();
  return result;
}

export async function getExamAttempt(db, attemptId) {
  const attempt = await db.prepare(`
    SELECT
      id, student_id, test_id, test_version, start_time, end_time,
      submitted_at, expires_at, score, max_score, status,
      time_spent_seconds, last_heartbeat, section_scores,
      created_at, updated_at
    FROM exam_attempts
    WHERE id = ?
  `).bind(attemptId).first();

  return attempt || null;
}

export async function getMyAttempts(db, studentId, filters = {}) {
  let query = `
    SELECT
      a.id, a.student_id, a.test_id, a.test_version, a.start_time, a.end_time,
      a.submitted_at, a.expires_at, a.score, a.max_score, a.status,
      a.time_spent_seconds, a.last_heartbeat, a.section_scores,
      a.created_at, a.updated_at,
      t.title, t.level,
      et.code as exam_type_code, et.name as exam_type_name
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

export async function checkRegistrationStatus(db, studentId, testId) {
  const result = await db.prepare(`
    SELECT id, student_id, test_id, status, expires_at, created_at, updated_at
    FROM exam_registrations
    WHERE student_id = ? AND test_id = ?
  `).bind(studentId, testId).first();
  return result;
}