// ========================================
// EXAM ACCESS REPOSITORY
// Handles: updateHeartbeat, validateAttemptAccess, checkAttemptExpiry,
//          rateLimitAttempts, checkTestAccess
// Depends on: getExamTestById, rateLimitAttempts, checkRegistrationStatus
// ========================================

import { getExamTestById } from './exam-test-repository.js';
import { checkRegistrationStatus } from './exam-registration-repository.js';

export async function updateHeartbeat(db: D1Database, attemptId: number | string): Promise<any> {
  const now = new Date().toISOString();
  const result = await db.prepare(`
    UPDATE exam_attempts
    SET last_heartbeat = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(now, attemptId).run();

  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ?
  `).bind(attemptId).first<any>();

  if (attempt && attempt.expires_at) {
    const expiresAt = new Date(attempt.expires_at);
    const nowDate = new Date();
    if (nowDate > expiresAt && attempt.status === 'in_progress') {
      await db.prepare(`
        UPDATE exam_attempts SET status = 'expired' WHERE id = ?
      `).bind(attemptId).run();
    }
  }

  return result;
}

export async function validateAttemptAccess(db: D1Database, studentId: number | string, attemptId: number | string): Promise<boolean> {
  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ? AND student_id = ?
  `).bind(attemptId, studentId).first();
  return !!attempt;
}

export async function checkAttemptExpiry(db: D1Database, attemptId: number | string): Promise<boolean> {
  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ?
  `).bind(attemptId).first<any>();

  if (!attempt) return false;

  if (attempt.expires_at) {
    const expiresAt = new Date(attempt.expires_at);
    const now = new Date();
    if (now > expiresAt && attempt.status === 'in_progress') {
      await db.prepare(`
        UPDATE exam_attempts SET status = 'expired' WHERE id = ?
      `).bind(attemptId).run();
      return true;
    }
  }

  if (attempt.last_heartbeat) {
    const lastHeartbeat = new Date(attempt.last_heartbeat);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastHeartbeat.getTime()) / (1000 * 60);
    if (diffMinutes > 5 && attempt.status === 'in_progress') {
      await db.prepare(`
        UPDATE exam_attempts SET status = 'expired' WHERE id = ?
      `).bind(attemptId).run();
      return true;
    }
  }

  return false;
}

export async function rateLimitAttempts(db: D1Database, studentId: number | string, testId: number | string): Promise<boolean> {
  const test = await getExamTestById(db, testId);
  if (!test) return false;

  if (test.max_attempts_per_student === null || test.max_attempts_per_student === undefined) {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM exam_attempts
      WHERE student_id = ? AND test_id = ?
      AND DATE(created_at) = ?
    `).bind(studentId, testId, today).first<any>();
    return (result?.count || 0) < 3;
  }

  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM exam_attempts
    WHERE student_id = ? AND test_id = ? AND status IN ('submitted', 'expired', 'abandoned')
  `).bind(studentId, testId).first<any>();

  return (result?.count || 0) < test.max_attempts_per_student;
}

export async function checkTestAccess(db: D1Database, studentId: number | string, testId: number | string): Promise<{ allowed: boolean; reason?: string }> {
  const test = await getExamTestById(db, testId);
  if (!test) {
    return { allowed: false, reason: 'Không tìm thấy bài thi' };
  }

  if (test.status !== 'approved') {
    return { allowed: false, reason: 'Bài thi chưa được duyệt' };
  }

  if (test.is_active !== 1) {
    return { allowed: false, reason: 'Bài thi đã bị tắt' };
  }

  if (test.registration_deadline) {
    const deadline = new Date(test.registration_deadline);
    const now = new Date();
    if (now > deadline) {
      return { allowed: false, reason: 'Đã hết hạn đăng ký' };
    }
  }

  if (test.requires_registration) {
    const registration = await checkRegistrationStatus(db, studentId, testId);
    if (!registration) {
      return { allowed: false, reason: 'Chưa đăng ký bài thi này' };
    }
    if (registration.status !== 'approved') {
      if (registration.status === 'pending') {
        return { allowed: false, reason: 'Đăng ký đang chờ duyệt' };
      }
      if (registration.status === 'rejected') {
        return { allowed: false, reason: 'Đăng ký đã bị từ chối: ' + (registration.rejection_reason || '') };
      }
    }
    if (registration.expires_at) {
      const expiresAt = new Date(registration.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        return { allowed: false, reason: 'Đăng ký đã hết hạn' };
      }
    }
  }

  if (test.exam_schedule_id) {
    const scheduleReg = await db.prepare(`
      SELECT * FROM exam_registrations
      WHERE exam_schedule_id = ? AND student_id = ? AND status = 'approved'
    `).bind(test.exam_schedule_id, studentId).first();

    if (!scheduleReg) {
      return { allowed: false, reason: 'Chưa đăng ký lịch thi tương ứng' };
    }
  }

  const canAttempt = await rateLimitAttempts(db, studentId, testId);
  if (!canAttempt) {
    const maxAttempts = test.max_attempts_per_student || 3;
    return { allowed: false, reason: `Đã vượt quá số lần thi cho phép (${maxAttempts} lần)` };
  }

  return { allowed: true };
}
