/**
 * Service: online-classes
 * Layer 2 - Business logic, validation, and orchestration.
 * Calls repository for DB access; calls Google Calendar helpers for external API.
 * No direct HTTP context (c) here — pure logic returning plain objects or throwing errors.
 */

import {
  listClasses, findClassById, insertClass,
  updateClass, updateClassMeetLink, updateClassCalendarInfo,
  updateClassCalendarSync, deleteClass,
  findClassBySourceExamSchedule,
  countActiveEnrollments, getPendingCountsByClass,
  findEnrollment, findEnrollmentById,
  findStudentCategoryEnrollments,
  createEnrollment, reEnroll,
  activateEnrollmentDirect, reactivateEnrollment,
  approveEnrollment, rejectEnrollment, cancelEnrollment,
  listEnrolledStudents, listActiveEnrollmentsWithStudents,
  listPendingEnrollmentsWithStudents, getEnrolledStudentIds,
  findStudentByCccd, findStudentById, searchStudents
} from '../repositories/online-classes.js';

import {
  createOnlineClassEvent, updateCalendarEventSafe,
  deleteOnlineClassEvent, getMeetLinkFromEvent, findEventByClassName
} from '../../services/google-calendar.js';

import type { Env } from '../../types/env.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const SCHEDULE_TIME_RE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

// ─── Class category (Lọc trùng lớp: Tin học vs Tiếng Anh) ────────────────────
//
// A student may hold at most ONE active/pending enrollment per category. The two
// main categories are Tiếng Anh (english) and Tin học (informatics). The category
// of an online class is derived from (in priority order):
//   1. exam_category_id -> exam_categories.name/code (AUTHORITATIVE). When the
//      resolved category name/code clearly matches a known bucket it wins, even
//      if class_name / program_uuid / organizer_uuid text suggests otherwise.
//   2. Fallback text tokens across class_name / program_uuid / organizer_uuid
//      (case-insensitive, diacritic-insensitive).
//
// Fallback priority when BOTH families appear in the text: ENGLISH wins. e.g.
// "Tiếng Anh tin học ứng dụng" is an English class (English is the subject,
// "tin học ứng dụng" is the domain descriptor). This is a documented, explicit
// choice, not an accident of token ordering.
//
// Production `exam_categories` mapping (shared D1, seeded by vantrangexam):
//   1 = VSTEP            (code VSTEP)         -> english
//   2 = Tin học          (code tin-hoc)       -> informatics
//   3 = Ngôn ngữ Anh     (code ngon-ngu-anh)  -> english

export type ClassCategory = 'english' | 'informatics' | 'unknown';

const CLASS_CATEGORY_ENGLISH_TOKENS = [
  'vstep', 'vept', 'english', 'ngoai ngu', 'ngoai_ngu', 'ngon ngu anh',
  'toeic', 'toefl', 'ielts', 'tieng anh',
];

const CLASS_CATEGORY_INFORMATICS_TOKENS = [
  'tin hoc', 'tinhoc', 'ptit', 'ic3', 'mos', 'cntt', 'computer',
];

function normalizeCategoryText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function categoryTextHasToken(text: string, token: string): boolean {
  const nt = normalizeCategoryText(token);
  if (!nt) return false;
  return (` ${text} `).includes(` ${nt} `);
}

function classifyCategoryFromText(text: string): ClassCategory {
  const n = normalizeCategoryText(text);
  if (CLASS_CATEGORY_ENGLISH_TOKENS.some((t) => categoryTextHasToken(n, t))) return 'english';
  if (CLASS_CATEGORY_INFORMATICS_TOKENS.some((t) => categoryTextHasToken(n, t))) return 'informatics';
  return 'unknown';
}

function classifyFromCategoryName(categoryName: string | null | undefined): ClassCategory {
  if (!categoryName) return 'unknown';
  return classifyCategoryFromText(categoryName);
}

