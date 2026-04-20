import type { Env } from '../../types/env.js';
import {
  activateEnrollmentDirect,
  cancelEnrollment,
  createClass,
  deleteClassById,
  findClassBySourceExamSchedule,
  findEnrollment,
  reactivateEnrollment,
  updateClassById,
} from './online-classes.js';

interface ExamScheduleRow {
  id: number;
  exam_name: string;
  exam_date: string;
  duration_minutes: number | null;
  notes: string | null;
  exam_type: string | null;
  exam_level: string | null;
  exam_category_id: number | null;
  exam_type_id: number | null;
  class_seed_name: string | null;
  class_seed_description: string | null;
  class_seed_schedule_rule: string | null;
  class_seed_schedule_time: string | null;
  class_seed_timezone: string | null;
  class_seed_start_date: string | null;
  class_seed_end_date: string | null;
  class_seed_teacher_name: string | null;
  class_seed_max_students: number | null;
  deleted_at: string | null;
  organizer_uuid: string | null;
  program_uuid: string | null;
  level_uuid: string | null;
  custom_field_payload: string | null;
  override_payload: string | null;
  zoom_link: string | null;
  zoom_link_backup: string | null;
  zoom_link_backup_2: string | null;
  zoom_link_backup_3: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  zoom_meeting_id_backup: string | null;
  zoom_passcode_backup: string | null;
  delivery_mode: string | null;
  linked_class_enabled: number | null;
  visible_on_exam_teacher: number | null;
}

