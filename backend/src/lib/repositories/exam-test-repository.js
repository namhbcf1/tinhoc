// ========================================
// EXAM TEST REPOSITORY
// Handles: getExamTests, getExamTestById, createExamTest, updateExamTest, deleteExamTest
// ========================================

export async function getExamTests(db, filters = {}) {
  let query = 'SELECT t.*, et.code as exam_type_code, et.name as exam_type_name FROM exam_tests t JOIN exam_types et ON t.exam_type_id = et.id WHERE 1=1';
  const params = [];

  if (filters.exam_type_id) {
    query += ' AND t.exam_type_id = ?';
    params.push(filters.exam_type_id);
  }

  if (filters.level) {
    query += ' AND t.level = ?';
    params.push(filters.level);
  }

  if (filters.is_active !== undefined) {
    query += ' AND t.is_active = ?';
    params.push(filters.is_active ? 1 : 0);
  }

  query += ' ORDER BY t.created_at DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getExamTestById(db, testId) {
  const result = await db.prepare(`
    SELECT t.*, et.code as exam_type_code, et.name as exam_type_name
    FROM exam_tests t
    JOIN exam_types et ON t.exam_type_id = et.id
    WHERE t.id = ?
  `).bind(testId).first();
  return result;
}

export async function createExamTest(db, data) {
  const {
    exam_type_id, level, title, description, duration_minutes,
    passing_score, shuffle_questions, shuffle_options, created_by,
    requires_registration, max_attempts_per_student, registration_deadline, exam_schedule_id
  } = data;

  const result = await db.prepare(`
    INSERT INTO exam_tests (
      exam_type_id, level, title, description, duration_minutes,
      passing_score, shuffle_questions, shuffle_options, created_by,
      status, requires_registration, max_attempts_per_student, registration_deadline, exam_schedule_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)
  `).bind(
    exam_type_id, level, title, description || null, duration_minutes,
    passing_score || null, shuffle_questions ? 1 : 0, shuffle_options ? 1 : 0, created_by,
    requires_registration ? 1 : 0, max_attempts_per_student || null,
    registration_deadline || null, exam_schedule_id || null
  ).run();

  return result;
}

export async function updateExamTest(db, testId, data) {
  const updates = [];
  const params = [];

  Object.keys(data).forEach(key => {
    if (key !== 'id' && data[key] !== undefined) {
      updates.push(`${key} = ?`);
      if (typeof data[key] === 'boolean') {
        params.push(data[key] ? 1 : 0);
      } else {
        params.push(data[key]);
      }
    }
  });

  if (updates.length === 0) return { meta: { changes: 0 } };

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(testId);

  const result = await db.prepare(`
    UPDATE exam_tests SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run();

  return result;
}

export async function deleteExamTest(db, testId) {
  const result = await db.prepare(`
    UPDATE exam_tests SET is_active = 0 WHERE id = ?
  `).bind(testId).run();
  return result;
}
