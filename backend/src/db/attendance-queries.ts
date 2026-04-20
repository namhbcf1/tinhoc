// ========================================
// ATTENDANCE QUERIES
// ========================================

const buildTestStudentFilter = (alias = 's') => `
  NOT (
    LOWER(COALESCE(${alias}.ho_ten_full, '')) LIKE 'test hoc vien%'
    OR LOWER(COALESCE(${alias}.cccd, '')) LIKE 'test%'
    OR LOWER(COALESCE(${alias}.email, '')) LIKE '%@student.local'
    OR (
      TRIM(COALESCE(${alias}.cccd, '')) GLOB '[0-9][0-9][0-9]'
      AND CAST(TRIM(COALESCE(${alias}.cccd, '')) AS INTEGER) BETWEEN 1 AND 19
    )
    OR (
      TRIM(COALESCE(${alias}.cccd, '')) GLOB '[0-9][0-9][0-9][0-9]'
      AND CAST(TRIM(COALESCE(${alias}.cccd, '')) AS INTEGER) BETWEEN 1 AND 19
    )
    OR (
      TRIM(COALESCE(${alias}.ho_ten_full, '')) GLOB '[0-9][0-9][0-9]'
      AND CAST(TRIM(COALESCE(${alias}.ho_ten_full, '')) AS INTEGER) BETWEEN 1 AND 19
    )
    OR (
      TRIM(COALESCE(${alias}.ho_ten_full, '')) GLOB '[0-9][0-9][0-9][0-9]'
      AND CAST(TRIM(COALESCE(${alias}.ho_ten_full, '')) AS INTEGER) BETWEEN 1 AND 19
    )
  )
`;

const hasExamRegistrationPaymentStatusColumn = async (db: D1Database) => {
  const result = await db.prepare(`PRAGMA table_info(exam_registrations)`).all();
  return (result.results || []).some((column: any) => column?.name === 'payment_status');
};

const buildExamRegistrationPaymentStatusSelect = (alias = 'r') => `
  CASE
    WHEN ${alias}.status = 'pending' THEN 'unknown'
    WHEN ${alias}.payment_status = 'paid' THEN 'paid'
    WHEN ${alias}.payment_status = 'unpaid' THEN 'unpaid'
    WHEN ${alias}.status IN ('approved', 'registered') THEN 'unpaid'
    ELSE 'unknown'
  END
`;

const getExamRegistrationPaymentStatusSelect = async (db: D1Database, alias = 'r') => (
  await hasExamRegistrationPaymentStatusColumn(db)
    ? buildExamRegistrationPaymentStatusSelect(alias)
    : `'unknown'`
);

const ensureExamRegistrationPaymentStatusColumn = async (db: D1Database) => {
  if (await hasExamRegistrationPaymentStatusColumn(db)) {
    return;
  }

  await db.prepare(`
    ALTER TABLE exam_registrations
    ADD COLUMN payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid'))
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_exam_registrations_payment_status
    ON exam_registrations(payment_status)
  `).run();
};