/**
 * Classify an online class into a category bucket.
 *
 * Priority rules:
 *   1. `exam_category_id` joined to `exam_categories` (passed via `categoryName`
 *      = resolved name+code) is AUTHORITATIVE. A resolved known bucket always
 *      wins over conflicting class_name / program_uuid / organizer_uuid text.
 *   2. If `exam_category_id` is absent OR resolves to an unknown bucket, fall
 *      back to the case/diacritic-insensitive text scan of class_name /
 *      program_uuid / organizer_uuid.
 *   3. Nothing matches -> 'unknown' (callers skip dedupe for 'unknown').
 *
 * @param cls          class row (needs class_name, exam_category_id, program_uuid, organizer_uuid)
 * @param categoryName optional resolved exam_categories name+code for exam_category_id
 */
export function classifyOnlineClass(cls: any, categoryName?: string | null): ClassCategory {
  if (cls?.exam_category_id != null) {
    const byCategory = classifyFromCategoryName(categoryName);
    if (byCategory !== 'unknown') return byCategory;
  }
  const source = [
    cls?.class_name,
    cls?.program_uuid,
    cls?.organizer_uuid,
  ].filter(Boolean).join(' ');
  return classifyCategoryFromText(source);
}

async function loadCategoryNames(db: D1Database, ids: (number | string | null | undefined)[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const distinct = Array.from(
    new Set(ids.filter((v): v is number | string => v != null).map((v) => Number(v)))
  ).filter((v) => Number.isFinite(v));
  if (distinct.length === 0) return map;
  for (const id of distinct) {
    try {
      const row = await db.prepare(
        `SELECT name, code FROM exam_categories WHERE id = ?`
      ).bind(id).first<any>();
      if (row) map.set(Number(id), `${row.name ?? ''} ${row.code ?? ''}`);
    } catch {
      /* exam_categories table may be unavailable in some contexts */
    }
  }
  return map;
}

async function classifyClassWithCategoryName(db: D1Database, cls: any): Promise<ClassCategory> {
  let categoryName: string | null = null;
  if (cls?.exam_category_id != null) {
    const map = await loadCategoryNames(db, [cls.exam_category_id]);
    categoryName = map.get(Number(cls.exam_category_id)) ?? null;
  }
  return classifyOnlineClass(cls, categoryName);
}

/**
 * Enforce "at most one active/pending enrollment per category" for a student.
 * Throws if the target class's category already has another enrollment.
 * Classes that resolve to 'unknown' are skipped (preserves prior behavior).
 */
async function assertNoDuplicateCategoryEnrollment(
  db: D1Database,
  studentId: number | string,
  targetClass: any
): Promise<void> {
  const targetCat = await classifyClassWithCategoryName(db, targetClass);
  if (targetCat === 'unknown') return;

  const existing = await findStudentCategoryEnrollments(db, studentId);
  if (existing.length === 0) return;

  const ids = [targetClass.exam_category_id, ...existing.map((e) => e.exam_category_id)]
    .filter((v) => v != null);
  const catNameMap = await loadCategoryNames(db, ids);

  const label = targetCat === 'english' ? 'Tiếng Anh' : 'Tin học';

  for (const e of existing) {
    if (Number(e.class_id) === Number(targetClass.id)) continue; // same-class handled elsewhere
    const eCat = classifyOnlineClass(
      e,
      e.exam_category_id != null ? (catNameMap.get(Number(e.exam_category_id)) ?? null) : null
    );
    if (eCat === targetCat) {
      throw Object.assign(
        new Error(
          `Bạn đã đăng ký một lớp ${label} khác. Mỗi học viên chỉ được đăng ký tối đa 1 lớp mỗi loại (${label}).`
        ),
        { statusCode: 400 }
      );
    }
  }
}

/**
 * Returns true if current time in `timezone` is within [start - earlyBuf, end + lateBuf].
 */
export function isWithinClassTime(scheduleTime: string, timezone: string, earlyBufferMinutes: number = 0, lateBufferMinutes: number = 15): boolean {
  const [startTime, endTime] = scheduleTime.split('-').map(t => t.trim());
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false
  });
  const currentTime = formatter.format(new Date());
  const [ch, cm] = currentTime.split(':').map(Number);
  const current = ch * 60 + cm;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  return current >= (sh * 60 + sm - earlyBufferMinutes)
    && current <= (eh * 60 + em + lateBufferMinutes);
}

