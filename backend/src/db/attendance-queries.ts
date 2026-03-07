// ========================================
// ATTENDANCE QUERIES
// ========================================

export async function markAttendance(db: D1Database, registrationId: number, classId: number, attendanceDate: string, status: string, notes: string | null = null, markedBy: number | null = null, markedByType = 'admin') {
  try {
    // Validate inputs
    if (!registrationId || !classId || !attendanceDate || !status) {
      throw new Error(`Invalid parameters: registrationId=${registrationId}, classId=${classId}, attendanceDate=${attendanceDate}, status=${status}`);
    }

    // Ensure markedByType is valid
    const validRole = markedByType === 'teacher' ? 'teacher' : 'admin';

    const result = await db.prepare(`
      INSERT OR REPLACE INTO attendance (registration_id, class_id, attendance_date, status, notes, marked_by, marked_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(registrationId, classId, attendanceDate, status, notes || null, markedBy || null, validRole).run();

    if (!result || !result.meta) {
      throw new Error('Database insert failed - no result returned');
    }

    return result;
  } catch (error: any) {
    console.error('[markAttendance] Error:', {
      registrationId,
      classId,
      attendanceDate,
      status,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function getAttendanceByRegistration(db: D1Database, registrationId: number) {
  // For ONLINE attendance we store registration_id as -student_id
  const isOnline = Number(registrationId) < 0;
  const result = isOnline
    ? await db.prepare(`
        SELECT a.*,
               s.cccd,
               s.ho_ten_full as student_name
        FROM attendance a
        JOIN students s ON s.id = ABS(a.registration_id)
        WHERE a.registration_id = ?
        ORDER BY a.attendance_date DESC
      `).bind(registrationId).all()
    : await db.prepare(`
        SELECT a.*,
               s.cccd,
               s.ho_ten_full as student_name
        FROM attendance a
        JOIN registrations r ON a.registration_id = r.id
        JOIN students s ON r.student_id = s.id
        WHERE a.registration_id = ?
        ORDER BY a.attendance_date DESC
      `).bind(registrationId).all();
  return result.results || [];
}

export async function getAttendanceByClass(db: D1Database, classId: number, date: string | null = null) {
  // For ONLINE attendance we store class_id as -online_class_id and registration_id as -student_id
  const isOnline = Number(classId) < 0;
  let query = isOnline ? `
    SELECT a.*,
           s.cccd,
           s.ho_ten_full as student_name,
           NULL as so_phach
    FROM attendance a
    JOIN students s ON s.id = ABS(a.registration_id)
    WHERE a.class_id = ?
  ` : `
    SELECT a.*,
           s.cccd,
           s.ho_ten_full as student_name,
           r.so_phach
    FROM attendance a
    JOIN registrations r ON a.registration_id = r.id
    JOIN students s ON r.student_id = s.id
    WHERE a.class_id = ?
  `;
  const params: unknown[] = [classId];

  if (date) {
    query += ' AND a.attendance_date = ?';
    params.push(date);
  }

  query += ' ORDER BY a.attendance_date DESC, s.ho_ten_full';

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getAttendanceStats(db: D1Database, classId: number) {
  const result = await db.prepare(`
    SELECT
      COUNT(DISTINCT a.registration_id) as total_students,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
      COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count
    FROM attendance a
    WHERE a.class_id = ?
  `).bind(classId).first();
  return result;
}

// ========================================
// EXAM SCHEDULE QUERIES
// ========================================

export async function createExamSchedule(db: D1Database, classId: number, examName: string, examDate: string, durationMinutes = 120, location: string | null = null, notes: string | null = null, templateId: number | null = null) {
  const result = await db.prepare(`
    INSERT INTO exam_schedules (class_id, exam_name, exam_date, duration_minutes, location, notes, template_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(classId, examName, examDate, durationMinutes, location, notes, templateId).run();
  return result;
}

export async function getExamSchedulesByClass(db: D1Database, classId: number) {
  const result = await db.prepare(`
    SELECT e.*,
           c.ten_lop as class_name
    FROM exam_schedules e
    LEFT JOIN classes c ON e.class_id = c.id
    WHERE e.class_id = ? AND e.deleted_at IS NULL
    ORDER BY e.exam_date ASC
  `).bind(classId).all();
  return result.results || [];
}

export async function getUpcomingExams(db: D1Database, limit = 20) {
  const result = await db.prepare(`
    SELECT e.*,
           c.ten_lop as class_name,
           (SELECT COUNT(*) FROM exam_registrations er WHERE er.exam_id = e.id AND er.status = 'pending') as pending_count,
           (SELECT COUNT(*) FROM exam_registrations er WHERE er.exam_id = e.id AND er.status IN ('approved', 'registered')) as approved_count
    FROM exam_schedules e
    LEFT JOIN classes c ON e.class_id = c.id
    WHERE e.exam_date >= date('now', '-7 days') AND e.deleted_at IS NULL
    ORDER BY e.exam_date ASC
    LIMIT ?
  `).bind(limit).all();
  return result.results || [];
}

export async function updateExamSchedule(db: D1Database, examId: number, data: Record<string, unknown>) {
  const { exam_name, exam_date, duration_minutes, location, notes, zoom_link, zoom_meeting_id, zoom_passcode, exam_type } = data;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (exam_name !== undefined) {
    updates.push('exam_name = ?');
    values.push(exam_name);
  }
  if (exam_date !== undefined) {
    updates.push('exam_date = ?');
    values.push(exam_date);
  }
  if (duration_minutes !== undefined) {
    updates.push('duration_minutes = ?');
    values.push(duration_minutes);
  }
  if (location !== undefined) {
    updates.push('location = ?');
    values.push(location);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  if (zoom_link !== undefined) {
    updates.push('zoom_link = ?');
    values.push(zoom_link || null);
  }
  if (zoom_meeting_id !== undefined) {
    updates.push('zoom_meeting_id = ?');
    values.push(zoom_meeting_id || null);
  }
  if (zoom_passcode !== undefined) {
    updates.push('zoom_passcode = ?');
    values.push(zoom_passcode || null);
  }
  // exam_type: optional field for categorizing exam (VSTEP, TOPIK, MOS, IC3, etc.)
  if (exam_type !== undefined) {
    updates.push('exam_type = ?');
    values.push(exam_type ? (exam_type as string).trim() : null);
  }

  values.push(examId);

  const result = await db.prepare(`
    UPDATE exam_schedules SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();
  return result;
}


// Soft delete - chuyen vao thung rac
export async function deleteExamSchedule(db: D1Database, examId: number) {
  const result = await db.prepare(
    'UPDATE exam_schedules SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL'
  ).bind(examId).run();
  return result;
}

// Khoi phuc tu thung rac
export async function restoreExamSchedule(db: D1Database, examId: number) {
  const result = await db.prepare(
    'UPDATE exam_schedules SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL'
  ).bind(examId).run();
  return result;
}

// Lay danh sach da xoa (thung rac) - trong vong 7 ngay
export async function getDeletedExamSchedules(db: D1Database) {
  const result = await db.prepare(`
    SELECT e.*,
           c.ten_lop as class_name,
           ROUND((JULIANDAY(datetime(e.deleted_at, '+7 days')) - JULIANDAY('now')) * 24) as hours_remaining
    FROM exam_schedules e
    LEFT JOIN classes c ON e.class_id = c.id
    WHERE e.deleted_at IS NOT NULL
      AND datetime(e.deleted_at, '+7 days') > datetime('now')
    ORDER BY e.deleted_at DESC
  `).all();
  return result.results || [];
}

// Xoa vinh vien
export async function permanentlyDeleteExamSchedule(db: D1Database, examId: number) {
  const result = await db.prepare(
    'DELETE FROM exam_schedules WHERE id = ? AND deleted_at IS NOT NULL'
  ).bind(examId).run();
  return result;
}

// Don dep cac items qua 7 ngay
export async function cleanupOldDeletedExams(db: D1Database) {
  const result = await db.prepare(`
    DELETE FROM exam_schedules
    WHERE deleted_at IS NOT NULL
      AND datetime(deleted_at, '+7 days') <= datetime('now')
  `).run();
  return result;
}


export async function getStudentExams(db: D1Database, studentId: number) {
  const result = await db.prepare(`
    SELECT e.*,
           c.ten_lop as class_name,
           er.status as registration_status
    FROM exam_schedules e
    LEFT JOIN classes c ON e.class_id = c.id
    LEFT JOIN exam_registrations er ON e.id = er.exam_id AND er.student_id = ?
    WHERE e.deleted_at IS NULL
      AND (
        e.class_id IN (
          SELECT class_id
          FROM registrations
          WHERE student_id = ?
          AND status IN ('confirmed', 'paid', 'studying')
        )
        OR e.class_id IS NULL
      )
    ORDER BY e.exam_date ASC
  `).bind(studentId, studentId).all();
  return result.results || [];
}

// Student tu dang ky thi -> status = 'pending'
// Toi da 2 dang ky active cung luc
export async function registerStudentForExam(db: D1Database, examId: number, studentId: number, createdBy: any = null) {
  const options = typeof createdBy === 'object' && createdBy !== null ? createdBy : {};
  const adminId = typeof createdBy === 'number' ? createdBy : null;
  const force = !!options.force;
  const status = adminId ? 'approved' : 'pending';
  const MAX_ACTIVE = 2;

  // Lay tat ca dang ky active cho cac ky thi KHAC
  const existingActives = await db.prepare(`
    SELECT er.id, er.exam_id, er.status, er.created_at,
           es.exam_name, es.exam_date
    FROM exam_registrations er
    LEFT JOIN exam_schedules es ON es.id = er.exam_id
    WHERE er.student_id = ?
      AND er.status IN ('pending','approved','registered')
      AND er.exam_id != ?
    ORDER BY datetime(er.created_at) ASC, er.id ASC
  `).bind(studentId, examId).all();

  const actives: any[] = existingActives.results || [];

  if (actives.length >= MAX_ACTIVE) {
    if (!adminId && !force) {
      const newest = actives[actives.length - 1];
      const err: any = new Error('STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION');
      err.code = 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION';
      err.details = {
        existing_exam_id: newest.exam_id,
        existing_exam_name: newest.exam_name,
        existing_exam_date: newest.exam_date,
        existing_status: newest.status,
        count: actives.length,
        max: MAX_ACTIVE,
      };
      throw err;
    }

    // force hoac admin: huy dang ky cu nhat de nhuong cho
    const oldest = actives[0];
    await db.prepare(`
      UPDATE exam_registrations SET status = 'cancelled' WHERE id = ?
    `).bind(oldest.id).run();
  }

  // Upsert: neu da co (ke ca cancelled) thi update lai status
  const result = await db.prepare(`
    INSERT INTO exam_registrations (exam_id, student_id, status, created_by, approved_at, approved_by)
    VALUES (?, ?, ?, ?, ${adminId ? 'CURRENT_TIMESTAMP' : 'NULL'}, ?)
    ON CONFLICT(exam_id, student_id) DO UPDATE SET
      status = excluded.status,
      created_at = CURRENT_TIMESTAMP,
      created_by = excluded.created_by,
      approved_at = excluded.approved_at,
      approved_by = excluded.approved_by
  `).bind(examId, studentId, status, adminId, adminId).run();
  return result;
}

export async function cancelExamRegistration(db: D1Database, examId: number, studentId: number) {
  const result = await db.prepare(`
    UPDATE exam_registrations SET status = 'cancelled'
    WHERE exam_id = ? AND student_id = ?
  `).bind(examId, studentId).run();
  return result;
}

// Lay danh sach da duyet (approved) - dung cho export va hien thi chinh
export async function getExamRegistrations(db: D1Database, examId: number) {
  const result = await db.prepare(`
    SELECT r.id as registration_id,
           r.status as registration_status,
           r.created_at as registration_date,
           r.created_by,
           r.approved_at,
           r.approved_by,
           s.id as student_id,
           s.ho_ten_full,
           s.ngay_sinh,
           s.gioi_tinh,
           s.cccd,
           s.sdt,
           s.email,
           s.dia_chi,
           s.noi_sinh,
           s.image_3x4,
           s.created_at as student_created_at
    FROM exam_registrations r
    JOIN students s ON r.student_id = s.id
    WHERE r.exam_id = ? AND r.status IN ('approved', 'registered')
    ORDER BY r.created_at DESC
  `).bind(examId).all();
  return result.results || [];
}

// Lay danh sach cho duyet (pending)
export async function getPendingExamRegistrations(db: D1Database, examId: number) {
  const result = await db.prepare(`
    SELECT r.id as registration_id,
           r.status as registration_status,
           r.created_at as registration_date,
           r.created_by,
           s.id as student_id,
           s.ho_ten_full,
           s.ngay_sinh,
           s.gioi_tinh,
           s.cccd,
           s.sdt,
           s.email,
           s.dia_chi,
           s.noi_sinh,
           s.image_3x4
    FROM exam_registrations r
    JOIN students s ON r.student_id = s.id
    WHERE r.exam_id = ? AND r.status = 'pending'
    ORDER BY r.created_at DESC
  `).bind(examId).all();
  return result.results || [];
}

// Duyet 1 thi sinh
export async function approveExamRegistration(db: D1Database, examId: number, studentId: number, approvedBy: number) {
  const result = await db.prepare(`
    UPDATE exam_registrations
    SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?
    WHERE exam_id = ? AND student_id = ? AND status = 'pending'
  `).bind(approvedBy, examId, studentId).run();
  return result;
}

// Duyet tat ca pending
export async function approveAllExamRegistrations(db: D1Database, examId: number, approvedBy: number) {
  const result = await db.prepare(`
    UPDATE exam_registrations
    SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?
    WHERE exam_id = ? AND status = 'pending'
  `).bind(approvedBy, examId).run();
  return result;
}

// Tu choi 1 thi sinh
export async function rejectExamRegistration(db: D1Database, examId: number, studentId: number, rejectedBy: number) {
  const result = await db.prepare(`
    UPDATE exam_registrations
    SET status = 'rejected', approved_at = CURRENT_TIMESTAMP, approved_by = ?
    WHERE exam_id = ? AND student_id = ? AND status = 'pending'
  `).bind(rejectedBy, examId, studentId).run();
  return result;
}