export async function markAttendance(db: D1Database, registrationId: number, classId: number, attendanceDate: string, status: string, notes: string | null = null, markedBy: number | null = null, markedByType = 'admin') {
  try {
    // Validate inputs
    if (!registrationId || !classId || !attendanceDate || !status) {
      throw new Error(`Invalid parameters: registrationId=${registrationId}, classId=${classId}, attendanceDate=${attendanceDate}, status=${status}`);
    }

    // All staff are admin now — always use 'admin' as role
    const validRole = 'admin';

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

export async function getOnlineAttendanceByStudent(db: D1Database, studentId: number) {
  const result = await db.prepare(`
    SELECT
      oc.id AS online_class_id,
      oc.class_name,
      oc.teacher_name,
      oc.source_kind,
      ocs.id AS session_id,
      ocs.session_date,
      ocs.start_time,
      ocs.end_time,
      ocs.note AS session_note,
      oca.status,
      oca.note AS attendance_note,
      oca.checked_in_at,
      oca.zoom_join_source
    FROM online_class_enrollments oce
    JOIN online_classes oc ON oc.id = oce.online_class_id
    LEFT JOIN online_class_sessions ocs ON ocs.online_class_id = oc.id
    LEFT JOIN online_class_attendance oca
      ON oca.session_id = ocs.id
      AND oca.student_id = oce.student_id
    WHERE oce.student_id = ?
      AND oce.status = 'active'
      AND oc.deleted_at IS NULL
    ORDER BY LOWER(COALESCE(oc.class_name, '')) ASC, date(ocs.session_date) DESC, ocs.id DESC
  `).bind(studentId).all();

  const grouped = new Map<number, {
    online_class_id: number;
    class_name: string;
    teacher_name: string | null;
    source_kind: string | null;
    records: Array<{
      session_id: number;
      date: string | null;
      start_time: string | null;
      end_time: string | null;
      status: string;
      notes: string | null;
      checked_in_at: string | null;
      join_source: string | null;
    }>;
  }>();

  for (const row of (result.results || []) as any[]) {
    const classId = Number(row.online_class_id);
    if (!Number.isFinite(classId) || classId <= 0) {
      continue;
    }

    if (!grouped.has(classId)) {
      grouped.set(classId, {
        online_class_id: classId,
        class_name: String(row.class_name || `Lớp online #${classId}`),
        teacher_name: row.teacher_name ? String(row.teacher_name) : null,
        source_kind: row.source_kind ? String(row.source_kind) : null,
        records: [],
      });
    }

    const sessionId = Number(row.session_id);
    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      continue;
    }

    grouped.get(classId)?.records.push({
      session_id: sessionId,
      date: row.session_date ? String(row.session_date) : null,
      start_time: row.start_time ? String(row.start_time) : null,
      end_time: row.end_time ? String(row.end_time) : null,
      status: String(row.status || 'pending'),
      notes: row.attendance_note ? String(row.attendance_note) : (row.session_note ? String(row.session_note) : null),
      checked_in_at: row.checked_in_at ? String(row.checked_in_at) : null,
      join_source: row.zoom_join_source ? String(row.zoom_join_source) : null,
    });
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    total_sessions: item.records.length,
    present_count: item.records.filter((record) => ['present', 'late'].includes(record.status)).length,
  }));
}

// ========================================
// ZOOM CLICK-THROUGH TRACKING
// ========================================

/**
 * Lấy map student_id → zoom check-in mới nhất (từ click 'Vào lớp học')
 * cho một lịch thi cụ thể, qua chuỗi:
 *   exam_schedules → online_classes (source_exam_schedule_id)
 *                  → online_class_sessions → online_class_attendance
 *
 * Chỉ lấy bản ghi có zoom_join_source = 'zoom_click' (học viên tự bấm Zoom).
 * Trả về Map<student_id, { checked_in_at: string; zoom_join_source: string }>
 */
export async function getZoomCheckinsForExam(
  db: D1Database,
  examScheduleId: number
): Promise<Map<number, { checked_in_at: string; zoom_join_source: string }>> {
  try {
    const result = await db.prepare(`
      SELECT
        oca.student_id,
        MAX(oca.checked_in_at) AS checked_in_at,
        oca.zoom_join_source
      FROM online_class_attendance oca
      JOIN online_class_sessions ocs ON oca.session_id = ocs.id
      JOIN online_classes oc ON ocs.online_class_id = oc.id
      WHERE oc.source_exam_schedule_id = ?
        AND oca.zoom_join_source = 'zoom_click'
        AND oca.checked_in_at IS NOT NULL
      GROUP BY oca.student_id
    `).bind(examScheduleId).all();

    const map = new Map<number, { checked_in_at: string; zoom_join_source: string }>();
    for (const row of (result.results || []) as any[]) {
      if (row.student_id && row.checked_in_at) {
        map.set(Number(row.student_id), {
          checked_in_at: String(row.checked_in_at),
          zoom_join_source: String(row.zoom_join_source || 'zoom_click'),
        });
      }
    }
    return map;
  } catch {
    // Nếu cột chưa tồn tại (migration chưa chạy) — trả về map rỗng, không crash
    return new Map();
  }
}

// ========================================
// EXAM SCHEDULE QUERIES
// ========================================