/**
 * Attempt to retry fetching the Meet link up to `maxAttempts` times with 1s delay each.
 */
async function retryGetMeetLink(env: Env, eventId: string, maxAttempts: number = 3): Promise<string | null> {
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const link = await getMeetLinkFromEvent(env, eventId);
    if (link) return link;
  }
  return null;
}

// ─── Class CRUD ──────────────────────────────────────────────────────────────

/**
 * List online classes. Returns { classes, pagination }.
 * Adds enrollment counts, pending counts, and meet_link visibility.
 * @param db
 * @param query - { status, search, limit, offset }
 * @param viewer - { isAdmin: boolean, studentId?: number }
 */
export async function getClassList(db: D1Database, query: {
  limit?: string | number;
  offset?: string | number;
  status?: string;
  search?: string;
}, viewer: { isAdmin: boolean; studentId?: number }): Promise<any> {
  const limit = Math.max(1, Math.min(200, Number.parseInt(String(query.limit ?? 20), 10) || 20));
  const offset = Math.max(0, Number.parseInt(String(query.offset ?? 0), 10) || 0);

  const { rows, total } = await listClasses(db, {
    status: query.status,
    search: query.search,
    limit,
    offset
  });

  const pendingMap = await getPendingCountsByClass(db);

  const classes = await Promise.all(rows.map(async (cls: any) => {
    const activeCount = await countActiveEnrollments(db, cls.id);
    const pendingCount = pendingMap[cls.id] ?? 0;

    let enrollmentStatus: string | null = null;
    if (viewer.studentId) {
      const enrollment = await findEnrollment(db, cls.id, viewer.studentId);
      enrollmentStatus = enrollment?.status ?? null;
    }

    const isEnrolled = enrollmentStatus === 'active';

    if (viewer.isAdmin) {
      return {
        ...cls,
        is_enrolled: false,
        enrollment_status: null,
        enrollment_count: activeCount,
        pending_count: pendingCount
      };
    }

    if (isEnrolled) {
      return {
        ...cls,
        is_enrolled: true,
        enrollment_status: 'active',
        enrollment_count: activeCount,
        pending_count: 0
      };
    }

    // Non-enrolled: hide meet_link
    return {
      ...cls,
      meet_link: null,
      is_enrolled: false,
      enrollment_status: enrollmentStatus,
      enrollment_count: activeCount
    };
  }));

  return {
    classes,
    pagination: { total, limit, offset }
  };
}

/**
 * Auto-sync meet_link from Google Calendar for a class that has event_id but no meet_link.
 * Updates the DB in-place and returns the updated meet_link (or null if unchanged).
 */
export async function autoSyncMeetLink(db: D1Database, env: Env, cls: any): Promise<string | null> {
  if (!cls.calendar_event_id || cls.meet_link) return null;

  try {
    const meetLink = await getMeetLinkFromEvent(env, cls.calendar_event_id);
    if (meetLink) {
      await updateClassMeetLink(db, cls.id, meetLink);
      return meetLink;
    }
  } catch (err: any) {
    console.error(`[AutoSync] Class ${cls.id} meet_link sync failed:`, err.message);
  }
  return null;
}

/**
 * Get a single class by id with visibility handling.
 * Returns enriched class object or null if not found.
 */
export async function getClassDetail(db: D1Database, id: number | string, viewer: { isAdmin: boolean; studentId?: number }): Promise<any> {
  const cls = await findClassById(db, id);
  if (!cls) return null;

  const activeCount = await countActiveEnrollments(db, id);

  let isEnrolled = false;
  if (viewer.studentId) {
    const enrollment = await findEnrollment(db, id, viewer.studentId);
    isEnrolled = enrollment?.status === 'active';
  }

  const canJoinNow = isWithinClassTime(
    cls.schedule_time,
    cls.timezone || 'Asia/Ho_Chi_Minh',
    0, 15
  );

  return {
    ...cls,
    meet_link: (viewer.isAdmin || isEnrolled) ? cls.meet_link : null,
    enrollment_count: activeCount,
    is_enrolled: isEnrolled,
    can_join_now: canJoinNow
  };
}

