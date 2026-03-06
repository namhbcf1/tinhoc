// ========================================
// ATTENDANCE QUERIES
// ========================================

export async function markAttendance(db, registrationId, classId, attendanceDate, status, notes = null, markedBy = null, markedByType = 'admin') {
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
  } catch (error) {
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

export async function getAttendanceByRegistration(db, registrationId) {
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

export async function getAttendanceByClass(db, classId, date = null) {
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
  const params = [classId];

  if (date) {
    query += ' AND a.attendance_date = ?';
    params.push(date);
  }

  query += ' ORDER BY a.attendance_date DESC, s.ho_ten_full';

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getAttendanceStats(db, classId) {
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

export async function createExamSchedule(db, classId, examName, examDate, durationMinutes = 120, location = null, notes = null, templateId = null) {
  const result = await db.prepare(`
    INSERT INTO exam_schedules (class_id, exam_name, exam_date, duration_minutes, location, notes, template_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(classId, examName, examDate, durationMinutes, location, notes, templateId).run();
  return result;
}

export async function getExamSchedulesByClass(db, classId) {
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

export async function getUpcomingExams(db, limit = 20) {
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

export async function updateExamSchedule(db, examId, data) {
  const { exam_name, exam_date, duration_minutes, location, notes, zoom_link, zoom_meeting_id, zoom_passcode, exam_type } = data;
  const updates = [];
  const values = [];

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
    values.push(exam_type ? exam_type.trim() : null);
  }

  values.push(examId);

  const result = await db.prepare(`
    UPDATE exam_schedules SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();
  return result;
}


// Soft delete - chuyển vào thùng rác
export async function deleteExamSchedule(db, examId) {
  const result = await db.prepare(
    'UPDATE exam_schedules SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL'
  ).bind(examId).run();
  return result;
}

// Khôi phục từ thùng rác
export async function restoreExamSchedule(db, examId) {
  const result = await db.prepare(
    'UPDATE exam_schedules SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL'
  ).bind(examId).run();
  return result;
}

// Lấy danh sách đã xóa (thùng rác) - trong vòng 7 ngày
export async function getDeletedExamSchedules(db) {
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

// Xóa vĩnh viễn
export async function permanentlyDeleteExamSchedule(db, examId) {
  const result = await db.prepare(
    'DELETE FROM exam_schedules WHERE id = ? AND deleted_at IS NOT NULL'
  ).bind(examId).run();
  return result;
}

// Dọn dẹp các items quá 7 ngày
export async function cleanupOldDeletedExams(db) {
  const result = await db.prepare(`
    DELETE FROM exam_schedules 
    WHERE deleted_at IS NOT NULL 
      AND datetime(deleted_at, '+7 days') <= datetime('now')
  `).run();
  return result;
}


export async function getStudentExams(db, studentId) {
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

// Student tự đăng ký thi -> status = 'pending'
// Tối đa 2 đăng ký active cùng lúc
export async function registerStudentForExam(db, examId, studentId, createdBy = null) {
  const options = typeof createdBy === 'object' && createdBy !== null ? createdBy : {};
  const adminId = typeof createdBy === 'number' ? createdBy : null;
  const force = !!options.force;
  const status = adminId ? 'approved' : 'pending';
  const MAX_ACTIVE = 2;

  // Lấy tất cả đăng ký active cho các kỳ thi KHÁC
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

  const actives = existingActives.results || [];

  if (actives.length >= MAX_ACTIVE) {
    if (!adminId && !force) {
      const newest = actives[actives.length - 1];
      const err = new Error('STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION');
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

    // force hoặc admin: hủy đăng ký cũ nhất để nhường chỗ
    const oldest = actives[0];
    await db.prepare(`
      UPDATE exam_registrations SET status = 'cancelled' WHERE id = ?
    `).bind(oldest.id).run();
  }

  // Upsert: nếu đã có (kể cả cancelled) thì update lại status
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

export async function cancelExamRegistration(db, examId, studentId) {
  const result = await db.prepare(`
    UPDATE exam_registrations SET status = 'cancelled'
    WHERE exam_id = ? AND student_id = ?
  `).bind(examId, studentId).run();
  return result;
}

// Lấy danh sách đã duyệt (approved) - dùng cho export và hiển thị chính
export async function getExamRegistrations(db, examId) {
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

// Lấy danh sách chờ duyệt (pending)
export async function getPendingExamRegistrations(db, examId) {
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

// Duyệt 1 thí sinh
export async function approveExamRegistration(db, examId, studentId, approvedBy) {
  const result = await db.prepare(`
    UPDATE exam_registrations 
    SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?
    WHERE exam_id = ? AND student_id = ? AND status = 'pending'
  `).bind(approvedBy, examId, studentId).run();
  return result;
}

// Duyệt tất cả pending
export async function approveAllExamRegistrations(db, examId, approvedBy) {
  const result = await db.prepare(`
    UPDATE exam_registrations 
    SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ?
    WHERE exam_id = ? AND status = 'pending'
  `).bind(approvedBy, examId).run();
  return result;
}

// Từ chối 1 thí sinh
export async function rejectExamRegistration(db, examId, studentId, rejectedBy) {
  const result = await db.prepare(`
    UPDATE exam_registrations 
    SET status = 'rejected', approved_at = CURRENT_TIMESTAMP, approved_by = ?
    WHERE exam_id = ? AND student_id = ? AND status = 'pending'
  `).bind(rejectedBy, examId, studentId).run();
  return result;
}