export async function createExamSchedule(
  db: D1Database,
  classId: number | null,
  examName: string,
  examDate: string,
  durationMinutes: number | null = 120,
  location: string | null = null,
  notes: string | null = null,
  templateId: number | null = null,
  metadata: Record<string, unknown> = {}
) {
  const {
    zoom_link,
    zoom_link_backup,
    zoom_link_backup_2,
    zoom_link_backup_3,
    zoom_meeting_id,
    zoom_passcode,
    zoom_meeting_id_backup,
    zoom_passcode_backup,
    exam_type,
    exam_level,
    exam_category_id,
    exam_type_id,
    organizer_uuid,
    program_uuid,
    level_uuid,
    custom_field_payload,
    override_payload,
    updated_by,
    source_site,
    last_event_uuid,
    class_seed_name,
    class_seed_description,
    class_seed_schedule_rule,
    class_seed_schedule_time,
    class_seed_timezone,
    class_seed_start_date,
    class_seed_end_date,
    class_seed_teacher_name,
    class_seed_max_students,
    google_map_url,
  } = metadata;

  const result = await db.prepare(`
    INSERT INTO exam_schedules (
      class_id,
      exam_name,
      exam_date,
      duration_minutes,
      location,
      google_map_url,
      notes,
      template_id,
      zoom_link,
      zoom_link_backup,
      zoom_link_backup_2,
      zoom_link_backup_3,
      zoom_meeting_id,
      zoom_passcode,
      zoom_meeting_id_backup,
      zoom_passcode_backup,
      exam_type,
      exam_level,
      exam_category_id,
      exam_type_id,
      organizer_uuid,
      program_uuid,
      level_uuid,
      custom_field_payload,
      override_payload,
      updated_by,
      source_site,
      last_event_uuid,
      class_seed_name,
      class_seed_description,
      class_seed_schedule_rule,
      class_seed_schedule_time,
      class_seed_timezone,
      class_seed_start_date,
      class_seed_end_date,
      class_seed_teacher_name,
      class_seed_max_students
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    classId,
    examName,
    examDate,
    durationMinutes,
    location,
    google_map_url ?? null,
    notes,
    templateId,
    zoom_link ?? null,
    zoom_link_backup ?? null,
    zoom_link_backup_2 ?? null,
    zoom_link_backup_3 ?? null,
    zoom_meeting_id ?? null,
    zoom_passcode ?? null,
    zoom_meeting_id_backup ?? null,
    zoom_passcode_backup ?? null,
    exam_type ?? null,
    exam_level ?? null,
    exam_category_id ?? null,
    exam_type_id ?? null,
    organizer_uuid ?? null,
    program_uuid ?? null,
    level_uuid ?? null,
    custom_field_payload ?? null,
    override_payload ?? null,
    updated_by ?? null,
    source_site ?? 'edu',
    last_event_uuid ?? null,
    class_seed_name ?? null,
    class_seed_description ?? null,
    class_seed_schedule_rule ?? null,
    class_seed_schedule_time ?? null,
    class_seed_timezone ?? null,
    class_seed_start_date ?? null,
    class_seed_end_date ?? null,
    class_seed_teacher_name ?? null,
    class_seed_max_students ?? null
  ).run();
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
           (
             SELECT COUNT(*)
             FROM exam_registrations er
             JOIN students s ON s.id = er.student_id
             WHERE er.exam_id = e.id
               AND er.status = 'pending'
               AND ${buildTestStudentFilter('s')}
           ) as pending_count,
           (
             SELECT COUNT(*)
             FROM exam_registrations er
             JOIN students s ON s.id = er.student_id
             WHERE er.exam_id = e.id
               AND er.status IN ('approved', 'registered')
               AND ${buildTestStudentFilter('s')}
           ) as approved_count
    FROM exam_schedules e
    LEFT JOIN classes c ON e.class_id = c.id
    WHERE e.exam_date >= date('now', '-7 days') AND e.deleted_at IS NULL
    ORDER BY e.exam_date ASC
    LIMIT ?
  `).bind(limit).all();
  return result.results || [];
}