/**
 * Get student enrollment status + join eligibility for a class.
 */
export async function getMyStatus(db: D1Database, classId: number | string, viewer: { isAdmin: boolean; studentId?: number }): Promise<any> {
  const cls = await findClassById(db, classId);
  if (!cls) return null;

  let enrolled = false;
  if (viewer.studentId) {
    const e = await findEnrollment(db, classId, viewer.studentId);
    enrolled = e?.status === 'active';
  }

  const canJoin = isWithinClassTime(
    cls.schedule_time, cls.timezone || 'Asia/Ho_Chi_Minh', 0, 15
  );

  const [startTime] = cls.schedule_time.split('-');
  const nextSession = `${new Date().toISOString().split('T')[0]}T${startTime}:00`;

  const isAuthorized = enrolled || viewer.isAdmin;

  return {
    enrolled: isAuthorized,
    can_join: isAuthorized && canJoin,
    next_session: nextSession,
    meet_link: isAuthorized ? cls.meet_link : null
  };
}

/**
 * Create a new online class. Attempts to create Google Calendar event.
 * Returns { newClass, calendarResult, warning }.
 */
export async function createClass(db: D1Database, env: Env, body: any, createdBy: number | string): Promise<any> {
  const {
    class_name, description, schedule_rule, schedule_time,
    timezone = 'Asia/Ho_Chi_Minh', start_date, end_date,
    teacher_name, max_students = 50, source_exam_schedule_id = null,
    source_kind = 'exam_schedule', exam_category_id = null, exam_type_id = null,
    organizer_uuid = null, program_uuid = null, level_uuid = null,
    custom_field_payload = null, override_payload = null,
    meet_link: bodyMeetLink = null,
  } = body;

  // Validation
  if (!class_name || !schedule_rule || !schedule_time || !start_date) {
    throw Object.assign(new Error('Thiếu thông tin bắt buộc: class_name, schedule_rule, schedule_time, start_date'), { statusCode: 400 });
  }
  if (!SCHEDULE_TIME_RE.test(schedule_time)) {
    throw Object.assign(new Error('schedule_time phải có định dạng HH:MM-HH:MM (VD: 19:00-21:00)'), { statusCode: 400 });
  }

  // Try Google Calendar
  let calendarResult: any = null;
  let googleError: string | null = null;
  try {
    calendarResult = await createOnlineClassEvent(env, {
      class_name, description, schedule_rule, schedule_time,
      timezone, start_date, end_date, teacher_name
    });
  } catch (err: any) {
    console.error('Google Calendar API error (creating class without Meet):', err);
    googleError = err.message;
  }

  const newId = await insertClass(db, {
    class_name, description, schedule_rule, schedule_time,
    timezone, recurrence: calendarResult?.recurrence ?? null,
    start_date, end_date,
    meet_link: calendarResult?.meetLink ?? bodyMeetLink ?? null,
    calendar_event_id: calendarResult?.eventId ?? null,
    teacher_name, max_students, created_by: createdBy,
    source_exam_schedule_id, source_kind, exam_category_id, exam_type_id
    , organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload
  });

  // If event created but Meet link not ready yet, retry up to 3 times
  if (calendarResult?.eventId && !calendarResult?.meetLink?.trim()) {
    const meetLink = await retryGetMeetLink(env, calendarResult.eventId);
    if (meetLink) {
      await updateClassMeetLink(db, newId, meetLink);
      calendarResult = { ...calendarResult, meetLink };
    }
  }

  const newClass = await findClassById(db, newId);

  return {
    newClass,
    calendarResult,
    warning: googleError
      ? `Không thể tạo Google Meet tự động: ${googleError}. Bạn có thể dùng nút "Tạo link Meet" sau.`
      : null
  };
}

/**
 * Update a class. Optionally syncs summary/description to Google Calendar.
 * Returns updated class object.
 */
