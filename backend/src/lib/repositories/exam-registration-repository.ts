// ========================================
// EXAM REGISTRATION REPOSITORY
// Handles: registerForExamTest, checkRegistrationStatus,
//          approveExamTestRegistration, rejectExamTestRegistration, getExamTestRegistrations
// Depends on: getExamTestById
// ========================================

import { getExamTestById } from './exam-test-repository.js';

interface RegistrationFilters {
  test_id?: number | string;
  student_id?: number | string;
  status?: string;
}

export async function registerForExamTest(db: D1Database, studentId: number | string, testId: number | string): Promise<{ id: number }> {
  const existing = await db.prepare(`
    SELECT * FROM exam_test_registrations
    WHERE student_id = ? AND test_id = ?
  `).bind(studentId, testId).first();

  if (existing) {
    throw new Error('Đã đăng ký bài thi này rồi');
  }

  const test = await getExamTestById(db, testId);
  if (!test) {
    throw new Error('Không tìm thấy bài thi');
  }

  let expiresAt: string | null = null;
  if (test.registration_deadline) {
    expiresAt = test.registration_deadline;
  }

  const result = await db.prepare(`
    INSERT INTO exam_test_registrations (
      student_id, test_id, status, expires_at
    ) VALUES (?, ?, 'pending', ?)
  `).bind(studentId, testId, expiresAt).run();

  return { id: result.meta.last_row_id };
}

export async function checkRegistrationStatus(db: D1Database, studentId: number | string, testId: number | string): Promise<any> {
  const registration = await db.prepare(`
    SELECT * FROM exam_test_registrations
    WHERE student_id = ? AND test_id = ?
  `).bind(studentId, testId).first();

  return registration;
}

export async function approveExamTestRegistration(db: D1Database, registrationId: number | string, adminId: number | string): Promise<any> {
  const now = new Date().toISOString();
  const result = await db.prepare(`
    UPDATE exam_test_registrations
    SET status = 'approved', approved_at = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `).bind(now, adminId, registrationId).run();

  return result;
}

export async function rejectExamTestRegistration(db: D1Database, registrationId: number | string, adminId: number | string, reason: string): Promise<any> {
  const result = await db.prepare(`
    UPDATE exam_test_registrations
    SET status = 'rejected', approved_by = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `).bind(adminId, reason, registrationId).run();

  return result;
}

export async function getExamTestRegistrations(db: D1Database, filters: RegistrationFilters = {}): Promise<any[]> {
  let query = `
    SELECT r.*,
           s.name as student_name, s.email as student_email, s.phone as student_phone,
           t.title as test_title, t.level as test_level,
           et.name as exam_type_name,
           a.name as approver_name
    FROM exam_test_registrations r
    JOIN students s ON r.student_id = s.id
    JOIN exam_tests t ON r.test_id = t.id
    JOIN exam_types et ON t.exam_type_id = et.id
    LEFT JOIN admins a ON r.approved_by = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.test_id) {
    query += ' AND r.test_id = ?';
    params.push(filters.test_id);
  }

  if (filters.student_id) {
    query += ' AND r.student_id = ?';
    params.push(filters.student_id);
  }

  if (filters.status) {
    query += ' AND r.status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY r.requested_at DESC';

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}
