/**
 * Registration database queries
 * Handles: CRUD + status updates + so_phach for registrations table
 */

// ========================================
// FIND
// ========================================

export async function findRegistration(db: D1Database, studentId: number, classId: number) {
  const result = await db.prepare(
    'SELECT * FROM registrations WHERE student_id = ? AND class_id = ?'
  ).bind(studentId, classId).first();
  return result;
}

export async function getRegistrationsByClass(db: D1Database, classId: number) {
  // Fetch payment status via subquery (avoids N+1)
  const result = await db.prepare(`
    SELECT
      r.id as registration_id,
      r.so_phach,
      r.status,
      r.created_at,
      COALESCE(
        (SELECT status FROM payments
           WHERE registration_id = r.id
           AND status = 'confirmed'
           ORDER BY created_at DESC
           LIMIT 1),
        'unpaid'
      ) as payment_status,
      COALESCE(
        (SELECT SUM(amount) FROM payments
           WHERE registration_id = r.id
           AND status = 'confirmed'),
        0
      ) as paid_amount,
      s.*
    FROM registrations r
    JOIN students s ON r.student_id = s.id
    WHERE r.class_id = ?
    ORDER BY s.ho_ten_full ASC
      `).bind(classId).all();

  return result.results || [];
}

export async function getStudentRegistrations(db: D1Database, studentId: number) {
  // Query 1: Study classes (from registrations table)
  const studyQuery = db.prepare(`
    SELECT
      r.id as registration_id,
      r.class_id,
      r.status as status,
      r.created_at as registration_created_at,
      COALESCE(
        (SELECT status FROM payments
         WHERE registration_id = r.id
         AND status = 'confirmed'
         ORDER BY created_at DESC
         LIMIT 1),
        'unpaid'
      ) as payment_status,
      COALESCE(
        (SELECT SUM(amount) FROM payments
         WHERE registration_id = r.id
         AND status = 'confirmed'),
        0
      ) as paid_amount,
      c.id as class_id,
      c.ten_lop,
      c.ma_lop,
      c.ngay_bat_dau,
      c.ngay_ket_thuc,
      c.ngay_thi,
      c.gio_thi,
      c.dia_diem,
      c.hoc_phi,
      c.open_at,
      c.close_at,
      c.status as class_status,
      c.class_type,
      c.max_students,
      c.current_students,
      c.created_at as class_created_at,
      c.updated_at as class_updated_at
    FROM registrations r
    JOIN classes c ON r.class_id = c.id
    WHERE r.student_id = ?
  `).bind(studentId);

  // Query 2: Exam registrations (from exam_registrations table)
  const examQuery = db.prepare(`
    SELECT
      er.id as registration_id,
      er.exam_id as class_id,
      er.status as status,
      er.created_at as registration_created_at,
      'approved' as payment_status,
      0 as paid_amount,
      es.id as exam_id,
      es.exam_name as ten_lop,
      'EXAM-' || es.id as ma_lop,
      es.exam_date as ngay_thi,
      es.exam_date as ngay_bat_dau,
      es.location as dia_diem,
      es.duration_minutes,
      'thi' as class_type
    FROM exam_registrations er
    JOIN exam_schedules es ON er.exam_id = es.id
    WHERE er.student_id = ?
  `).bind(studentId);

  // Execute both in parallel via D1 batch
  const [studyResult, examResult] = await db.batch([studyQuery, examQuery]);

  const studyRegistrations = studyResult.results || [];
  const examRegistrations = examResult.results || [];

  // Combine and sort by date descending
  return [...studyRegistrations, ...examRegistrations].sort((a: any, b: any) => {
    const dateA = new Date(a.ngay_thi || a.registration_created_at);
    const dateB = new Date(b.ngay_thi || b.registration_created_at);
    return dateB.getTime() - dateA.getTime();
  });
}

// ========================================
// CREATE
// ========================================

export async function createRegistration(db: D1Database, studentId: number, classId: number) {
  // Note: payment_status is tracked in separate payments table
  const result = await db.prepare(`
    INSERT INTO registrations(student_id, class_id, status)
    VALUES(?, ?, 'pending')
      `).bind(studentId, classId).run();

  // Increment class student count
  await db.prepare(`
    UPDATE classes
    SET current_students = current_students + 1,
        updated_at = datetime('now', '+7 hours')
    WHERE id = ?
    `).bind(classId).run();

  return { success: true, meta: result.meta };
}

// ========================================
// UPDATE
// ========================================

export async function updateRegistrationStatus(db: D1Database, id: number, status: string, paymentStatus?: string) {
  // paymentStatus param kept for backward compatibility but unused (tracked in payments table)
  if (!status) {
    return { success: false, error: 'Status is required' };
  }

  try {
    const validStatuses = ['pending', 'approved', 'studying', 'completed', 'certified', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      };
    }

    const result = await db.prepare(`
      UPDATE registrations SET
        status = ?,
        updated_at = datetime('now', '+7 hours')
      WHERE id = ?
    `).bind(status, id).run();

    return { success: true, meta: result.meta };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSoPhach(db: D1Database, registrationId: number, soPhach: string) {
  const result = await db.prepare(`
    UPDATE registrations SET
      so_phach = ?,
      updated_at = datetime('now', '+7 hours')
    WHERE id = ?
    `).bind(soPhach, registrationId).run();

  return result;
}

// ========================================
// DELETE
// ========================================

export async function deleteRegistration(db: D1Database, registrationId: number) {
  // Get class_id before deleting
  const registration = await db.prepare(
    'SELECT class_id FROM registrations WHERE id = ?'
  ).bind(registrationId).first<{ class_id: number }>();

  if (!registration) {
    return { success: false, error: 'Registration not found' };
  }

  // Delete registration
  const result = await db.prepare(
    'DELETE FROM registrations WHERE id = ?'
  ).bind(registrationId).run();

  // Recalculate class student count
  if (result.meta) {
    await syncClassStudentCount(db, registration.class_id);
  }

  return { success: true, meta: result.meta };
}

// ========================================
// HELPERS
// ========================================

export async function syncClassStudentCount(db: D1Database, classId: number) {
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM registrations WHERE class_id = ?
  `).bind(classId).first<{ count: number }>();

  const actualCount = countResult?.count || 0;

  await db.prepare(`
    UPDATE classes
    SET current_students = ?,
        updated_at = datetime('now', '+7 hours')
    WHERE id = ?
  `).bind(actualCount, classId).run();

  return actualCount;
}