export async function updateClassById(db: D1Database, env: Env, id: number | string, body: any): Promise<any> {
  const existing = await findClassById(db, id);
  if (!existing) return null;

  const {
    class_name, description, schedule_rule, schedule_time,
    timezone, start_date, end_date, teacher_name, max_students, status,
    meet_link,
    source_exam_schedule_id, source_kind, exam_category_id, exam_type_id,
    organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload
  } = body;

  // Validate schedule_time if provided
  if (schedule_time && !SCHEDULE_TIME_RE.test(schedule_time)) {
    throw Object.assign(new Error('schedule_time phải có định dạng HH:MM-HH:MM (VD: 19:00-21:00)'), { statusCode: 400 });
  }

  const fields: Record<string, any> = {};
  if (class_name !== undefined)     fields.class_name = class_name;
  if (description !== undefined)    fields.description = description;
  if (teacher_name !== undefined)   fields.teacher_name = teacher_name;
  if (max_students !== undefined)   fields.max_students = max_students;
  if (status !== undefined)         fields.status = status;
  if (meet_link !== undefined)      fields.meet_link = meet_link;
  if (schedule_rule !== undefined)  fields.schedule_rule = schedule_rule;
  if (schedule_time !== undefined)  fields.schedule_time = schedule_time;
  if (timezone !== undefined)       fields.timezone = timezone || 'Asia/Ho_Chi_Minh';
  if (start_date !== undefined)     fields.start_date = start_date;
  if (end_date !== undefined)       fields.end_date = end_date || null;
  if (source_exam_schedule_id !== undefined) fields.source_exam_schedule_id = source_exam_schedule_id;
  if (source_kind !== undefined) fields.source_kind = source_kind;
  if (exam_category_id !== undefined) fields.exam_category_id = exam_category_id;
  if (exam_type_id !== undefined) fields.exam_type_id = exam_type_id;
  if (organizer_uuid !== undefined) fields.organizer_uuid = organizer_uuid;
  if (program_uuid !== undefined) fields.program_uuid = program_uuid;
  if (level_uuid !== undefined) fields.level_uuid = level_uuid;
  if (custom_field_payload !== undefined) fields.custom_field_payload = custom_field_payload;
  if (override_payload !== undefined) fields.override_payload = override_payload;

  if (Object.keys(fields).length === 0) {
    throw Object.assign(new Error('Không có thông tin cần cập nhật'), { statusCode: 400 });
  }

  await updateClass(db, id, fields);

  // Sync summary/description to Google Calendar (safe — does not touch Meet link)
  if ((class_name || description !== undefined) && existing.calendar_event_id) {
    try {
      await updateCalendarEventSafe(env, existing.calendar_event_id, {
        class_name: class_name || existing.class_name,
        description: description !== undefined ? description : existing.description
      });
    } catch (err) {
      console.error('Error updating calendar event (non-fatal):', err);
    }
  }

  return findClassById(db, id);
}

/**
 * Delete a class and its Google Calendar event.
 */
export async function deleteClassById(db: D1Database, env: Env, id: number | string): Promise<boolean> {
  const existing = await findClassById(db, id);
  if (!existing) return false;

  if (existing.calendar_event_id) {
    try {
      await deleteOnlineClassEvent(env, existing.calendar_event_id);
    } catch (err) {
      console.error('Error deleting calendar event (non-fatal):', err);
    }
  }

  await deleteClass(db, id);
  return true;
}

// ─── Meet Link Regeneration ──────────────────────────────────────────────────

/**
 * Regenerate (or sync) a Meet link for an existing class.
 * Priority: already has both → return; has event_id only → sync; no event → find or create.
 * Returns { message, cls, googleCalendar }.
 */