function normalizeString(value: unknown) {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toDateOnly(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function toTimeOnly(value: Date) {
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = String(value || '').split('-').map((item) => Number.parseInt(item, 10));
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function addDays(value: Date, amount: number) {
  const copy = new Date(value.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function toDateOnlyFromDateTime(value: string | null | undefined) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function buildDateRange(startDate: string, endDate: string) {
  const items: string[] = [];
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    items.push(toDateOnly(cursor));
  }

  return items;
}

const AUTO_LEARNING_SESSION_NOTE = 'Tự sinh từ lịch thi';

function isAutoLearningSessionNote(value: unknown) {
  return normalizeString(value) === AUTO_LEARNING_SESSION_NOTE;
}

async function findExamSchedule(db: D1Database, examScheduleId: number): Promise<ExamScheduleRow | null> {
  const row = await db.prepare(
    `
      SELECT
        exam_schedules.id,
        exam_schedules.exam_name,
        exam_schedules.exam_date,
        exam_schedules.duration_minutes,
        exam_schedules.notes,
        exam_schedules.exam_type,
        exam_schedules.exam_level,
        exam_schedules.exam_category_id,
        exam_schedules.exam_type_id,
        exam_schedules.class_seed_name,
        exam_schedules.class_seed_description,
        exam_schedules.class_seed_schedule_rule,
        exam_schedules.class_seed_schedule_time,
        exam_schedules.class_seed_timezone,
        exam_schedules.class_seed_start_date,
        exam_schedules.class_seed_end_date,
        exam_schedules.class_seed_teacher_name,
        exam_schedules.class_seed_max_students,
        exam_schedules.deleted_at,
        exam_schedules.organizer_uuid,
        exam_schedules.program_uuid,
        exam_schedules.level_uuid,
        exam_schedules.custom_field_payload,
        exam_schedules.override_payload,
        exam_schedules.zoom_link,
        exam_schedules.zoom_link_backup,
        exam_schedules.zoom_link_backup_2,
        exam_schedules.zoom_link_backup_3,
        exam_schedules.zoom_meeting_id,
        exam_schedules.zoom_passcode,
        exam_schedules.zoom_meeting_id_backup,
        exam_schedules.zoom_passcode_backup,
        p.delivery_mode,
        p.linked_class_enabled,
        p.visible_on_exam_teacher
      FROM exam_schedules
      LEFT JOIN programs p ON p.uuid = exam_schedules.program_uuid
      WHERE exam_schedules.id = ?
    `
  ).bind(examScheduleId).first();

  return (row as ExamScheduleRow | null) || null;
}

function hasLinkedClassSeed(schedule: ExamScheduleRow) {
  return Boolean(
    schedule.class_seed_name ||
    schedule.class_seed_schedule_rule ||
    schedule.class_seed_schedule_time ||
    schedule.class_seed_start_date
  );
}

function hasZoomMeetingConfig(schedule: ExamScheduleRow) {
  return Boolean(
    normalizeString(schedule.zoom_link) ||
      normalizeString(schedule.zoom_link_backup) ||
      normalizeString(schedule.zoom_link_backup_2) ||
      normalizeString(schedule.zoom_link_backup_3) ||
      normalizeString(schedule.zoom_meeting_id) ||
      normalizeString(schedule.zoom_passcode) ||
      normalizeString(schedule.zoom_meeting_id_backup) ||
      normalizeString(schedule.zoom_passcode_backup)
  );
}

function shouldSyncLinkedClass(schedule: ExamScheduleRow) {
  const hasSeed = hasLinkedClassSeed(schedule);
  const hasZoom = hasZoomMeetingConfig(schedule);

  if (!schedule.program_uuid) {
    return hasSeed || hasZoom;
  }

  const canSyncByProgramConfig = Boolean(
    schedule.delivery_mode === 'internal_training' &&
      Number(schedule.linked_class_enabled || 0) > 0 &&
      Number(schedule.visible_on_exam_teacher || 0) > 0
  );

  return canSyncByProgramConfig && (hasSeed || hasZoom);
}

async function resolveExamCategoryId(
  db: D1Database,
  explicitCategoryId: number | null,
  legacyExamType: string | null
) {
  if (explicitCategoryId) {
    return explicitCategoryId;
  }

  const legacy = String(legacyExamType || '').trim();
  if (!legacy) {
    return null;
  }

  const row = await db.prepare(
    `
      SELECT id
      FROM exam_categories
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
         OR LOWER(TRIM(code)) = LOWER(TRIM(?))
      ORDER BY id
      LIMIT 1
    `
  ).bind(legacy, legacy).first<{ id: number }>();

  return row?.id ?? null;
}

async function resolveExamTypeId(
  db: D1Database,
  explicitExamTypeId: number | null,
  legacyExamType: string | null
) {
  if (explicitExamTypeId) {
    return explicitExamTypeId;
  }

  const legacy = String(legacyExamType || '').trim();
  if (!legacy) {
    return null;
  }

  const row = await db.prepare(
    `
      SELECT id
      FROM exam_types
      WHERE LOWER(TRIM(code)) = LOWER(TRIM(?))
         OR LOWER(TRIM(name)) = LOWER(TRIM(?))
      ORDER BY id
      LIMIT 1
    `
  ).bind(legacy, legacy).first<{ id: number }>();

  return row?.id ?? null;
}

function buildClassSeed(schedule: ExamScheduleRow) {
  const examDate = new Date(schedule.exam_date);
  const safeDate = Number.isNaN(examDate.getTime()) ? new Date() : examDate;
  const startTime = toTimeOnly(safeDate);
  const endTimeDate = new Date(safeDate.getTime() + (Math.max(schedule.duration_minutes || 120, 30) * 60 * 1000));
  const endTime = toTimeOnly(endTimeDate);

  return {
    class_name: String(
      schedule.class_seed_name ||
        `${schedule.exam_name} - Lớp ôn tập`
    ).trim(),
    description: String(
      schedule.class_seed_description ||
        schedule.notes ||
        `Lớp học được tạo tự động từ lịch thi ${schedule.exam_name}.`
    ).trim(),
    schedule_rule: String(schedule.class_seed_schedule_rule || 'weekly').trim(),
    schedule_time: String(schedule.class_seed_schedule_time || `${startTime}-${endTime}`).trim(),
    timezone: String(schedule.class_seed_timezone || 'Asia/Ho_Chi_Minh').trim(),
    start_date: String(schedule.class_seed_start_date || toDateOnly(safeDate)).trim(),
    end_date: schedule.class_seed_end_date ? String(schedule.class_seed_end_date).trim() : null,
    teacher_name: schedule.class_seed_teacher_name ? String(schedule.class_seed_teacher_name).trim() : null,
    max_students: Number(schedule.class_seed_max_students || 50),
  };
}

async function syncLearningSessionsForLinkedClass(
  db: D1Database,
  examScheduleId: number
) {
  const linkedClass = await findClassBySourceExamSchedule(db, examScheduleId);
  if (!linkedClass) {
    return { created: 0, updated: 0, deleted: 0, window_start: null, window_end: null };
  }

  const schedule = await findExamSchedule(db, examScheduleId);
  const examDateKey = toDateOnlyFromDateTime(schedule?.exam_date);
  const firstRegistration = await db.prepare(
    `
      SELECT MIN(date(created_at)) as first_registration_date
      FROM exam_registrations
      WHERE exam_id = ?
        AND status IN ('approved', 'registered')
    `
  ).bind(examScheduleId).first<{ first_registration_date?: string | null }>();

  const firstRegistrationDate = normalizeString(firstRegistration?.first_registration_date) || null;
  const sessionWindowEndExclusive = examDateKey ? toDateOnly(addDays(parseDateOnly(examDateKey), -1)) : null;

  let targetDates: string[] = [];
  if (
    firstRegistrationDate &&
    sessionWindowEndExclusive &&
    parseDateOnly(firstRegistrationDate).getTime() <= parseDateOnly(sessionWindowEndExclusive).getTime()
  ) {
    targetDates = buildDateRange(firstRegistrationDate, sessionWindowEndExclusive);
  }

  const scheduleTime = normalizeString(linkedClass.schedule_time) || normalizeString(schedule?.class_seed_schedule_time) || '08:00-10:00';
  const [startTimeRaw, endTimeRaw] = scheduleTime.split('-');
  const startTime = normalizeString(startTimeRaw) || '08:00';
  const endTime = normalizeString(endTimeRaw) || '10:00';

  const existingSessionsResult = await db.prepare(
    `
      SELECT
        s.id,
        s.session_date,
        s.start_time,
        s.end_time,
        s.note,
        EXISTS(
          SELECT 1
          FROM online_class_attendance a
          WHERE a.session_id = s.id
            AND (
              COALESCE(a.status, 'pending') != 'pending'
              OR a.checked_in_at IS NOT NULL
              OR a.zoom_join_source IS NOT NULL
              OR a.note IS NOT NULL
            )
          LIMIT 1
        ) as has_attendance_history
      FROM online_class_sessions s
      WHERE s.online_class_id = ?
      ORDER BY s.session_date ASC, s.id ASC
    `
  ).bind(linkedClass.id).all<{
    id?: number;
    session_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    note?: string | null;
    has_attendance_history?: number | null;
  }>();

  const existingSessions = existingSessionsResult.results || [];
  const existingByDate = new Map(
    existingSessions
      .map((row) => [normalizeString(row.session_date) || '', row] as const)
      .filter(([date]) => Boolean(date))
  );
  const targetDateSet = new Set(targetDates);

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const sessionDate of targetDates) {
    const existingSession = existingByDate.get(sessionDate);
    if (!existingSession) {
      await db.prepare(
        `
          INSERT INTO online_class_sessions (
            online_class_id,
            session_date,
            start_time,
            end_time,
            note
          )
          VALUES (?, ?, ?, ?, ?)
        `
      ).bind(linkedClass.id, sessionDate, startTime, endTime, AUTO_LEARNING_SESSION_NOTE).run();
      created += 1;
      continue;
    }

    if (!isAutoLearningSessionNote(existingSession.note)) {
      continue;
    }

    const needsUpdate =
      normalizeString(existingSession.start_time) !== startTime ||
      normalizeString(existingSession.end_time) !== endTime ||
      !isAutoLearningSessionNote(existingSession.note);

    if (!needsUpdate) {
      continue;
    }

    await db.prepare(
      `
        UPDATE online_class_sessions
        SET start_time = ?,
            end_time = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    ).bind(startTime, endTime, AUTO_LEARNING_SESSION_NOTE, existingSession.id).run();
    updated += 1;
  }

  for (const session of existingSessions) {
    const sessionDate = normalizeString(session.session_date);
    if (!sessionDate || targetDateSet.has(sessionDate) || !isAutoLearningSessionNote(session.note)) {
      continue;
    }

    if (Number(session.has_attendance_history || 0) > 0) {
      continue;
    }

    await db.prepare(`DELETE FROM online_class_sessions WHERE id = ?`).bind(session.id).run();
    deleted += 1;
  }

  return {
    created,
    updated,
    deleted,
    window_start: targetDates[0] ?? null,
    window_end: targetDates[targetDates.length - 1] ?? null,
  };
}

async function cleanupClassScopedData(db: D1Database, classId: number) {
  const assignmentIds = await db.prepare(
    `SELECT id FROM assignments WHERE class_id = ?`
  ).bind(classId).all<{ id: number }>();

  for (const row of assignmentIds.results || []) {
    await db.prepare(`DELETE FROM assignment_targets WHERE assignment_id = ?`).bind(row.id).run();
    await db.prepare(`DELETE FROM assignment_submissions WHERE assignment_id = ?`).bind(row.id).run();
  }

  await db.prepare(`DELETE FROM assignments WHERE class_id = ? AND source_site = 'edu'`).bind(classId).run();
  await db.prepare(`DELETE FROM document_permissions WHERE online_class_id = ?`).bind(classId).run();
  await db.prepare(
    `DELETE FROM document_shares WHERE target_type = 'online_class' AND target_id = ?`
  ).bind(classId).run();
  await db.prepare(
    `DELETE FROM notifications WHERE online_class_id = ? AND COALESCE(audience_scope, 'all') = 'class' AND source_site = 'edu'`
  ).bind(classId).run();
  await db.prepare(
    `UPDATE practice_exam_assignments SET online_class_id = NULL WHERE online_class_id = ? AND student_id IS NOT NULL`
  ).bind(classId).run();
  await db.prepare(
    `DELETE FROM practice_exam_assignments WHERE online_class_id = ? AND student_id IS NULL`
  ).bind(classId).run();
}

export async function syncLinkedOnlineClassForExamSchedule(
  db: D1Database,
  env: Env,
  examScheduleId: number,
  actorId: number
) {
  const schedule = await findExamSchedule(db, examScheduleId);
  if (!schedule || schedule.deleted_at) {
    return null;
  }

  const existing = await findClassBySourceExamSchedule(db, examScheduleId);
  if (!shouldSyncLinkedClass(schedule)) {
    if (existing) {
      await cleanupClassScopedData(db, existing.id);
      await deleteClassById(db, env, existing.id);
    }
    return null;
  }

  const examCategoryId = await resolveExamCategoryId(db, schedule.exam_category_id, schedule.exam_type);
  const examTypeId = await resolveExamTypeId(db, schedule.exam_type_id, schedule.exam_type);
  const classSeed = buildClassSeed(schedule);

  // Sync zoom link từ exam_schedule → meet_link của online_class
  const meetLink =
    normalizeString(schedule.zoom_link) ||
    normalizeString(schedule.zoom_link_backup) ||
    normalizeString(schedule.zoom_link_backup_2) ||
    normalizeString(schedule.zoom_link_backup_3) ||
    null;

  const payload = {
    ...classSeed,
    meet_link: meetLink,
    source_exam_schedule_id: schedule.id,
    source_kind: 'exam_schedule',
    exam_category_id: examCategoryId,
    exam_type_id: examTypeId,
    organizer_uuid: schedule.organizer_uuid,
    program_uuid: schedule.program_uuid,
    level_uuid: schedule.level_uuid,
    custom_field_payload: schedule.custom_field_payload,
    override_payload: schedule.override_payload,
  };

  if (!existing) {
    const created = await createClass(db, env, payload, actorId);
    return created?.newClass || null;
  }

  const updated = await updateClassById(db, env, existing.id, payload);
  return updated;
}

export async function syncLinkedClassSessionsForExamSchedule(
  db: D1Database,
  examScheduleId: number
) {
  return syncLearningSessionsForLinkedClass(db, examScheduleId);
}

export async function syncApprovedExamRegistrationsToOnlineClass(db: D1Database, examScheduleId: number) {
  const linkedClass = await findClassBySourceExamSchedule(db, examScheduleId);
  if (!linkedClass) {
    return { synced: 0 };
  }

  const approvedRows = await db.prepare(
    `
      SELECT student_id
      FROM exam_registrations
      WHERE exam_id = ?
        AND status IN ('approved', 'registered')
    `
  ).bind(examScheduleId).all<{ student_id: number }>();

  let synced = 0;

  for (const row of approvedRows.results || []) {
    const existingEnrollment = await findEnrollment(db, linkedClass.id, row.student_id);
    if (!existingEnrollment) {
      await activateEnrollmentDirect(db, linkedClass.id, row.student_id);
      synced += 1;
      continue;
    }

    if (existingEnrollment.status !== 'active') {
      await reactivateEnrollment(db, existingEnrollment.id);
      synced += 1;
    }
  }

  return { synced };
}

export async function syncSingleExamRegistrationToOnlineClass(db: D1Database, examScheduleId: number, studentId: number) {
  const linkedClass = await findClassBySourceExamSchedule(db, examScheduleId);
  if (!linkedClass) {
    return { synced: false };
  }

  const existingEnrollment = await findEnrollment(db, linkedClass.id, studentId);

  if (!existingEnrollment) {
    await activateEnrollmentDirect(db, linkedClass.id, studentId);
    return { synced: true };
  }

  if (existingEnrollment.status !== 'active') {
    await reactivateEnrollment(db, existingEnrollment.id);
    return { synced: true };
  }

  return { synced: false };
}

export async function revokeExamRegistrationFromOnlineClass(db: D1Database, examScheduleId: number, studentId: number) {
  const linkedClass = await findClassBySourceExamSchedule(db, examScheduleId);
  if (!linkedClass) {
    return { revoked: false };
  }

  await cancelEnrollment(db, linkedClass.id, studentId);
  return { revoked: true };
}

export async function deleteLinkedOnlineClassForExamSchedule(
  db: D1Database,
  env: Env,
  examScheduleId: number
) {
  const linkedClass = await findClassBySourceExamSchedule(db, examScheduleId);
  if (!linkedClass) {
    return { deleted: false };
  }

  await cleanupClassScopedData(db, linkedClass.id);
  await deleteClassById(db, env, linkedClass.id);
  return { deleted: true };
}

export async function resyncAllLinkedOnlineClasses(
  db: D1Database,
  env: Env,
  actorId: number
) {
  const schedulesResult = await db.prepare(
    `
      SELECT id, deleted_at
      FROM exam_schedules
      ORDER BY id ASC
    `
  ).all<{ id: number; deleted_at: string | null }>();

  const liveScheduleIds = new Set<number>();
  let createdOrUpdated = 0;
  let deleted = 0;
  let activated = 0;
  let cancelled = 0;

  for (const row of schedulesResult.results || []) {
    if (!row?.id) {
      continue;
    }

    if (row.deleted_at) {
      const deleteResult = await deleteLinkedOnlineClassForExamSchedule(db, env, row.id);
      if (deleteResult.deleted) {
        deleted += 1;
      }
      continue;
    }

    await syncLinkedOnlineClassForExamSchedule(db, env, row.id, actorId);
    await syncLinkedClassSessionsForExamSchedule(db, row.id);
    liveScheduleIds.add(row.id);
    createdOrUpdated += 1;
  }

  const staleLinkedRows = await db.prepare(
    `
      SELECT id, source_exam_schedule_id
      FROM online_classes
      WHERE COALESCE(source_kind, 'exam_schedule') = 'exam_schedule'
        AND (
          source_exam_schedule_id IS NULL
          OR source_exam_schedule_id NOT IN (
            SELECT id
            FROM exam_schedules
            WHERE deleted_at IS NULL
          )
        )
    `
  ).all<{ id?: number; source_exam_schedule_id?: number | null }>();

  for (const row of staleLinkedRows.results || []) {
    if (row?.source_exam_schedule_id) {
      const deleteResult = await deleteLinkedOnlineClassForExamSchedule(db, env, row.source_exam_schedule_id);
      if (deleteResult.deleted) {
        deleted += 1;
      }
      continue;
    }

    if (row?.id) {
      await cleanupClassScopedData(db, row.id);
      await deleteClassById(db, env, row.id);
      deleted += 1;
    }
  }

  const linkedClasses = await db.prepare(
    `
      SELECT id, source_exam_schedule_id
      FROM online_classes
      WHERE COALESCE(source_kind, 'exam_schedule') = 'exam_schedule'
        AND source_exam_schedule_id IS NOT NULL
    `
  ).all<{ id: number; source_exam_schedule_id: number }>();

  for (const linkedClass of linkedClasses.results || []) {
    if (!liveScheduleIds.has(linkedClass.source_exam_schedule_id)) {
      continue;
    }

    const approvedRows = await db.prepare(
      `
        SELECT student_id
        FROM exam_registrations
        WHERE exam_id = ?
          AND status IN ('approved', 'registered')
      `
    ).bind(linkedClass.source_exam_schedule_id).all<{ student_id: number }>();

    const approvedStudentIds = new Set(
      (approvedRows.results || [])
        .map((row) => Number(row.student_id))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    const enrollmentRows = await db.prepare(
      `
        SELECT id, student_id, status
        FROM online_class_enrollments
        WHERE online_class_id = ?
      `
    ).bind(linkedClass.id).all<{ id: number; student_id: number; status: string }>();

    for (const enrollment of enrollmentRows.results || []) {
      const studentId = Number(enrollment.student_id);
      if (!approvedStudentIds.has(studentId)) {
        if (enrollment.status !== 'cancelled') {
          await cancelEnrollment(db, linkedClass.id, studentId);
          cancelled += 1;
        }
        continue;
      }

      approvedStudentIds.delete(studentId);
      if (enrollment.status !== 'active') {
        await reactivateEnrollment(db, enrollment.id);
        activated += 1;
      }
    }

    for (const studentId of approvedStudentIds) {
      await activateEnrollmentDirect(db, linkedClass.id, studentId);
      activated += 1;
    }
  }

  return {
    schedulesScanned: (schedulesResult.results || []).length,
    classesCreatedOrUpdated: createdOrUpdated,
    classesDeleted: deleted,
    enrollmentsActivated: activated,
    enrollmentsCancelled: cancelled,
  };
}
