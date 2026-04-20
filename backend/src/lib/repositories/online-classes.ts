/**
 * Repository: online-classes
 * Layer 1 - All D1 database queries for online classes and enrollments.
 * Rules: explicit SELECT columns, parameterized queries (?), no business logic.
 */

// ─── Online Classes ─────────────────────────────────────────────────────────

const CLASS_COLUMNS = `
  id, class_name, description, schedule_rule, schedule_time, timezone, recurrence,
  start_date, end_date, meet_link, calendar_event_id, teacher_name,
  max_students, status, created_by, created_at, updated_at,
  source_exam_schedule_id, source_kind, exam_category_id, exam_type_id,
  organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload
`;

interface ListClassesOpts {
  status?: string;
  search?: string;
  limit: number;
  offset: number;
}

interface InsertClassData {
  class_name: string;
  description?: string | null;
  schedule_rule: string;
  schedule_time: string;
  timezone: string;
  recurrence?: string | null;
  start_date: string;
  end_date?: string | null;
  meet_link?: string | null;
  calendar_event_id?: string | null;
  teacher_name?: string | null;
  max_students: number;
  created_by: number | string;
  source_exam_schedule_id?: number | string | null;
  source_kind?: string | null;
  exam_category_id?: number | string | null;
  exam_type_id?: number | string | null;
  organizer_uuid?: string | null;
  program_uuid?: string | null;
  level_uuid?: string | null;
  custom_field_payload?: string | null;
  override_payload?: string | null;
}

interface CalendarInfoData {
  eventId: string;
  meetLink?: string | null;
}

interface CalendarSyncData {
  meetLink: string;
  eventId: string;
  recurrence?: string | null;
}

/**
 * List online classes with optional status/search filter, pagination.
 */