export async function updateExamSchedule(db: D1Database, examId: number, data: Record<string, unknown>) {
  const {
    class_id,
    exam_name,
    exam_date,
    duration_minutes,
    location,
    notes,
    template_id,
    zoom_link,
    zoom_link_backup,
    zoom_link_backup_2,
    zoom_link_backup_3,
    zoom_meeting_id,
    zoom_passcode,
    zoom_meeting_id_backup,
    zoom_passcode_backup,
    exam_type,
    exam_level,
    exam_category_id,
    exam_type_id,
    organizer_uuid,
    program_uuid,
    level_uuid,
    custom_field_payload,
    override_payload,
    updated_by,
    source_site,
    last_event_uuid,
    class_seed_name,
    class_seed_description,
    class_seed_schedule_rule,
    class_seed_schedule_time,
    class_seed_timezone,
    class_seed_start_date,
    class_seed_end_date,
    class_seed_teacher_name,
    class_seed_max_students,
    google_map_url,
  } = data;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (class_id !== undefined) {
    updates.push('class_id = ?');
    values.push(class_id);
  }
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
  if (google_map_url !== undefined) {
    updates.push('google_map_url = ?');
    values.push(google_map_url);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  if (template_id !== undefined) {
    updates.push('template_id = ?');
    values.push(template_id);
  }
  if (zoom_link !== undefined) {
    updates.push('zoom_link = ?');
    values.push(zoom_link || null);
  }
  if (zoom_link_backup !== undefined) {
    updates.push('zoom_link_backup = ?');
    values.push(zoom_link_backup || null);
  }
  if (zoom_link_backup_2 !== undefined) {
    updates.push('zoom_link_backup_2 = ?');
    values.push(zoom_link_backup_2 || null);
  }
  if (zoom_link_backup_3 !== undefined) {
    updates.push('zoom_link_backup_3 = ?');
    values.push(zoom_link_backup_3 || null);
  }
  if (zoom_meeting_id !== undefined) {
    updates.push('zoom_meeting_id = ?');
    values.push(zoom_meeting_id || null);
  }
  if (zoom_passcode !== undefined) {
    updates.push('zoom_passcode = ?');
    values.push(zoom_passcode || null);
  }
  if (zoom_meeting_id_backup !== undefined) {
    updates.push('zoom_meeting_id_backup = ?');
    values.push(zoom_meeting_id_backup || null);
  }
  if (zoom_passcode_backup !== undefined) {
    updates.push('zoom_passcode_backup = ?');
    values.push(zoom_passcode_backup || null);
  }
  // exam_type: optional field for categorizing exam (VSTEP, TOPIK, MOS, IC3, etc.)
  if (exam_type !== undefined) {
    updates.push('exam_type = ?');
    values.push(exam_type ? (exam_type as string).trim() : null);
  }
  if (exam_level !== undefined) {
    updates.push('exam_level = ?');
    values.push(exam_level ? (exam_level as string).trim().toUpperCase() : null);
  }
  if (exam_category_id !== undefined) {
    updates.push('exam_category_id = ?');
    values.push(exam_category_id || null);
  }
  if (exam_type_id !== undefined) {
    updates.push('exam_type_id = ?');
    values.push(exam_type_id || null);
  }
  if (organizer_uuid !== undefined) {
    updates.push('organizer_uuid = ?');
    values.push(organizer_uuid || null);
  }
  if (program_uuid !== undefined) {
    updates.push('program_uuid = ?');
    values.push(program_uuid || null);
  }
  if (level_uuid !== undefined) {
    updates.push('level_uuid = ?');
    values.push(level_uuid || null);
  }
  if (custom_field_payload !== undefined) {
    updates.push('custom_field_payload = ?');
    values.push(custom_field_payload || null);
  }
  if (override_payload !== undefined) {
    updates.push('override_payload = ?');
    values.push(override_payload || null);
  }
  if (updated_by !== undefined) {
    updates.push('updated_by = ?');
    values.push(updated_by || null);
  }
  if (source_site !== undefined) {
    updates.push('source_site = ?');
    values.push(source_site || 'edu');
  }
  if (last_event_uuid !== undefined) {
    updates.push('last_event_uuid = ?');
    values.push(last_event_uuid || null);
  }
  if (class_seed_name !== undefined) {
    updates.push('class_seed_name = ?');
    values.push(class_seed_name || null);
  }
  if (class_seed_description !== undefined) {
    updates.push('class_seed_description = ?');
    values.push(class_seed_description || null);
  }
  if (class_seed_schedule_rule !== undefined) {
    updates.push('class_seed_schedule_rule = ?');
    values.push(class_seed_schedule_rule || null);
  }
  if (class_seed_schedule_time !== undefined) {
    updates.push('class_seed_schedule_time = ?');
    values.push(class_seed_schedule_time || null);
  }
  if (class_seed_timezone !== undefined) {
    updates.push('class_seed_timezone = ?');
    values.push(class_seed_timezone || null);
  }
  if (class_seed_start_date !== undefined) {
    updates.push('class_seed_start_date = ?');
    values.push(class_seed_start_date || null);
  }
  if (class_seed_end_date !== undefined) {
    updates.push('class_seed_end_date = ?');
    values.push(class_seed_end_date || null);
  }
  if (class_seed_teacher_name !== undefined) {
    updates.push('class_seed_teacher_name = ?');
    values.push(class_seed_teacher_name || null);
  }
  if (class_seed_max_students !== undefined) {
    updates.push('class_seed_max_students = ?');
    values.push(class_seed_max_students || null);
  }

  if (updates.length === 0) {
    return { meta: { changes: 0 } } as any;
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

type ExamRegistrationBucket = 'english' | 'informatics' | 'unknown';

const ENGLISH_BUCKET_TOKENS = [
  'vstep',
  'vept',
  'english',
  'ngoai ngu',
  'ngoai_ngu',
  'toeic',
  'toefl',
  'ielts',
];

const INFORMATICS_BUCKET_TOKENS = [
  'tin hoc',
  'tinhoc',
  'ptit',
  'ic3',
  'mos',
  'cntt',
  'computer',
];

function normalizeBucketText(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function textContainsToken(text: string, token: string) {
  if (!text || !token) return false;
  const normalizedToken = normalizeBucketText(token);
  if (!normalizedToken) return false;
  return (` ${text} `).includes(` ${normalizedToken} `);
}

function containsAnyToken(text: string, tokens: string[]) {
  return tokens.some((token) => textContainsToken(text, token));
}

function resolveExamRegistrationBucket(exam: Record<string, any>): ExamRegistrationBucket {
  const combined = [
    exam?.exam_type,
    exam?.program_uuid,
    exam?.organizer_uuid,
    exam?.exam_name,
  ]
    .map((value) => normalizeBucketText(value))
    .filter(Boolean)
    .join(' ');

  if (!combined) {
    return 'unknown';
  }

  if (containsAnyToken(combined, ENGLISH_BUCKET_TOKENS)) {
    return 'english';
  }

  if (containsAnyToken(combined, INFORMATICS_BUCKET_TOKENS)) {
    return 'informatics';
  }

  return 'unknown';
}

function bucketConflicts(left: ExamRegistrationBucket, right: ExamRegistrationBucket) {
  if (left === 'unknown' || right === 'unknown') {
    // Unknown bucket keeps conservative behavior: conflict with everything.
    return true;
  }
  return left === right;
}

function getBucketMessageLabel(bucket: ExamRegistrationBucket) {
  if (bucket === 'english') return 'tiếng Anh (VSTEP/VEPT)';
  if (bucket === 'informatics') return 'tin học (PTIT...)';
  return 'nhóm kỳ thi này';
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
  const exams = (result.results || []) as any[];
  const examBucketMap = new Map<number, ExamRegistrationBucket>();
  for (const exam of exams) {
    examBucketMap.set(Number(exam.id), resolveExamRegistrationBucket(exam));
  }

  const activeRegistrations = exams.filter((exam) =>
    ACTIVE_EXAM_REGISTRATION_STATUSES.has(exam.registration_status || '')
    && isUpcomingExamRegistrationWindow(exam)
  );

  return exams.map((exam) => {
    const examBucket = examBucketMap.get(Number(exam.id)) || 'unknown';
    const conflicts = activeRegistrations.filter((otherExam) => {
      if (otherExam.id === exam.id) return false;
      const otherBucket = examBucketMap.get(Number(otherExam.id)) || 'unknown';
      return bucketConflicts(examBucket, otherBucket);
    });
    const firstConflict = conflicts[0];
    const bucketLabel = getBucketMessageLabel(examBucket);
    const shouldFlagConflict =
      !ACTIVE_EXAM_REGISTRATION_STATUSES.has(exam.registration_status || '')
      && isUpcomingExamRegistrationWindow(exam)
      && conflicts.length > 0;

    return {
      ...exam,
      has_time_conflict: shouldFlagConflict,
      conflicting_exam_id: shouldFlagConflict ? firstConflict?.id ?? null : null,
      conflicting_exam_name: shouldFlagConflict ? firstConflict?.exam_name ?? null : null,
      conflicting_exam_date: shouldFlagConflict ? firstConflict?.exam_date ?? null : null,
      conflict_bucket: shouldFlagConflict ? examBucket : null,
      conflict_message: shouldFlagConflict
        ? `Bạn đã đăng ký ${firstConflict?.exam_name || 'một kỳ thi khác'} thuộc nhóm ${bucketLabel}. Mỗi học viên chỉ được giữ tối đa 1 lịch tiếng Anh (VSTEP/VEPT) và 1 lịch tin học (PTIT...).`
        : null,
    };
  });
}

const ACTIVE_EXAM_REGISTRATION_STATUSES = new Set(['pending', 'approved', 'registered']);
const VIETNAM_TIME_OFFSET_MS = 7 * 60 * 60 * 1000;

function getCurrentVietnamDateTimeKey() {
  return new Date(Date.now() + VIETNAM_TIME_OFFSET_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

function getExamDateTimeKey(examDate: string | null | undefined) {
  if (!examDate) {
    return null;
  }

  const normalized = String(examDate).trim().replace('T', ' ').slice(0, 19);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(String(examDate));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getTime() + VIETNAM_TIME_OFFSET_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

export function isUpcomingExamRegistrationWindow(exam: { exam_date?: string | null }) {
  const examDateKey = getExamDateTimeKey(exam.exam_date);
  return examDateKey != null && examDateKey >= getCurrentVietnamDateTimeKey();
}

function getExamWindow(exam: { exam_date?: string | null; duration_minutes?: number | null }) {
  const start = exam.exam_date ? new Date(exam.exam_date).getTime() : Number.NaN;
  if (Number.isNaN(start)) {
    return null;
  }

  const durationMinutes =
    typeof exam.duration_minutes === 'number' && exam.duration_minutes > 0
      ? exam.duration_minutes
      : null;

  return {
    start,
    end: durationMinutes ? start + durationMinutes * 60 * 1000 : null,
  };
}

export function examsOverlapInTime(
  leftExam: { exam_date?: string | null; duration_minutes?: number | null },
  rightExam: { exam_date?: string | null; duration_minutes?: number | null },
) {
  const leftWindow = getExamWindow(leftExam);
  const rightWindow = getExamWindow(rightExam);

  if (!leftWindow || !rightWindow) {
    return false;
  }

  if (leftWindow.end != null && rightWindow.end != null) {
    return leftWindow.start < rightWindow.end && rightWindow.start < leftWindow.end;
  }

  if (leftWindow.end != null) {
    return rightWindow.start >= leftWindow.start && rightWindow.start < leftWindow.end;
  }

  if (rightWindow.end != null) {
    return leftWindow.start >= rightWindow.start && leftWindow.start < rightWindow.end;
  }

  return leftWindow.start === rightWindow.start;
}

// Student tự đăng ký thi -> status = 'pending'
// Chỉ được giữ 1 đăng ký active trong đợt thi đang mở
export async function registerStudentForExam(
  db: D1Database,
  examId: number,
  studentId: number,
  createdBy: number | { adminId?: number | null; force?: boolean } | null = null
) {
  const options = typeof createdBy === 'object' && createdBy !== null ? createdBy : {};
  const adminId =
    typeof createdBy === 'number'
      ? createdBy
      : typeof options.adminId === 'number'
      ? options.adminId
        : null;
  const force = !!options.force;
  const status = adminId ? 'approved' : 'pending';

  const targetExam = await db.prepare(`
    SELECT es.id, es.exam_name, es.exam_date, es.duration_minutes,
           es.exam_type, es.exam_category_id, es.exam_type_id, es.program_uuid, es.organizer_uuid
    FROM exam_schedules es
    WHERE es.id = ?
      AND es.deleted_at IS NULL
    LIMIT 1
  `).bind(examId).first<any>();

  if (!targetExam) {
    const err: any = new Error('EXAM_SCHEDULE_NOT_FOUND');
    err.code = 'EXAM_SCHEDULE_NOT_FOUND';
    throw err;
  }

  const targetBucket = resolveExamRegistrationBucket(targetExam);
  const targetBucketLabel = getBucketMessageLabel(targetBucket);

  const existingActives = await db.prepare(`
    SELECT er.id, er.exam_id, er.status, er.created_at,
           es.exam_name, es.exam_date, es.duration_minutes,
           es.exam_type, es.exam_category_id, es.exam_type_id, es.program_uuid, es.organizer_uuid
    FROM exam_registrations er
    JOIN exam_schedules es ON es.id = er.exam_id
    WHERE er.student_id = ?
      AND er.status IN ('pending','approved','registered')
      AND er.exam_id != ?
      AND es.deleted_at IS NULL
    ORDER BY datetime(er.created_at) ASC, er.id ASC
  `).bind(studentId, examId).all();

  const conflictingActives = isUpcomingExamRegistrationWindow(targetExam)
    ? ((existingActives.results || []) as any[]).filter((existingExam) =>
        isUpcomingExamRegistrationWindow(existingExam)
        && bucketConflicts(targetBucket, resolveExamRegistrationBucket(existingExam))
      )
    : [];

  if (conflictingActives.length > 0) {
    if (!force) {
      const firstConflict = conflictingActives[0];
      const err: any = new Error('STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION');
      err.code = 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION';
      err.details = {
        existing_exam_id: firstConflict.exam_id,
        existing_exam_name: firstConflict.exam_name,
        existing_exam_date: firstConflict.exam_date,
        existing_status: firstConflict.status,
        registration_bucket: targetBucket,
        registration_bucket_label: targetBucketLabel,
        active_exam_ids: conflictingActives.map((item) => item.exam_id),
        active_count: conflictingActives.length,
      };
      throw err;
    }

    // Force mode: replace existing registrations in the same bucket.
    for (const conflict of conflictingActives) {
      await db.prepare(`
        UPDATE exam_registrations
        SET status = 'cancelled'
        WHERE id = ?
      `).bind(conflict.id).run();
    }
  }

  // Upsert: neu da co (ke ca cancelled) thi update lai status
  const result = await db.prepare(`
    INSERT INTO exam_registrations (exam_id, student_id, status, payment_status, created_by, approved_at, approved_by)
    VALUES (?, ?, ?, ${adminId ? "'unpaid'" : 'NULL'}, ?, ${adminId ? 'CURRENT_TIMESTAMP' : 'NULL'}, ?)
    ON CONFLICT(exam_id, student_id) DO UPDATE SET
      status = excluded.status,
      payment_status = excluded.payment_status,
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
  const paymentStatusSelect = await getExamRegistrationPaymentStatusSelect(db);
  const result = await db.prepare(`
    SELECT r.id as registration_id,
           r.status as registration_status,
           ${paymentStatusSelect} as payment_status,
           r.created_at as registration_date,
           r.created_by,
           r.approved_at,
           r.approved_by,
           a.full_name as approved_by_name,
           s.id as student_id,
           s.ho,
           s.ten_dem,
           s.ten,
           s.ho_ten_full,
           s.ngay_sinh,
           s.gioi_tinh,
           s.dan_toc,
           s.cccd,
           s.sdt,
           s.email,
           s.dia_chi,
           s.noi_sinh,
           s.ngay_cap_cccd,
           s.don_vi_cong_tac,
           s.image_3x4,
           s.photo_3x4_image_id,
           s.image_cccd_front,
           s.cccd_front_image_id,
           s.created_at as student_created_at
    FROM exam_registrations r
    JOIN students s ON r.student_id = s.id
    LEFT JOIN admins a ON r.approved_by = a.id
    WHERE r.exam_id = ? AND r.status IN ('approved', 'registered')
      AND ${buildTestStudentFilter('s')}
    ORDER BY r.created_at DESC
  `).bind(examId).all();
  return result.results || [];
}

export type ExamRegistrationExportScope = 'approved' | 'all';

export async function getExamRegistrationsForExport(
  db: D1Database,
  examId: number,
  scope: ExamRegistrationExportScope = 'approved',
) {
  const statuses = scope === 'all'
    ? ['approved', 'registered', 'pending']
    : ['approved', 'registered'];
  const placeholders = statuses.map(() => '?').join(', ');
  const paymentStatusSelect = await getExamRegistrationPaymentStatusSelect(db);
  const result = await db.prepare(`
    SELECT r.id as registration_id,
           r.status as registration_status,
           ${paymentStatusSelect} as payment_status,
           r.created_at as registration_date,
           r.created_by,
           r.approved_at,
           r.approved_by,
           a.full_name as approved_by_name,
           s.id as student_id,
           s.ho,
           s.ten_dem,
           s.ten,
           s.ho_ten_full,
           s.ngay_sinh,
           s.noi_sinh,
           s.gioi_tinh,
           s.dan_toc,
           s.quoc_tich,
           s.email,
           s.sdt,
           s.cccd,
           s.dia_chi,
           s.ngay_cap_cccd,
           s.don_vi_cong_tac,
           s.image_3x4,
           s.photo_3x4_image_id,
           s.created_at as student_created_at
    FROM exam_registrations r
    JOIN students s ON r.student_id = s.id
    LEFT JOIN admins a ON r.approved_by = a.id
    WHERE r.exam_id = ? AND r.status IN (${placeholders})
      AND ${buildTestStudentFilter('s')}
    ORDER BY r.created_at DESC
  `).bind(examId, ...statuses).all();
  return result.results || [];
}

// Lay danh sach cho duyet (pending)
export async function getPendingExamRegistrations(db: D1Database, examId: number) {
  const paymentStatusSelect = await getExamRegistrationPaymentStatusSelect(db);
  const result = await db.prepare(`
    SELECT r.id as registration_id,
           r.status as registration_status,
           ${paymentStatusSelect} as payment_status,
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
           s.image_3x4,
           s.photo_3x4_image_id,
           s.image_cccd_front,
           s.cccd_front_image_id
    FROM exam_registrations r
    JOIN students s ON r.student_id = s.id
    WHERE r.exam_id = ? AND r.status = 'pending'
      AND ${buildTestStudentFilter('s')}
    ORDER BY r.created_at DESC
  `).bind(examId).all();
  return result.results || [];
}

export async function updateExamRegistrationPaymentStatus(
  db: D1Database,
  examId: number,
  studentId: number,
  paymentStatus: 'paid' | 'unpaid' | 'unknown'
) {
  await ensureExamRegistrationPaymentStatusColumn(db);
  const dbPaymentStatus = paymentStatus === 'unknown' ? null : paymentStatus;

  const result = await db.prepare(`
    UPDATE exam_registrations
    SET payment_status = ?
    WHERE exam_id = ?
      AND student_id = ?
      AND status IN ('pending', 'approved', 'registered')
  `).bind(dbPaymentStatus, examId, studentId).run();

  return result;
}

// Duyet 1 thi sinh
export async function approveExamRegistration(db: D1Database, examId: number, studentId: number, approvedBy: number) {
  const result = await db.prepare(`
    UPDATE exam_registrations
    SET status = 'approved',
        payment_status = COALESCE(payment_status, 'unpaid'),
        approved_at = CURRENT_TIMESTAMP,
        approved_by = ?
    WHERE exam_id = ? AND student_id = ? AND status = 'pending'
  `).bind(approvedBy, examId, studentId).run();
  return result;
}

// Duyet tat ca pending
export async function approveAllExamRegistrations(db: D1Database, examId: number, approvedBy: number) {
  const result = await db.prepare(`
    UPDATE exam_registrations
    SET status = 'approved',
        payment_status = COALESCE(payment_status, 'unpaid'),
        approved_at = CURRENT_TIMESTAMP,
        approved_by = ?
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