export async function regenerateMeetLink(db: D1Database, env: Env, id: number | string): Promise<any> {
  const existing = await findClassById(db, id);
  if (!existing) return null;

  // Already complete
  if (existing.meet_link && existing.calendar_event_id) {
    return {
      message: 'Lớp học đã có link Meet',
      cls: existing,
      googleCalendar: { event_id: existing.calendar_event_id, meet_link: existing.meet_link }
    };
  }

  // Has event_id but no meet_link → sync from Google
  if (existing.calendar_event_id && !existing.meet_link) {
    const meetLink = await getMeetLinkFromEvent(env, existing.calendar_event_id);
    if (meetLink) {
      await updateClassMeetLink(db, id, meetLink);
      const updated = await findClassById(db, id);
      return {
        message: 'Đã đồng bộ link Meet từ Google Calendar',
        cls: updated,
        googleCalendar: { event_id: existing.calendar_event_id, meet_link: meetLink }
      };
    }
    // Fall through to create new event
  }

  // No event_id but has start_date → try to find existing event in Calendar
  if (!existing.calendar_event_id && existing.start_date) {
    const found = await findEventByClassName(env, existing.class_name, existing.start_date);
    if (found?.eventId) {
      await updateClassCalendarInfo(db, id, { eventId: found.eventId, meetLink: found.meetLink });
      const updated = await findClassById(db, id);
      return {
        message: found.meetLink
          ? 'Đã tìm thấy và đồng bộ link Meet từ Google Calendar'
          : 'Đã tìm thấy event nhưng chưa có Meet link. Đang tạo Meet link...',
        cls: updated,
        googleCalendar: { event_id: found.eventId, meet_link: found.meetLink }
      };
    }
  }

  // Last resort: create a brand new Calendar event
  const calendarResult = await createOnlineClassEvent(env, {
    class_name: existing.class_name,
    description: existing.description,
    schedule_rule: existing.schedule_rule,
    schedule_time: existing.schedule_time,
    timezone: existing.timezone || 'Asia/Ho_Chi_Minh',
    start_date: existing.start_date,
    end_date: existing.end_date,
    teacher_name: existing.teacher_name
  });

  await updateClassCalendarSync(db, id, {
    meetLink: calendarResult.meetLink ?? '',
    eventId: calendarResult.eventId,
    recurrence: calendarResult.recurrence
  });

  const updated = await findClassById(db, id);
  return {
    message: 'Tạo link Meet thành công',
    cls: updated,
    googleCalendar: {
      event_id: calendarResult.eventId,
      meet_link: calendarResult.meetLink,
      calendar_link: calendarResult.htmlLink
    }
  };
}

// ─── Enrollment Business Logic ───────────────────────────────────────────────

/**
 * Student self-enroll. Returns { status: 'pending' } or throws.
 */
export async function enrollStudent(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  const cls = await findClassById(db, classId);
  if (!cls) throw Object.assign(new Error('Không tìm thấy lớp học'), { statusCode: 404 });
  if (cls.status !== 'active') throw Object.assign(new Error('Lớp học không còn mở đăng ký'), { statusCode: 400 });

  const currentCount = await countActiveEnrollments(db, classId);
  if (cls.max_students && currentCount >= cls.max_students) {
    throw Object.assign(new Error('Lớp học đã đủ số lượng học viên'), { statusCode: 400 });
  }

  const existing = await findEnrollment(db, classId, studentId);
  if (existing) {
    if (existing.status === 'active')  throw Object.assign(new Error('Bạn đã đăng ký lớp học này'), { statusCode: 400 });
    if (existing.status === 'pending') throw Object.assign(new Error('Bạn đã đăng ký và đang chờ duyệt'), { statusCode: 400 });
    await reEnroll(db, existing.id);
  } else {
    // Per-category dedupe: at most one active/pending class per category.
    await assertNoDuplicateCategoryEnrollment(db, studentId, cls);
    await createEnrollment(db, classId, studentId);
  }

  return { message: 'Đăng ký thành công! Vui lòng chờ Admin duyệt.', status: 'pending' };
}

/**
 * Admin: add a student directly (active status).
 */
