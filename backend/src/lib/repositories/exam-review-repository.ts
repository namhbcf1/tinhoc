// ========================================
// EXAM REVIEW REPOSITORY
// Handles: submitTestForReview, approveTest, rejectTest, getPendingTests, getTestReviews
// Depends on: getExamTestById
// ========================================

import { getExamTestById } from './exam-test-repository.js';

export async function submitTestForReview(db: D1Database, testId: number | string, teacherId: number | string): Promise<any> {
  const result = await db.prepare(`
    UPDATE exam_tests
    SET status = 'pending_review', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND created_by = ?
  `).bind(testId, teacherId).run();

  if (result.meta.changes === 0) {
    throw new Error('Không tìm thấy bài thi hoặc không có quyền');
  }

  await db.prepare(`
    INSERT INTO exam_test_reviews (test_id, reviewer_id, action, comment)
    VALUES (?, ?, 'submit', 'Giáo viên gửi đề để duyệt')
  `).bind(testId, teacherId).run();

  return result;
}

export async function approveTest(db: D1Database, testId: number | string, adminId: number | string, comment: string | null = null): Promise<any> {
  const now = new Date().toISOString();

  // First check if status column exists, if not, just update without status check
  try {
    // Try to get the test first to check if it exists
    const test = await getExamTestById(db, testId);
    if (!test) {
      throw new Error('Không tìm thấy bài thi');
    }

    // Check if status column exists by trying to read it
    const hasStatus = test.hasOwnProperty('status') || test.status !== undefined;

    if (hasStatus) {
      // Allow approving from both 'draft' and 'pending_review' status
      const result = await db.prepare(`
        UPDATE exam_tests
        SET status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status IN ('draft', 'pending_review')
      `).bind(adminId, now, testId).run();

      if (result.meta.changes === 0) {
        throw new Error('Không tìm thấy bài thi hoặc bài thi không thể duyệt (có thể đã được duyệt/từ chối)');
      }

      // Insert review record if table exists
      try {
        await db.prepare(`
          INSERT INTO exam_test_reviews (test_id, reviewer_id, action, comment)
          VALUES (?, ?, 'approve', ?)
        `).bind(testId, adminId, comment || 'Đề được duyệt').run();
      } catch (err) {
        // Table might not exist, ignore
        console.warn('Could not insert review record:', err);
      }

      return result;
    } else {
      // Status column doesn't exist, just update reviewed_by and reviewed_at if columns exist
      const result = await db.prepare(`
        UPDATE exam_tests
        SET reviewed_by = ?, reviewed_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(adminId, now, testId).run();

      if (result.meta.changes === 0) {
        throw new Error('Không tìm thấy bài thi');
      }

      return result;
    }
  } catch (error: any) {
    if (error.message.includes('no such column')) {
      // Status column doesn't exist, update without it
      const result = await db.prepare(`
        UPDATE exam_tests
        SET reviewed_by = ?, reviewed_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(adminId, now, testId).run();

      if (result.meta.changes === 0) {
        throw new Error('Không tìm thấy bài thi');
      }

      return result;
    }
    throw error;
  }
}

export async function rejectTest(db: D1Database, testId: number | string, adminId: number | string, reason: string): Promise<any> {
  const now = new Date().toISOString();
  const result = await db.prepare(`
    UPDATE exam_tests
    SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending_review'
  `).bind(adminId, now, reason, testId).run();

  if (result.meta.changes === 0) {
    throw new Error('Không tìm thấy bài thi hoặc không ở trạng thái chờ duyệt');
  }

  await db.prepare(`
    INSERT INTO exam_test_reviews (test_id, reviewer_id, action, comment)
    VALUES (?, ?, 'reject', ?)
  `).bind(testId, adminId, reason).run();

  return result;
}

export async function getPendingTests(db: D1Database): Promise<any[]> {
  try {
    const result = await db.prepare(`
      SELECT t.*, et.name as exam_type_name,
             a.name as creator_name,
             r.name as reviewer_name
      FROM exam_tests t
      JOIN exam_types et ON t.exam_type_id = et.id
      LEFT JOIN admins a ON t.created_by = a.id
      LEFT JOIN admins r ON t.reviewed_by = r.id
      WHERE t.status IN ('draft', 'pending_review') OR t.status IS NULL
      ORDER BY t.created_at ASC
    `).all();

    return result.results || [];
  } catch (error: any) {
    // If status column doesn't exist, return all tests
    if (error.message && error.message.includes('no such column')) {
      const result = await db.prepare(`
        SELECT t.*, et.name as exam_type_name,
               a.name as creator_name,
               r.name as reviewer_name
        FROM exam_tests t
        JOIN exam_types et ON t.exam_type_id = et.id
        LEFT JOIN admins a ON t.created_by = a.id
        LEFT JOIN admins r ON t.reviewed_by = r.id
        ORDER BY t.created_at ASC
      `).all();

      return result.results || [];
    }
    throw error;
  }
}

export async function getTestReviews(db: D1Database, testId: number | string): Promise<any[]> {
  const result = await db.prepare(`
    SELECT r.*, a.name as reviewer_name
    FROM exam_test_reviews r
    LEFT JOIN admins a ON r.reviewer_id = a.id
    WHERE r.test_id = ?
    ORDER BY r.created_at ASC
  `).bind(testId).all();

  return result.results || [];
}