export async function listClasses(db: D1Database, { status, search, limit, offset }: ListClassesOpts): Promise<{ rows: any[]; total: number }> {
  const params: any[] = [];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let where = 'WHERE 1=1';

  if (status === 'completed') {
    // Lớp đã kết thúc: status=active nhưng end_date đã qua, hoặc status=completed
    where += ' AND (status = ? OR (status = ? AND end_date IS NOT NULL AND end_date < ?))';
    params.push('completed', 'active', today);
  } else if (status === 'paused' || status === 'cancelled') {
    where += ' AND status = ?';
    params.push(status);
  } else if (status === '') {
    // "Tất cả" — không lọc status
  } else {
    // Mặc định: active VÀ chưa quá end_date
    where += ' AND status = ? AND (end_date IS NULL OR end_date >= ?)';
    params.push('active', today);
  }

  if (search) {
    where += ' AND (class_name LIKE ? OR teacher_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const rows = await db.prepare(
    `SELECT ${CLASS_COLUMNS} FROM online_classes ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, parseInt(String(limit)), parseInt(String(offset))).all();

  // Count query mirrors filters above (no limit/offset)
  const countParams = params.slice(); // same filter params
  const countRow = await db.prepare(
    `SELECT COUNT(*) as total FROM online_classes ${where}`
  ).bind(...countParams).first<any>();

  return { rows: rows.results || [], total: countRow?.total ?? 0 };
}

/**
 * Find a single class by id.
 */
export async function findClassById(db: D1Database, id: number | string): Promise<any> {
  return db.prepare(
    `SELECT ${CLASS_COLUMNS} FROM online_classes WHERE id = ?`
  ).bind(id).first();
}

/**
 * Find a class by linked exam schedule id.
 */
export async function findClassBySourceExamSchedule(db: D1Database, examScheduleId: number | string): Promise<any> {
  return db.prepare(
    `SELECT ${CLASS_COLUMNS} FROM online_classes WHERE source_exam_schedule_id = ?`
  ).bind(examScheduleId).first();
}

/**
 * Insert a new online class record.
 * Returns the last_row_id from D1 meta.
 */
export async function insertClass(db: D1Database, {
  class_name, description, schedule_rule, schedule_time,
  timezone, recurrence, start_date, end_date,
  meet_link, calendar_event_id, teacher_name, max_students, created_by,
  source_exam_schedule_id, source_kind, exam_category_id, exam_type_id,
  organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload
}: InsertClassData): Promise<number> {
  const result = await db.prepare(`
    INSERT INTO online_classes (
      class_name, description, schedule_rule, schedule_time, timezone, recurrence,
      start_date, end_date, meet_link, calendar_event_id, teacher_name,
      max_students, status, created_by, source_exam_schedule_id, source_kind,
      exam_category_id, exam_type_id, organizer_uuid, program_uuid, level_uuid,
      custom_field_payload, override_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    class_name, description ?? null, schedule_rule, schedule_time,
    timezone, recurrence ?? null, start_date, end_date ?? null,
    meet_link ?? null, calendar_event_id ?? null, teacher_name ?? null,
    max_students, created_by, source_exam_schedule_id ?? null,
    source_kind ?? 'exam_schedule', exam_category_id ?? null, exam_type_id ?? null,
    organizer_uuid ?? null, program_uuid ?? null, level_uuid ?? null,
    custom_field_payload ?? null, override_payload ?? null
  ).run();

  return result.meta.last_row_id;
}

/**
 * Update meet_link (and updated_at) for a class.
 */
export async function updateClassMeetLink(db: D1Database, id: number | string, meetLink: string): Promise<any> {
  return db.prepare(
    `UPDATE online_classes SET meet_link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(meetLink, id).run();
}

/**
 * Update calendar_event_id + meet_link for a class.
 */
export async function updateClassCalendarInfo(db: D1Database, id: number | string, { eventId, meetLink }: CalendarInfoData): Promise<any> {
  return db.prepare(`
    UPDATE online_classes
    SET calendar_event_id = ?, meet_link = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(eventId, meetLink ?? null, id).run();
}

/**
 * Partial update: dynamic field list, only safe whitelisted fields.
 */
export async function updateClass(db: D1Database, id: number | string, fields: Record<string, any>): Promise<any> {
  const ALLOWED = [
    'class_name', 'description', 'teacher_name', 'max_students', 'status',
    'schedule_rule', 'schedule_time', 'timezone', 'start_date', 'end_date',
    'meet_link', 'calendar_event_id', 'recurrence', 'source_exam_schedule_id',
    'source_kind', 'exam_category_id', 'exam_type_id', 'organizer_uuid',
    'program_uuid', 'level_uuid', 'custom_field_payload', 'override_payload'
  ];

  const updates: string[] = [];
  const params: any[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (ALLOWED.includes(key)) {
      updates.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  return db.prepare(
    `UPDATE online_classes SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();
}

/**
 * Update all calendar sync fields in one call.
 */
export async function updateClassCalendarSync(db: D1Database, id: number | string, { meetLink, eventId, recurrence }: CalendarSyncData): Promise<any> {
  return db.prepare(`
    UPDATE online_classes
    SET meet_link = ?, calendar_event_id = ?, recurrence = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(meetLink, eventId, recurrence ?? null, id).run();
}

/**
 * Delete a class by id.
 */
export async function deleteClass(db: D1Database, id: number | string): Promise<any> {
  return db.prepare('DELETE FROM online_classes WHERE id = ?').bind(id).run();
}

// ─── Enrollments ────────────────────────────────────────────────────────────

/**
 * Get active enrollment count for a class.
 */
export async function countActiveEnrollments(db: D1Database, classId: number | string): Promise<number> {
  const row = await db.prepare(`
    SELECT COUNT(*) as count FROM online_class_enrollments
    WHERE online_class_id = ? AND status = 'active'
  `).bind(classId).first<any>();
  return row?.count ?? 0;
}

/**
 * Get pending enrollment counts keyed by class id.
 * Returns a plain object { classId: count }.
 */
export async function getPendingCountsByClass(db: D1Database): Promise<Record<string, number>> {
  const result = await db.prepare(`
    SELECT online_class_id, COUNT(*) as count
    FROM online_class_enrollments
    WHERE status = 'pending'
    GROUP BY online_class_id
  `).all<any>();
  const map: Record<string, number> = {};
  for (const row of result.results || []) {
    map[row.online_class_id] = row.count;
  }
  return map;
}

/**
 * Find a student's enrollment for a specific class.
 */
export async function findEnrollment(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  return db.prepare(`
    SELECT id, status, enrolled_at, rejection_reason
    FROM online_class_enrollments
    WHERE online_class_id = ? AND student_id = ?
  `).bind(classId, studentId).first();
}

/**
 * Find an enrollment by its own id + class id (admin use).
 */
export async function findEnrollmentById(db: D1Database, enrollmentId: number | string, classId: number | string): Promise<any> {
  return db.prepare(`
    SELECT e.id, e.student_id, e.status, e.enrolled_at, e.rejection_reason,
           s.ho_ten_full
    FROM online_class_enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.id = ? AND e.online_class_id = ?
  `).bind(enrollmentId, classId).first();
}

/**
 * Create a new enrollment with status 'pending'.
 */
export async function createEnrollment(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  return db.prepare(`
    INSERT INTO online_class_enrollments (online_class_id, student_id, status)
    VALUES (?, ?, 'pending')
  `).bind(classId, studentId).run();
}

/**
 * Re-activate a cancelled/rejected enrollment (reset to pending).
 */
export async function reEnroll(db: D1Database, enrollmentId: number | string): Promise<any> {
  return db.prepare(`
    UPDATE online_class_enrollments
    SET status = 'pending', enrolled_at = CURRENT_TIMESTAMP, rejection_reason = NULL
    WHERE id = ?
  `).bind(enrollmentId).run();
}

/**
 * Admin: directly activate an enrollment (bypass pending).
 */
export async function activateEnrollmentDirect(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  return db.prepare(`
    INSERT INTO online_class_enrollments (online_class_id, student_id, status)
    VALUES (?, ?, 'active')
  `).bind(classId, studentId).run();
}

/**
 * Admin: reactivate an existing (non-active) enrollment.
 */
export async function reactivateEnrollment(db: D1Database, enrollmentId: number | string): Promise<any> {
  return db.prepare(`
    UPDATE online_class_enrollments
    SET status = 'active', enrolled_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(enrollmentId).run();
}

/**
 * Approve a pending enrollment (set active).
 */
export async function approveEnrollment(db: D1Database, enrollmentId: number | string, approvedBy: number | string): Promise<any> {
  return db.prepare(`
    UPDATE online_class_enrollments
    SET status = 'active', approved_at = CURRENT_TIMESTAMP,
        approved_by = ?, rejection_reason = NULL
    WHERE id = ?
  `).bind(String(approvedBy), enrollmentId).run();
}

/**
 * Reject an enrollment.
 */
export async function rejectEnrollment(db: D1Database, enrollmentId: number | string, approvedBy: number | string, reason: string): Promise<any> {
  return db.prepare(`
    UPDATE online_class_enrollments
    SET status = 'rejected', approved_at = CURRENT_TIMESTAMP,
        approved_by = ?, rejection_reason = ?
    WHERE id = ?
  `).bind(String(approvedBy), reason ?? null, enrollmentId).run();
}

/**
 * Cancel an enrollment (admin removes student).
 */
export async function cancelEnrollment(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  return db.prepare(`
    UPDATE online_class_enrollments
    SET status = 'cancelled'
    WHERE online_class_id = ? AND student_id = ?
  `).bind(classId, studentId).run();
}

/**
 * Get active enrollments with full student info (for admin student list).
 */
export async function listEnrolledStudents(db: D1Database, classId: number | string): Promise<any> {
  return db.prepare(`
    SELECT
      s.id, s.cccd, s.ho_ten_full, s.email, s.sdt,
      s.cccd_front_image_id, s.cccd_back_image_id, s.photo_3x4_image_id,
      e.enrolled_at, e.status as enrollment_status
    FROM online_class_enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.online_class_id = ?
    ORDER BY e.enrolled_at DESC
  `).bind(classId).all();
}

/**
 * Get active enrollments with extended student info (for /enrollments endpoint).
 */
export async function listActiveEnrollmentsWithStudents(db: D1Database, classId: number | string): Promise<any> {
  return db.prepare(`
    SELECT
      e.id as enrollment_id,
      e.status as enrollment_status,
      e.enrolled_at,
      s.id, s.cccd, s.ho, s.ten_dem, s.ten, s.ho_ten_full,
      s.sdt, s.email, s.ngay_sinh, s.gioi_tinh,
      s.cccd_front_image_id, s.cccd_back_image_id, s.photo_3x4_image_id
    FROM online_class_enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.online_class_id = ? AND e.status = 'active'
    ORDER BY e.enrolled_at DESC
  `).bind(classId).all();
}

/**
 * Get pending enrollments with extended student info.
 */
export async function listPendingEnrollmentsWithStudents(db: D1Database, classId: number | string): Promise<any> {
  return db.prepare(`
    SELECT
      e.id as enrollment_id,
      e.student_id,
      e.status,
      e.enrolled_at,
      e.rejection_reason,
      s.id, s.cccd, s.ho, s.ten_dem, s.ten, s.ho_ten_full,
      s.sdt, s.email, s.ngay_sinh, s.gioi_tinh,
      s.cccd_front_image_id, s.cccd_back_image_id, s.photo_3x4_image_id
    FROM online_class_enrollments e
    JOIN students s ON e.student_id = s.id
    WHERE e.online_class_id = ? AND e.status = 'pending'
    ORDER BY e.enrolled_at ASC
  `).bind(classId).all();
}

/**
 * Get enrolled student ids for a class (active only).
 */
export async function getEnrolledStudentIds(db: D1Database, classId: number | string): Promise<Set<any>> {
  const result = await db.prepare(`
    SELECT student_id FROM online_class_enrollments
    WHERE online_class_id = ? AND status = 'active'
  `).bind(classId).all<any>();
  return new Set((result.results || []).map((r: any) => r.student_id));
}

// ─── Students (lightweight queries used within this module) ─────────────────

/**
 * Find student by CCCD (for inline auth).
 */
export async function findStudentByCccd(db: D1Database, cccd: string): Promise<any> {
  return db.prepare(
    `SELECT id, cccd, ho_ten_full FROM students WHERE cccd = ?`
  ).bind(cccd).first();
}

/**
 * Find student by id.
 */
export async function findStudentById(db: D1Database, id: number | string): Promise<any> {
  return db.prepare(
    `SELECT id, cccd, ho_ten_full, email, sdt FROM students WHERE id = ?`
  ).bind(id).first();
}

/**
 * Search students with optional keyword (for available-students endpoint).
 */
export async function searchStudents(db: D1Database, keyword: string): Promise<any> {
  if (!keyword.trim()) {
    return db.prepare(`
      SELECT id, cccd, ho_ten_full, email, sdt,
             cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id
      FROM students ORDER BY id DESC LIMIT 50
    `).all();
  }

  const term = `%${keyword.trim()}%`;
  return db.prepare(`
    SELECT id, cccd, ho_ten_full, email, sdt,
           cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id
    FROM students
    WHERE (ho_ten_full LIKE ? OR cccd LIKE ? OR sdt LIKE ? OR email LIKE ?)
    ORDER BY id DESC LIMIT 50
  `).bind(term, term, term, term).all();
}