export async function adminAddStudent(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  const cls = await findClassById(db, classId);
  if (!cls) throw Object.assign(new Error('Không tìm thấy lớp học'), { statusCode: 404 });

  const currentCount = await countActiveEnrollments(db, classId);
  if (cls.max_students && currentCount >= cls.max_students) {
    throw Object.assign(new Error('Lớp học đã đủ số lượng học viên'), { statusCode: 400 });
  }

  const student: any = await findStudentById(db, studentId);
  if (!student) throw Object.assign(new Error('Không tìm thấy học viên'), { statusCode: 404 });

  const existing = await findEnrollment(db, classId, studentId);
  if (existing) {
    if (existing.status === 'active') {
      throw Object.assign(new Error(`${student.ho_ten_full} đã đăng ký lớp này rồi`), { statusCode: 400 });
    }
    await reactivateEnrollment(db, existing.id);
  } else {
    // Per-category dedupe: at most one active class per category.
    await assertNoDuplicateCategoryEnrollment(db, studentId, cls);
    await activateEnrollmentDirect(db, classId, studentId);
  }

  return { message: `Đã thêm ${student.ho_ten_full} vào lớp thành công`, student_id: studentId, class_id: classId };
}

/**
 * Admin: approve a pending enrollment.
 */
export async function approveEnrollmentById(db: D1Database, classId: number | string, enrollmentId: number | string, adminId: number | string): Promise<any> {
  const enrollment: any = await findEnrollmentById(db, enrollmentId, classId);
  if (!enrollment) throw Object.assign(new Error('Không tìm thấy yêu cầu đăng ký'), { statusCode: 404 });
  if (enrollment.status === 'active') throw Object.assign(new Error('Học viên này đã được duyệt rồi'), { statusCode: 400 });

  // Check capacity
  const cls = await findClassById(db, classId);
  if (!cls) throw Object.assign(new Error('Không tìm thấy lớp học'), { statusCode: 404 });
  const activeCount = await countActiveEnrollments(db, classId);
  if (cls.max_students && activeCount >= cls.max_students) {
    throw Object.assign(new Error('Lớp học đã đủ số lượng học viên. Không thể duyệt thêm.'), { statusCode: 400 });
  }

  await approveEnrollment(db, enrollmentId, adminId);
  return { message: `Đã duyệt học viên ${enrollment.ho_ten_full} vào lớp`, enrollment_id: enrollmentId };
}

/**
 * Admin: reject an enrollment.
 */
export async function rejectEnrollmentById(db: D1Database, classId: number | string, enrollmentId: number | string, adminId: number | string, reason?: string): Promise<any> {
  const enrollment: any = await findEnrollmentById(db, enrollmentId, classId);
  if (!enrollment) throw Object.assign(new Error('Không tìm thấy yêu cầu đăng ký'), { statusCode: 404 });
  if (enrollment.status === 'rejected') throw Object.assign(new Error('Học viên này đã bị từ chối rồi'), { statusCode: 400 });

  await rejectEnrollment(db, enrollmentId, adminId, reason ?? '');
  return { message: `Đã từ chối học viên ${enrollment.ho_ten_full}`, enrollment_id: enrollmentId, reason };
}

/**
 * Admin: cancel (remove) a student from a class.
 */
export async function removeStudent(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  const result: any = await cancelEnrollment(db, classId, studentId);
  if (result.meta.changes === 0) {
    throw Object.assign(new Error('Không tìm thấy đăng ký'), { statusCode: 404 });
  }
  return { message: 'Hủy đăng ký học viên thành công' };
}

// ─── Student Lookup for Enrollment ──────────────────────────────────────────

/**
 * Find student by CCCD for inline auth in enrollment flow.
 */
export async function findStudentForAuth(db: D1Database, cccd: string): Promise<any> {
  return findStudentByCccd(db, cccd);
}

/**
 * Get available students (not yet active-enrolled in class) for admin search.
 */
export async function getAvailableStudents(db: D1Database, classId: number | string, keyword?: string): Promise<any[] | null> {
  const cls = await findClassById(db, classId);
  if (!cls) return null;

  const students: any = await searchStudents(db, keyword || '');
  const enrolledIds = await getEnrolledStudentIds(db, classId);

  return (students.results || []).filter((s: any) => !enrolledIds.has(s.id));
}

// ─── Enrollment List Helpers ─────────────────────────────────────────────────

export { activateEnrollmentDirect, cancelEnrollment, findEnrollment, reactivateEnrollment };
export { listEnrolledStudents, listActiveEnrollmentsWithStudents, listPendingEnrollmentsWithStudents };
export { findClassById as getClassForName }; // used for class_name in responses
export { findClassBySourceExamSchedule };
