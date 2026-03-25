import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse, verifyJWT } from '../utils/helpers.js';
import {
  createExamSchedule,
  getExamSchedulesByClass,
  getUpcomingExams,
  updateExamSchedule,
  deleteExamSchedule,
  restoreExamSchedule,
  getDeletedExamSchedules,
  permanentlyDeleteExamSchedule,
  cleanupOldDeletedExams,
  getStudentExams,
  registerStudentForExam,
  cancelExamRegistration,
  getExamRegistrations,
  getPendingExamRegistrations,
  approveExamRegistration,
  approveAllExamRegistrations,
  rejectExamRegistration,
  isUpcomingExamRegistrationWindow,
  getZoomCheckinsForExam,
} from '../db/attendance-queries.js';
import {
  getExamTestById,
  checkRegistrationStatus,
  approveExamTestRegistration,
  registerForExamTest
} from '../db/exam-queries.js';
import { createActivityLog } from '../db/admin-queries.js';
import { getClassById } from '../db/queries.js';
import { authMiddleware } from '../middleware/auth-middleware.js';
import { enrichStudentWithImages } from '../services/student-service.js';
import {
  deleteLinkedOnlineClassForExamSchedule,
  resyncAllLinkedOnlineClasses,
  revokeExamRegistrationFromOnlineClass,
  syncApprovedExamRegistrationsToOnlineClass,
  syncLinkedOnlineClassForExamSchedule,
  syncSingleExamRegistrationToOnlineClass,
} from '../lib/services/exam-schedule-class-sync.js';
import { resolveProgramContext } from '../lib/program-platform/repository.js';

const examSchedules = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();
const CLASS_SEED_TIME_RE = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
const EXAM_LEVEL_OPTIONS = new Set(['A2', 'B1', 'B2', 'C1']);
const CLASS_SEED_WEEKLY_DAY_MIN = 1;
const CLASS_SEED_WEEKLY_DAY_MAX = 7;

// Auth guard for all exam schedule routes — use shared authMiddleware
examSchedules.use('*', authMiddleware);

function hasExamAdminAccess(user: any) {
  return Boolean(user && (user.role === 'admin' || user.role === 'super_admin'));
}

function requireExamAdmin(user: any, message = 'Chỉ admin mới có quyền truy cập') {
  if (!hasExamAdminAccess(user)) {
    return errorResponse(message, 403);
  }
  return null;
}

function trimNullable(value: unknown) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLookupKey(value: unknown) {
  return trimNullable(value)?.toLowerCase() ?? null;
}

function parseOptionalInt(value: unknown, fieldName: string) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    throw Object.assign(new Error(`${fieldName} phải là số hợp lệ`), { statusCode: 400 });
  }

  return parsed;
}

async function lookupExcelTemplateId(db: D1Database, name: string) {
  const result = await db.prepare(
    `
      SELECT id
      FROM excel_templates
      WHERE lower(name) = lower(?)
        AND is_active = 1
      LIMIT 1
    `
  ).bind(name).first<{ id: number | string }>();

  return result?.id != null ? Number(result.id) : null;
}

async function getOrganizerTemplateContext(db: D1Database, organizerUuid: string | null) {
  if (!organizerUuid) {
    return { organizerCode: null, organizerName: null };
  }

  const result = await db.prepare(
    `
      SELECT code, name
      FROM program_organizers
      WHERE uuid = ?
      LIMIT 1
    `
  ).bind(organizerUuid).first<{ code?: string | null; name?: string | null }>();

  return {
    organizerCode: result?.code ?? null,
    organizerName: result?.name ?? null,
  };
}

async function getProgramTemplateContext(db: D1Database, programUuid: string | null) {
  if (!programUuid) {
    return { programCode: null };
  }

  const result = await db.prepare(
    `
      SELECT code
      FROM programs
      WHERE uuid = ?
      LIMIT 1
    `
  ).bind(programUuid).first<{ code?: string | null }>();

  return {
    programCode: result?.code ?? null,
  };
}

async function resolveProgramOrganizerIdentifier(db: D1Database, rawValue: unknown) {
  const normalized = normalizeLookupKey(rawValue);
  if (!normalized) {
    return null;
  }

  const result = await db.prepare(
    `
      SELECT uuid
      FROM program_organizers
      WHERE lower(uuid) = ?
         OR lower(code) = ?
         OR lower(name) = ?
      LIMIT 1
    `
  ).bind(normalized, normalized, normalized).first<{ uuid?: string | null }>();

  return trimNullable(result?.uuid);
}

async function resolveProgramIdentifier(
  db: D1Database,
  rawValue: unknown,
  organizerUuid: string | null
) {
  const normalized = normalizeLookupKey(rawValue);
  if (!normalized) {
    return null;
  }

  const exactMatch = await db.prepare(
    `
      SELECT uuid
      FROM programs
      WHERE (? IS NULL OR organizer_uuid = ?)
        AND (
          lower(uuid) = ?
          OR lower(code) = ?
          OR lower(name) = ?
        )
      LIMIT 1
    `
  ).bind(organizerUuid, organizerUuid, normalized, normalized, normalized).first<{ uuid?: string | null }>();

  if (trimNullable(exactMatch?.uuid)) {
    return trimNullable(exactMatch?.uuid);
  }

  const fuzzyToken = `%${normalized.replace(/[\s_-]+/g, '%')}%`;
  const fuzzyMatches = await db.prepare(
    `
      SELECT uuid
      FROM programs
      WHERE (? IS NULL OR organizer_uuid = ?)
        AND is_active = 1
        AND (
          lower(code) LIKE ?
          OR lower(name) LIKE ?
        )
      ORDER BY visible_on_edu_admin DESC, id ASC
      LIMIT 2
    `
  ).bind(organizerUuid, organizerUuid, fuzzyToken, fuzzyToken).all<{ uuid?: string | null }>();

  const fuzzyResults = (fuzzyMatches.results || [])
    .map((row) => trimNullable(row?.uuid))
    .filter(Boolean);

  if (fuzzyResults.length === 1) {
    return fuzzyResults[0];
  }

  return null;
}

async function inferSingleProgramIdentifierForOrganizer(db: D1Database, organizerUuid: string | null) {
  if (!organizerUuid) {
    return null;
  }

  const results = await db.prepare(
    `
      SELECT uuid
      FROM programs
      WHERE organizer_uuid = ?
        AND is_active = 1
      ORDER BY visible_on_edu_admin DESC, id ASC
      LIMIT 2
    `
  ).bind(organizerUuid).all<{ uuid?: string | null }>();

  const uuids = (results.results || [])
    .map((row) => trimNullable(row?.uuid))
    .filter(Boolean);

  return uuids.length === 1 ? uuids[0] : null;
}

async function resolveProgramLevelIdentifier(
  db: D1Database,
  rawValue: unknown,
  programUuid: string | null
) {
  const normalized = normalizeLookupKey(rawValue);
  if (!normalized || !programUuid) {
    return null;
  }

  const result = await db.prepare(
    `
      SELECT uuid
      FROM program_levels
      WHERE program_uuid = ?
        AND (
          lower(uuid) = ?
          OR lower(code) = ?
          OR lower(name) = ?
        )
      LIMIT 1
    `
  ).bind(programUuid, normalized, normalized, normalized).first<{ uuid?: string | null }>();

  return trimNullable(result?.uuid);
}

function matchesPtitTemplate(
  organizerCode: string | null,
  organizerName: string | null,
) {
  return [organizerCode, organizerName].some((value) => value?.toUpperCase().includes('PTIT'));
}

async function resolveAutoExamTemplateId(
  db: D1Database,
  input: {
    organizerUuid: string | null;
    programUuid: string | null;
    programContext: Awaited<ReturnType<typeof resolveProgramContext>> | null;
  },
) {
  const organizerContext = input.programContext?.organizerCode || input.programContext?.organizerName
    ? {
        organizerCode: input.programContext?.organizerCode ?? null,
        organizerName: input.programContext?.organizerName ?? null,
      }
    : await getOrganizerTemplateContext(db, input.organizerUuid);

  const organizerCode = organizerContext.organizerCode;
  const organizerName = organizerContext.organizerName;

  if (matchesPtitTemplate(organizerCode, organizerName)) {
    return lookupExcelTemplateId(db, 'ptit');
  }

  const programCode =
    input.programContext?.programCode ??
    (await getProgramTemplateContext(db, input.programUuid)).programCode;

  if ((programCode || '').toUpperCase() === 'VEPT') {
    return lookupExcelTemplateId(db, 'vept');
  }

  return null;
}

function parseOptionalBoolean(value: unknown) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function normalizeZoomLinkPair(rawInput: any, shouldPersistZoom: boolean) {
  if (!shouldPersistZoom) {
    return {
      zoom_link: null,
      zoom_link_backup: null,
      zoom_link_backup_2: null,
      zoom_link_backup_3: null,
      zoom_meeting_id: null,
      zoom_passcode: null,
      zoom_meeting_id_backup: null,
      zoom_passcode_backup: null,
    };
  }

  const slots = [
    {
      link: trimNullable(rawInput?.zoom_link),
      meetingId: trimNullable(rawInput?.zoom_meeting_id),
      passcode: trimNullable(rawInput?.zoom_passcode),
    },
    {
      link: trimNullable(rawInput?.zoom_link_backup),
      meetingId: trimNullable(rawInput?.zoom_meeting_id_backup),
      passcode: trimNullable(rawInput?.zoom_passcode_backup),
    },
    {
      link: trimNullable(rawInput?.zoom_link_backup_2),
      meetingId: null,
      passcode: null,
    },
    {
      link: trimNullable(rawInput?.zoom_link_backup_3),
      meetingId: null,
      passcode: null,
    },
  ];

  const normalizedSlots: Array<{ link: string; meetingId: string | null; passcode: string | null }> = [];
  for (const slot of slots) {
    if (!slot.link) {
      continue;
    }

    if (normalizedSlots.some((item) => item.link === slot.link)) {
      continue;
    }

    normalizedSlots.push({
      link: slot.link,
      meetingId: slot.meetingId,
      passcode: slot.passcode,
    });

    if (normalizedSlots.length >= 2) {
      break;
    }
  }

  const primary = normalizedSlots[0] ?? null;
  const backup = normalizedSlots[1] ?? null;

  return {
    zoom_link: primary?.link ?? null,
    zoom_link_backup: backup?.link ?? null,
    zoom_link_backup_2: null,
    zoom_link_backup_3: null,
    zoom_meeting_id: primary?.meetingId ?? null,
    zoom_passcode: primary?.passcode ?? null,
    zoom_meeting_id_backup: backup?.meetingId ?? null,
    zoom_passcode_backup: backup?.passcode ?? null,
  };
}

function isValidIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseTimeRangeBoundary(value: string, fieldName: string) {
  const [hours, minutes] = value.split(':').map((item) => Number.parseInt(item, 10));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw Object.assign(new Error(`${fieldName} không hợp lệ`), { statusCode: 400 });
  }

  return hours * 60 + minutes;
}

function normalizeClassSeedScheduleTime(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!CLASS_SEED_TIME_RE.test(normalized)) {
    throw Object.assign(new Error('class_seed.schedule_time phải có định dạng HH:MM-HH:MM'), { statusCode: 400 });
  }

  const [startTime, endTime] = normalized.split('-');
  const startMinutes = parseTimeRangeBoundary(startTime, 'Giờ bắt đầu lớp');
  const endMinutes = parseTimeRangeBoundary(endTime, 'Giờ kết thúc lớp');

  if (endMinutes <= startMinutes) {
    throw Object.assign(new Error('class_seed.schedule_time phải có giờ kết thúc lớn hơn giờ bắt đầu'), { statusCode: 400 });
  }

  return `${startTime}-${endTime}`;
}

function normalizeClassSeedScheduleRule(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'DAILY') {
    return 'DAILY';
  }

  if (!normalized.startsWith('WEEKLY:')) {
    throw Object.assign(new Error('class_seed.schedule_rule chỉ hỗ trợ DAILY hoặc WEEKLY:<1-7>'), { statusCode: 400 });
  }

  const rawDays = normalized
    .slice('WEEKLY:'.length)
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item))
    .map((item) => (item === 0 ? 7 : item))
    .filter((item) => item >= CLASS_SEED_WEEKLY_DAY_MIN && item <= CLASS_SEED_WEEKLY_DAY_MAX);

  const uniqueDays = Array.from(new Set(rawDays)).sort((left, right) => left - right);
  if (uniqueDays.length === 0) {
    throw Object.assign(new Error('class_seed.schedule_rule WEEKLY phải có ít nhất một ngày hợp lệ từ 1-7'), { statusCode: 400 });
  }

  return `WEEKLY:${uniqueDays.join(',')}`;
}

function toDateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error('Ngày không hợp lệ'), { statusCode: 400 });
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeOnly(value: Date) {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildDefaultClassSeedScheduleTime(examDate: Date, durationMinutes: number | null) {
  const safeDuration = Math.max(durationMinutes || 120, 30);
  const start = toTimeOnly(examDate);
  const endDate = new Date(examDate.getTime() + safeDuration * 60 * 1000);
  const end = toTimeOnly(endDate);
  return `${start}-${end}`;
}

async function resolveLegacyExamTypeLabel(
  db: D1Database,
  examCategoryId: number | null,
  examTypeId: number | null,
  fallbackExamType: string | null
) {
  if (examTypeId) {
    const typeRow = await db.prepare(
      `
        SELECT name, code
        FROM exam_types
        WHERE id = ?
      `
    ).bind(examTypeId).first<{ name?: string; code?: string }>();

    if (typeRow?.name) {
      return typeRow.name;
    }

    if (typeRow?.code) {
      return typeRow.code;
    }
  }

  if (examCategoryId) {
    const categoryRow = await db.prepare(
      `
        SELECT name, code
        FROM exam_categories
        WHERE id = ?
      `
    ).bind(examCategoryId).first<{ name?: string; code?: string }>();

    if (categoryRow?.code) {
      return categoryRow.code;
    }

    if (categoryRow?.name) {
      return categoryRow.name;
    }
  }

  return trimNullable(fallbackExamType);
}

async function normalizeExamSchedulePayload(db: D1Database, rawInput: any) {
  const classSeed = typeof rawInput?.class_seed === 'object' && rawInput?.class_seed
    ? rawInput.class_seed
    : {};

  const classId = parseOptionalInt(rawInput?.class_id, 'class_id');
  if (classId) {
    const classExists = await getClassById(db, classId);
    if (!classExists) {
      throw Object.assign(new Error(`Lớp học với ID ${classId} không tồn tại`), { statusCode: 404 });
    }
  }

  const examName = trimNullable(rawInput?.exam_name);
  if (!examName) {
    throw Object.assign(new Error('Thiếu thông tin bắt buộc: exam_name'), { statusCode: 400 });
  }

  if (!rawInput?.exam_date) {
    throw Object.assign(new Error('Thiếu thông tin bắt buộc: exam_date'), { statusCode: 400 });
  }

  const examDate = new Date(rawInput.exam_date);
  if (Number.isNaN(examDate.getTime())) {
    throw Object.assign(new Error('Ngày thi không hợp lệ'), { statusCode: 400 });
  }

  const formattedDate = examDate.toISOString().slice(0, 19).replace('T', ' ');
  const duration = parseOptionalInt(rawInput?.duration_minutes, 'duration_minutes');

  if (duration !== null && duration < 1) {
    throw Object.assign(new Error('Thời lượng phải là số dương'), { statusCode: 400 });
  }

  const organizerInput = trimNullable(rawInput?.organizer_uuid);
  const organizerUuid =
    (await resolveProgramOrganizerIdentifier(db, organizerInput)) ??
    organizerInput;
  const programInput = trimNullable(rawInput?.program_uuid);
  const programUuid =
    (await resolveProgramIdentifier(db, programInput, organizerUuid)) ??
    (await resolveProgramIdentifier(db, programInput, null)) ??
    (await inferSingleProgramIdentifierForOrganizer(db, organizerUuid)) ??
    programInput;
  const levelInput = trimNullable(rawInput?.level_uuid);
  const levelUuid =
    (await resolveProgramLevelIdentifier(db, levelInput, programUuid)) ??
    levelInput;
  const programContext = await resolveProgramContext(db, {
    organizerUuid,
    programUuid,
    levelUuid,
  });

  const examCategoryId =
    parseOptionalInt(rawInput?.exam_category_id, 'exam_category_id') ??
    programContext?.legacyExamCategoryId ??
    null;
  if (!examCategoryId) {
    throw Object.assign(new Error('Thiếu thông tin bắt buộc: program_uuid hoặc exam_category_id'), { statusCode: 400 });
  }

  const examTypeId =
    parseOptionalInt(rawInput?.exam_type_id, 'exam_type_id') ??
    programContext?.legacyExamTypeId ??
    null;
  const rawExamLevel = trimNullable(rawInput?.exam_level);
  const examLevelCandidate = rawExamLevel ? rawExamLevel.toUpperCase() : programContext?.levelCode ?? null;
  const examLevel = examLevelCandidate && EXAM_LEVEL_OPTIONS.has(examLevelCandidate)
    ? examLevelCandidate
    : null;

  const classSeedMaxStudents = parseOptionalInt(
    classSeed.max_students ?? rawInput?.class_seed_max_students,
    'class_seed_max_students'
  ) ?? 50;

  if (classSeedMaxStudents < 1) {
    throw Object.assign(new Error('class_seed_max_students phải lớn hơn 0'), { statusCode: 400 });
  }

  const classSeedName = trimNullable(classSeed.name ?? rawInput?.class_seed_name);
  const classSeedScheduleRule = trimNullable(classSeed.schedule_rule ?? rawInput?.class_seed_schedule_rule);
  const classSeedScheduleTime = trimNullable(classSeed.schedule_time ?? rawInput?.class_seed_schedule_time);
  const classSeedTimezone = trimNullable(classSeed.timezone ?? rawInput?.class_seed_timezone) || 'Asia/Ho_Chi_Minh';
  const classSeedStartDate = trimNullable(classSeed.start_date ?? rawInput?.class_seed_start_date);
  const classSeedEndDate = trimNullable(classSeed.end_date ?? rawInput?.class_seed_end_date);
  const classSeedTeacherName = trimNullable(classSeed.teacher_name ?? rawInput?.class_seed_teacher_name);
  const isExternalRedirectProgram = programContext?.deliveryMode === 'external_redirect';
  const enableLinkedClassFlag =
    parseOptionalBoolean(rawInput?.enable_linked_class) ??
    parseOptionalBoolean(classSeed.enabled) ??
    null;
  const enableZoomMeetingFlag = parseOptionalBoolean(rawInput?.enable_zoom_meeting) ?? null;
  const hasZoomFields = Boolean(
    trimNullable(rawInput?.zoom_link) ||
    trimNullable(rawInput?.zoom_link_backup) ||
    trimNullable(rawInput?.zoom_link_backup_2) ||
    trimNullable(rawInput?.zoom_link_backup_3) ||
    trimNullable(rawInput?.zoom_meeting_id) ||
    trimNullable(rawInput?.zoom_passcode) ||
    trimNullable(rawInput?.zoom_meeting_id_backup) ||
    trimNullable(rawInput?.zoom_passcode_backup)
  );
  const shouldPersistZoom = enableZoomMeetingFlag === true || (enableZoomMeetingFlag !== false && hasZoomFields);
  const shouldAutoEnableLinkedClassFromZoom = shouldPersistZoom && !isExternalRedirectProgram;
  const hasLinkedClassSeed = Boolean(
    classSeedName ||
    classSeedScheduleRule ||
    classSeedScheduleTime ||
    classSeedStartDate
  );
  const shouldPersistLinkedClass = !isExternalRedirectProgram && (
    enableLinkedClassFlag === true ||
    shouldAutoEnableLinkedClassFromZoom ||
    (enableLinkedClassFlag !== false && hasLinkedClassSeed)
  );

  const resolvedClassSeedName = shouldPersistLinkedClass
    ? (classSeedName || `${examName} - Lớp ôn tập`)
    : null;
  const resolvedClassSeedScheduleRuleInput = shouldPersistLinkedClass
    ? (classSeedScheduleRule || 'DAILY')
    : null;
  const resolvedClassSeedScheduleTimeInput = shouldPersistLinkedClass
    ? (classSeedScheduleTime || buildDefaultClassSeedScheduleTime(examDate, duration))
    : null;
  const resolvedClassSeedStartDateInput = shouldPersistLinkedClass
    ? (classSeedStartDate || toDateOnly(formattedDate))
    : null;
  const resolvedClassSeedDescription = shouldPersistLinkedClass
    ? trimNullable(classSeed.description ?? rawInput?.class_seed_description)
    : null;
  const resolvedClassSeedTimezone = shouldPersistLinkedClass ? classSeedTimezone : null;
  const resolvedClassSeedTeacherName = shouldPersistLinkedClass ? classSeedTeacherName : null;

  const normalizedClassSeedScheduleRule =
    shouldPersistLinkedClass
      ? normalizeClassSeedScheduleRule(resolvedClassSeedScheduleRuleInput)
      : null;
  const normalizedClassSeedScheduleTime =
    shouldPersistLinkedClass
      ? normalizeClassSeedScheduleTime(resolvedClassSeedScheduleTimeInput)
      : null;
  const normalizedClassSeedStartDate =
    shouldPersistLinkedClass && resolvedClassSeedStartDateInput
      ? toDateOnly(resolvedClassSeedStartDateInput)
      : null;
  const normalizedClassSeedEndDate =
    shouldPersistLinkedClass && classSeedEndDate
      ? toDateOnly(classSeedEndDate)
      : null;

  if (shouldPersistLinkedClass && resolvedClassSeedTimezone && !isValidIanaTimeZone(resolvedClassSeedTimezone)) {
    throw Object.assign(new Error('class_seed.timezone phải là múi giờ IANA hợp lệ'), { statusCode: 400 });
  }

  if (
    normalizedClassSeedStartDate &&
    normalizedClassSeedEndDate &&
    normalizedClassSeedEndDate < normalizedClassSeedStartDate
  ) {
    throw Object.assign(new Error('class_seed.end_date phải lớn hơn hoặc bằng class_seed.start_date'), { statusCode: 400 });
  }
  const examTypeLegacy = await resolveLegacyExamTypeLabel(
    db,
    examCategoryId,
    examTypeId,
    trimNullable(rawInput?.exam_type)
  );

  const sourceSite = trimNullable(rawInput?.source_site) || 'edu';
  const lastEventUuid = trimNullable(rawInput?.last_event_uuid) || crypto.randomUUID();
  const customFieldPayload = rawInput?.custom_field_values ? JSON.stringify(rawInput.custom_field_values) : null;
  const overridePayload = rawInput?.override_values ? JSON.stringify(rawInput.override_values) : null;
  const normalizedZoomLinks = normalizeZoomLinkPair(rawInput, shouldPersistZoom);
  const hasExplicitTemplateField = Object.prototype.hasOwnProperty.call(rawInput ?? {}, 'template_id');
  const explicitTemplateId = hasExplicitTemplateField
    ? parseOptionalInt(rawInput?.template_id, 'template_id')
    : undefined;
  const resolvedTemplateId = hasExplicitTemplateField
    ? explicitTemplateId
    : await resolveAutoExamTemplateId(db, {
        organizerUuid: programContext?.organizerUuid ?? organizerUuid,
        programUuid: programContext?.programUuid ?? programUuid,
        programContext,
      });

  return {
    class_id: classId,
    exam_name: examName,
    exam_date: formattedDate,
    duration_minutes: duration,
    location: trimNullable(rawInput?.location),
    notes: trimNullable(rawInput?.notes),
    template_id: resolvedTemplateId ?? null,
    zoom_link: normalizedZoomLinks.zoom_link,
    zoom_link_backup: normalizedZoomLinks.zoom_link_backup,
    zoom_link_backup_2: normalizedZoomLinks.zoom_link_backup_2,
    zoom_link_backup_3: normalizedZoomLinks.zoom_link_backup_3,
    zoom_meeting_id: normalizedZoomLinks.zoom_meeting_id,
    zoom_passcode: normalizedZoomLinks.zoom_passcode,
    zoom_meeting_id_backup: normalizedZoomLinks.zoom_meeting_id_backup,
    zoom_passcode_backup: normalizedZoomLinks.zoom_passcode_backup,
    exam_type: examTypeLegacy,
    exam_level: examLevel,
    exam_category_id: examCategoryId,
    exam_type_id: examTypeId,
    organizer_uuid: programContext?.organizerUuid ?? organizerUuid,
    program_uuid: programContext?.programUuid ?? programUuid,
    level_uuid: programContext?.levelUuid ?? levelUuid,
    custom_field_payload: customFieldPayload,
    override_payload: overridePayload,
    source_site: sourceSite,
    last_event_uuid: lastEventUuid,
    class_seed_name: resolvedClassSeedName,
    class_seed_description: resolvedClassSeedDescription,
    class_seed_schedule_rule: normalizedClassSeedScheduleRule,
    class_seed_schedule_time: normalizedClassSeedScheduleTime,
    class_seed_timezone: resolvedClassSeedTimezone,
    class_seed_start_date: normalizedClassSeedStartDate,
    class_seed_end_date: normalizedClassSeedEndDate,
    class_seed_teacher_name: resolvedClassSeedTeacherName,
    class_seed_max_students: shouldPersistLinkedClass ? classSeedMaxStudents : null,
  };
}

examSchedules.post('/resync-classes', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền resync linked classes');
    if (denied) return denied;

    const result = await resyncAllLinkedOnlineClasses(c.env.DB, c.env, user.id);

    createActivityLog(
      c.env.DB,
      user.id,
      'resync_exam_schedule_classes',
      'online_classes',
      null,
      'Resynced linked classes from exam schedules',
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch((err) => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Đã resync linked classes từ exam schedules',
      data: result,
    });
  } catch (error: any) {
    return errorResponse('Lỗi resync linked classes: ' + error.message, error.statusCode || 500);
  }
});

// ========================================
// GET /exam-schedules/my-exams - Get student's exams
// ========================================
examSchedules.get('/my-exams', async (c) => {
  try {
    const user = c.get('user') as any;

    // Check if user is student (type='student' set in students.js login)
    if (!user || user.type !== 'student') {
      /* Allow admin/teacher debugging? For now restrict. */
      return errorResponse('Chức năng danh cho sinh viên', 403);
    }

    const exams = await getStudentExams(c.env.DB, user.id);

    return jsonResponse({
      success: true,
      data: exams
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy dữ liệu: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/upcoming - Get upcoming exams
// ========================================
examSchedules.get('/upcoming', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') ?? '', 10) || 10;
    const exams = await getUpcomingExams(c.env.DB, limit);

    return jsonResponse({
      success: true,
      data: exams,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy lịch thi: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/trash - Get deleted exams (thùng rác)
// ========================================
examSchedules.get('/trash', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền xem thùng rác');
    if (denied) return denied;

    // Auto cleanup expired items first
    await cleanupOldDeletedExams(c.env.DB);

    const deletedExams = await getDeletedExamSchedules(c.env.DB);

    return jsonResponse({
      success: true,
      data: deletedExams,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy thùng rác: ' + error.message, 500);
  }
});


// ========================================
// GET /exam-schedules/class/:id - Get exams by class
// ========================================
examSchedules.get('/class/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const exams = await getExamSchedulesByClass(c.env.DB, parseInt(id));

    return jsonResponse({
      success: true,
      data: exams,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy lịch thi: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules - List all exam schedules (admin only)
// ========================================
examSchedules.get('/', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền xem tất cả lịch thi');
    if (denied) return denied;

    const limit = parseInt(c.req.query('limit') ?? '', 10) || 100;
    const offset = parseInt(c.req.query('offset') ?? '', 10) || 0;

    // Get all active exam schedules (not deleted)
    const exams = await c.env.DB.prepare(`
      SELECT
        e.*,
        org.name as organizer_name,
        org.code as organizer_code,
        p.name as program_name,
        p.code as program_code,
        p.delivery_mode,
        p.linked_class_enabled,
        p.redirect_url,
        p.visible_on_edu_public,
        p.visible_on_edu_admin,
        p.visible_on_exam_teacher,
        p.visible_on_exam_student,
        p.training_enabled,
        p.is_active as program_is_active,
        lvl.name as level_name,
        lvl.code as level_code,
        (
          SELECT COUNT(*)
          FROM exam_registrations er
          JOIN students s ON s.id = er.student_id
          WHERE er.exam_id = e.id
            AND er.status = 'pending'
            AND NOT (
              LOWER(COALESCE(s.ho_ten_full, '')) LIKE 'test hoc vien%'
              OR LOWER(COALESCE(s.cccd, '')) LIKE 'test%'
            )
        ) AS pending_count,
        (
          SELECT COUNT(*)
          FROM exam_registrations er
          JOIN students s ON s.id = er.student_id
          WHERE er.exam_id = e.id
            AND er.status IN ('approved', 'registered')
            AND NOT (
              LOWER(COALESCE(s.ho_ten_full, '')) LIKE 'test hoc vien%'
              OR LOWER(COALESCE(s.cccd, '')) LIKE 'test%'
            )
        ) AS approved_count
      FROM exam_schedules e
      LEFT JOIN program_organizers org ON org.uuid = e.organizer_uuid
      LEFT JOIN programs p ON p.uuid = e.program_uuid
      LEFT JOIN program_levels lvl ON lvl.uuid = e.level_uuid
      WHERE e.deleted_at IS NULL
      ORDER BY e.exam_date DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM exam_schedules WHERE deleted_at IS NULL
    `).first();

    return jsonResponse({
      success: true,
      data: exams.results || [],
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy danh sách lịch thi: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/conflicts - Admin: students with multiple active upcoming exam registrations
// ========================================
examSchedules.get('/conflicts', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền xem dữ liệu trùng');
    if (denied) return denied;

    const rows = await c.env.DB.prepare(`
      SELECT
        s.id AS student_id,
        s.ho_ten_full,
        s.cccd,
        er.exam_id,
        er.status AS registration_status,
        er.created_at AS registration_created_at,
        es.exam_name,
        es.exam_date,
        es.duration_minutes
      FROM exam_registrations er
      JOIN students s ON s.id = er.student_id
      LEFT JOIN exam_schedules es ON es.id = er.exam_id
      WHERE er.status IN ('pending','approved','registered')
        AND es.deleted_at IS NULL
        AND NOT (
          LOWER(COALESCE(s.ho_ten_full, '')) LIKE 'test hoc vien%'
          OR LOWER(COALESCE(s.cccd, '')) LIKE 'test%'
        )
      ORDER BY s.ho_ten_full ASC, datetime(er.created_at) DESC, er.id DESC
    `).all();

    const registrationsByStudent = new Map<string, any[]>();
    for (const row of (rows.results || [])) {
      const key = String((row as any).student_id);
      const current = registrationsByStudent.get(key) || [];
      current.push(row);
      registrationsByStudent.set(key, current);
    }

    const grouped = new Map();
    for (const studentRegistrations of registrationsByStudent.values()) {
      const conflictingRegistrations = studentRegistrations.filter((registration) =>
        isUpcomingExamRegistrationWindow(registration as any)
      );

      if (conflictingRegistrations.length <= 1) {
        continue;
      }

      const first = conflictingRegistrations[0] as any;
      grouped.set(String(first.student_id), {
        student_id: first.student_id,
        ho_ten_full: first.ho_ten_full,
        cccd: first.cccd,
        active_registrations: conflictingRegistrations.map((registration: any) => ({
          exam_id: registration.exam_id,
          exam_name: registration.exam_name,
          exam_date: registration.exam_date,
          registration_status: registration.registration_status,
          registration_created_at: registration.registration_created_at,
        })),
      });
    }

    return jsonResponse({
      success: true,
      data: Array.from(grouped.values())
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy dữ liệu trùng: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/student/:studentId/registrations - Admin: student's exam registration history
// ========================================
examSchedules.get('/student/:studentId/registrations', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền xem lịch sử đăng ký');
    if (denied) return denied;

    const studentId = parseInt(c.req.param('studentId'));
    if (Number.isNaN(studentId)) {
      return errorResponse('studentId không hợp lệ', 400);
    }

    const rows = await c.env.DB.prepare(`
      SELECT
        er.id AS registration_id,
        er.exam_id,
        er.status AS registration_status,
        er.created_at AS registration_created_at,
        es.exam_name,
        es.exam_date,
        es.class_id,
        c.ten_lop AS class_name
      FROM exam_registrations er
      LEFT JOIN exam_schedules es ON es.id = er.exam_id
      LEFT JOIN classes c ON c.id = es.class_id
      WHERE er.student_id = ?
      ORDER BY datetime(er.created_at) DESC, er.id DESC
    `).bind(studentId).all();

    return jsonResponse({
      success: true,
      data: rows.results || [],
      count: (rows.results || []).length,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy lịch sử đăng ký: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules - Create exam schedule
// ========================================
examSchedules.post('/', async (c) => {
  try {
    const user = c.get('user') as any;

    // Debug logging
    console.log('POST /exam-schedules - User from context:', user);

    if (!user) {
      console.error('No user in context - middleware may have failed');
      return errorResponse('Chưa đăng nhập hoặc token không hợp lệ', 401);
    }
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền tạo lịch thi');
    if (denied) return denied;

    const payload = await normalizeExamSchedulePayload(c.env.DB, await c.req.json());

    const result = await createExamSchedule(
      c.env.DB,
      payload.class_id,
      payload.exam_name,
      payload.exam_date,
      payload.duration_minutes,
      payload.location,
      payload.notes,
      payload.template_id,
      payload
    );

    const scheduleId = Number(result.meta.last_row_id);
    await syncLinkedOnlineClassForExamSchedule(c.env.DB, c.env, scheduleId, user.id);
    await syncApprovedExamRegistrationsToOnlineClass(c.env.DB, scheduleId);

    // Log activity (fire-and-forget for performance)
    createActivityLog(
      c.env.DB,
      user.id,
      'create_exam_schedule',
      'exam_schedules',
      scheduleId,
      `Created exam schedule: ${payload.exam_name}`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Tạo lịch thi thành công',
      data: {
        id: scheduleId,
      },
    }, 201);
  } catch (error: any) {
    // Better error handling
    console.error('Error creating exam schedule:', error);

    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return errorResponse('Lớp học không tồn tại hoặc đã bị xóa', 400);
    }

    // Check for other SQL errors
    if (error.message && error.message.includes('SQLITE')) {
      return errorResponse('Lỗi database: ' + error.message, 500);
    }

    return errorResponse('Lỗi tạo lịch thi: ' + error.message, error.statusCode || 500);
  }
});

// ========================================
// PUT /exam-schedules/:id - Update exam schedule
// ========================================
examSchedules.put('/:id', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền cập nhật lịch thi');
    if (denied) return denied;

    const { id } = c.req.param();
    const examId = parseInt(id);
    const updateData = await normalizeExamSchedulePayload(c.env.DB, await c.req.json());

    await updateExamSchedule(c.env.DB, examId, updateData);
    await syncLinkedOnlineClassForExamSchedule(c.env.DB, c.env, examId, user.id);
    await syncApprovedExamRegistrationsToOnlineClass(c.env.DB, examId);

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'update_exam_schedule',
      'exam_schedules',
      examId,
      `Updated exam schedule`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Cập nhật lịch thi thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi cập nhật lịch thi: ' + error.message, error.statusCode || 500);
  }
});

// ========================================
// DELETE /exam-schedules/:id - Delete exam schedule
// ========================================
examSchedules.delete('/:id', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền xóa lịch thi');
    if (denied) return denied;

    const { id } = c.req.param();
    const examId = parseInt(id);

    await deleteLinkedOnlineClassForExamSchedule(c.env.DB, c.env, examId);
    await deleteExamSchedule(c.env.DB, examId);

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'delete_exam_schedule',
      'exam_schedules',
      examId,
      `Moved exam schedule to trash`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Đã chuyển vào thùng rác. Có thể khôi phục trong 7 ngày.',
    });
  } catch (error: any) {
    return errorResponse('Lỗi xóa lịch thi: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/restore - Restore from trash
// ========================================
examSchedules.post('/:id/restore', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền khôi phục lịch thi');
    if (denied) return denied;

    const { id } = c.req.param();
    const examId = parseInt(id);

    const result = await restoreExamSchedule(c.env.DB, examId);

    if (result.meta?.changes === 0) {
      return errorResponse('Không tìm thấy lịch thi trong thùng rác', 404);
    }

    await syncLinkedOnlineClassForExamSchedule(c.env.DB, c.env, examId, user.id);
    await syncApprovedExamRegistrationsToOnlineClass(c.env.DB, examId);

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'restore_exam_schedule',
      'exam_schedules',
      examId,
      `Restored exam schedule from trash`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Khôi phục lịch thi thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi khôi phục lịch thi: ' + error.message, 500);
  }
});

// ========================================
// DELETE /exam-schedules/:id/permanent - Permanently delete
// ========================================
examSchedules.delete('/:id/permanent', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Chỉ admin mới có quyền xóa vĩnh viễn');
    if (denied) return denied;

    const { id } = c.req.param();
    const examId = parseInt(id);

    await deleteLinkedOnlineClassForExamSchedule(c.env.DB, c.env, examId);
    const result = await permanentlyDeleteExamSchedule(c.env.DB, examId);

    if (result.meta?.changes === 0) {
      return errorResponse('Không tìm thấy lịch thi trong thùng rác', 404);
    }

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'permanent_delete_exam_schedule',
      'exam_schedules',
      examId,
      `Permanently deleted exam schedule`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Đã xóa vĩnh viễn lịch thi',
    });
  } catch (error: any) {
    return errorResponse('Lỗi xóa vĩnh viễn: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/register - Student registers for exam
// ========================================
examSchedules.post('/:id/register', async (c) => {
  try {
    const user = c.get('user') as any;
    if (!user || user.type !== 'student') {
      return errorResponse('Chỉ sinh viên mới có thể đăng ký thi', 403);
    }
    const { id } = c.req.param();

    // Lấy thông tin kỳ thi để kiểm tra
    const exam = await c.env.DB.prepare(`
      SELECT exam_date, exam_name FROM exam_schedules WHERE id = ? AND deleted_at IS NULL
    `).bind(parseInt(id)).first();

    if (!exam) {
      return errorResponse('Không tìm thấy kỳ thi', 404);
    }



    try {
      await registerStudentForExam(c.env.DB, parseInt(id), user.id);
    } catch (e: any) {
      if (e?.code === 'TEST_STUDENT_NOT_ALLOWED') {
        return jsonResponse({
          success: false,
          code: e.code,
          message: 'Không cho phép thêm hồ sơ test vào danh sách thi.',
        }, 400);
      }

      if (e?.code === 'STUDENT_ALREADY_HAS_EXAM_AT_SAME_TIME') {
        return jsonResponse({
          success: false,
          code: e.code,
          message: 'Bạn đã có một kỳ thi khác trùng thời gian. Vui lòng hủy đăng ký cũ trước khi đăng ký kỳ thi này.',
          details: e.details || {}
        }, 400);
      }

      if (e?.code === 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION') {
        const bucketLabel = e?.details?.registration_bucket_label || 'nhóm kỳ thi này';
        return jsonResponse({
          success: false,
          code: e.code,
          message: `Bạn đã có một đăng ký ${bucketLabel} đang hoạt động. Mỗi học viên chỉ được giữ tối đa 1 lịch tiếng Anh (VSTEP/VEPT) và 1 lịch tin học (PTIT...).`,
          details: e.details || {}
        }, 400);
      }

      throw e;
    }

    return jsonResponse({ success: true, message: 'Đăng ký thành công' });
  } catch (error: any) {
    return errorResponse('Lỗi đăng ký: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/cancel - Student cancels registration
// ========================================
examSchedules.post('/:id/cancel', async (c) => {
  try {
    const user = c.get('user') as any;
    if (!user || user.type !== 'student') {
      return errorResponse('Chỉ sinh viên mới có thể hủy đăng ký', 403);
    }
    const { id } = c.req.param();
    await cancelExamRegistration(c.env.DB, parseInt(id), user.id);
    await revokeExamRegistrationFromOnlineClass(c.env.DB, parseInt(id), user.id);

    return jsonResponse({ success: true, message: 'Hủy đăng ký thành công' });
  } catch (error: any) {
    return errorResponse('Lỗi hủy đăng ký: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/:id/students - Admin gets registered students
// ========================================
examSchedules.get('/:id/students', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id } = c.req.param();
    const examId = parseInt(id);
    const withZoomCheckin = c.req.query('with_zoom_checkin') === '1';

    const students = await getExamRegistrations(c.env.DB, examId);
    const enrichedStudents = await Promise.all(
      students.map((student: any) => enrichStudentWithImages(c, student))
    );

    // Nếu yêu cầu thêm thông tin zoom check-in (?with_zoom_checkin=1)
    if (withZoomCheckin) {
      const zoomMap = await getZoomCheckinsForExam(c.env.DB, examId);
      const studentsWithZoom = enrichedStudents.map((student: any) => {
        const zoomData = zoomMap.get(Number(student.student_id));
        return {
          ...student,
          zoom_checked_in_at: zoomData?.checked_in_at ?? null,
          zoom_join_source: zoomData?.zoom_join_source ?? null,
        };
      });
      return jsonResponse({ success: true, data: studentsWithZoom });
    }

    return jsonResponse({ success: true, data: enrichedStudents });
  } catch (error: any) {
    return errorResponse('Lỗi lấy danh sách thí sinh: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/:id/learning-attendance
// Tab "Điểm danh học tập": sessions + attendance của online_class gắn với kỳ thi
// ========================================
examSchedules.get('/:id/learning-attendance', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id } = c.req.param();
    const examId = parseInt(id);

    // 1. Tìm online_class gắn với exam này
    const onlineClass = await c.env.DB.prepare(`
      SELECT id, class_name FROM online_classes
      WHERE source_exam_schedule_id = ?
        AND COALESCE(status, 'active') != 'cancelled'
      LIMIT 1
    `).bind(examId).first<{ id: number; class_name: string }>();

    // 2. Lấy danh sách sessions (tất cả, kể cả khi 0 sessions)
    const sessionsResult = onlineClass
      ? await c.env.DB.prepare(`
          SELECT id, session_date, start_time, end_time, note
          FROM online_class_sessions
          WHERE online_class_id = ?
          ORDER BY session_date ASC, start_time ASC
        `).bind(onlineClass.id).all()
      : { results: [] };
    const sessions = (sessionsResult.results || []) as any[];

    // 3. Lấy danh sách thí sinh đã duyệt
    const students = await getExamRegistrations(c.env.DB, examId);

    if (sessions.length === 0) {
      // Không có session nào — chỉ trả về học viên + zoom checkin summary
      const zoomMap = await getZoomCheckinsForExam(c.env.DB, examId);
      const rows = students.map((s: any) => {
        const zoom = zoomMap.get(Number(s.student_id));
        return {
          student_id: s.student_id,
          ho_ten_full: s.ho_ten_full,
          cccd: s.cccd,
          zoom_checked_in_at: zoom?.checked_in_at ?? null,
          zoom_join_source: zoom?.zoom_join_source ?? null,
          sessions: [],
        };
      });
      return jsonResponse({
        success: true,
        data: {
          online_class_id: onlineClass?.id ?? null,
          class_name: onlineClass?.class_name ?? null,
          sessions: [],
          students: rows,
        },
      });
    }

    const sessionIds = sessions.map((s: any) => s.id);

    // 4. Lấy tất cả attendance records cho các sessions này
    const placeholders = sessionIds.map(() => '?').join(',');
    const attResult = await c.env.DB.prepare(`
      SELECT
        oca.student_id,
        oca.session_id,
        oca.status,
        oca.checked_in_at,
        oca.zoom_join_source,
        oca.note
      FROM online_class_attendance oca
      WHERE oca.session_id IN (${placeholders})
    `).bind(...sessionIds).all();
    const attRows = (attResult.results || []) as any[];

    // Map: student_id → session_id → record
    const attMap = new Map<string, any>();
    for (const row of attRows) {
      attMap.set(`${row.student_id}_${row.session_id}`, row);
    }

    // 5. Tổng hợp theo học viên
    const studentRows = students.map((s: any) => {
      const sid = Number(s.student_id);
      const sessionAttendance = sessions.map((sess: any) => {
        const rec = attMap.get(`${sid}_${sess.id}`);
        return {
          session_id: sess.id,
          session_date: sess.session_date,
          start_time: sess.start_time,
          end_time: sess.end_time,
          status: rec?.status ?? null,            // null = chưa có record
          checked_in_at: rec?.checked_in_at ?? null,
          zoom_join_source: rec?.zoom_join_source ?? null,
        };
      });

      const presentCount = sessionAttendance.filter((a) => a.status === 'present').length;
      const absentCount = sessionAttendance.filter((a) => a.status === 'absent').length;
      const lateCount = sessionAttendance.filter((a) => a.status === 'late').length;
      const zoomCount = sessionAttendance.filter((a) => a.zoom_join_source === 'zoom_click' || a.status === 'present').length;

      return {
        student_id: s.student_id,
        ho_ten_full: s.ho_ten_full,
        cccd: s.cccd,
        present_count: presentCount,
        absent_count: absentCount,
        late_count: lateCount,
        zoom_count: zoomCount,
        sessions: sessionAttendance,
      };
    });

    return jsonResponse({
      success: true,
      data: {
        online_class_id: onlineClass.id,
        class_name: onlineClass.class_name,
        sessions,
        students: studentRows,
      },
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy điểm danh học tập: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/students - Admin adds students to exam (Bulk)
// ========================================
examSchedules.post('/:id/students', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id } = c.req.param();
    const { student_ids, force } = await c.req.json();

    if (!student_ids || !Array.isArray(student_ids)) {
      return errorResponse('Danh sách student_ids không hợp lệ', 400);
    }

    // Process all registrations - Admin thêm = auto approved
    const results = [];
    for (const studentId of student_ids) {
      try {
        await registerStudentForExam(c.env.DB, parseInt(id), studentId, { adminId: user.id, force: !!force });
        await syncSingleExamRegistrationToOnlineClass(c.env.DB, parseInt(id), Number(studentId));
        results.push({ student_id: studentId, status: 'success' });
      } catch (err: any) {
        if (err?.code === 'TEST_STUDENT_NOT_ALLOWED') {
          results.push({ student_id: studentId, status: 'blocked', code: err.code });
        } else if (err?.code === 'STUDENT_ALREADY_HAS_EXAM_AT_SAME_TIME') {
          results.push({ student_id: studentId, status: 'blocked', code: err.code, details: err.details || {} });
        } else if (err?.code === 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION') {
          results.push({ student_id: studentId, status: 'blocked', code: err.code, details: err.details || {} });
        } else {
          results.push({ student_id: studentId, status: 'error', error: err.message });
        }
      }
    }

    return jsonResponse({
      success: true,
      message: `Đã xử lý ${results.length} yêu cầu`,
      results
    });
  } catch (error: any) {
    return errorResponse('Lỗi thêm thí sinh: ' + error.message, 500);
  }
});

// ========================================
// DELETE /exam-schedules/:id/students/:studentId - Admin removes student
// ========================================
examSchedules.delete('/:id/students/:studentId', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id, studentId } = c.req.param();
    await cancelExamRegistration(c.env.DB, parseInt(id), parseInt(studentId));
    await revokeExamRegistrationFromOnlineClass(c.env.DB, parseInt(id), parseInt(studentId));

    return jsonResponse({ success: true, message: 'Đã xóa thí sinh khỏi kỳ thi' });
  } catch (error: any) {
    return errorResponse('Lỗi xóa thí sinh: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/:id/pending - Get pending registrations
// ========================================
examSchedules.get('/:id/pending', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id } = c.req.param();
    const students = await getPendingExamRegistrations(c.env.DB, parseInt(id));
    const enrichedStudents = await Promise.all(
      students.map((student: any) => enrichStudentWithImages(c, student))
    );

    return jsonResponse({ success: true, data: enrichedStudents });
  } catch (error: any) {
    return errorResponse('Lỗi lấy danh sách chờ duyệt: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/approve/:studentId - Approve 1 student
// ========================================
examSchedules.post('/:id/approve/:studentId', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id, studentId } = c.req.param();
    await approveExamRegistration(c.env.DB, parseInt(id), parseInt(studentId), user.id);
    await syncSingleExamRegistrationToOnlineClass(c.env.DB, parseInt(id), parseInt(studentId));

    const examSchedule = await c.env.DB.prepare(`
      SELECT exam_test_id FROM exam_schedules WHERE id = ?
    `).bind(parseInt(id)).first<{ exam_test_id?: number | null }>();

    if (examSchedule?.exam_test_id) {
      const registration = await checkRegistrationStatus(c.env.DB, parseInt(studentId), examSchedule.exam_test_id);
      if (registration && registration.status === 'pending') {
        await approveExamTestRegistration(c.env.DB, registration.id, user.id);
      } else if (!registration) {
        try {
          await registerForExamTest(c.env.DB, parseInt(studentId), examSchedule.exam_test_id);
          const newReg = await checkRegistrationStatus(c.env.DB, parseInt(studentId), examSchedule.exam_test_id);
          if (newReg) {
            await approveExamTestRegistration(c.env.DB, newReg.id, user.id);
          }
        } catch (err: any) {
          console.error('Error auto-registering for exam test:', err);
        }
      }
    }

    return jsonResponse({ success: true, message: 'Đã duyệt thí sinh' });
  } catch (error: any) {
    return errorResponse('Lỗi duyệt thí sinh: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/approve-all - Approve all pending
// ========================================
examSchedules.post('/:id/approve-all', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id } = c.req.param();
    const result = await approveAllExamRegistrations(c.env.DB, parseInt(id), user.id);
    await syncApprovedExamRegistrationsToOnlineClass(c.env.DB, parseInt(id));

    const examSchedule = await c.env.DB.prepare(`
      SELECT exam_test_id FROM exam_schedules WHERE id = ?
    `).bind(parseInt(id)).first<{ exam_test_id?: number | null }>();

    if (examSchedule?.exam_test_id) {
      const approvedRegistrations = await getExamRegistrations(c.env.DB, parseInt(id));
      for (const reg of approvedRegistrations as any[]) {
        if (reg.registration_status === 'approved') {
          const testReg = await checkRegistrationStatus(c.env.DB, reg.student_id, examSchedule.exam_test_id);
          if (testReg && testReg.status === 'pending') {
            await approveExamTestRegistration(c.env.DB, testReg.id, user.id);
          } else if (!testReg) {
            try {
              await registerForExamTest(c.env.DB, reg.student_id, examSchedule.exam_test_id);
              const newReg = await checkRegistrationStatus(c.env.DB, reg.student_id, examSchedule.exam_test_id);
              if (newReg) {
                await approveExamTestRegistration(c.env.DB, newReg.id, user.id);
              }
            } catch (err: any) {
              console.error(`Error auto-registering student ${reg.student_id} for exam test:`, err);
            }
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      message: `Đã duyệt ${result.meta?.changes || 0} thí sinh`
    });
  } catch (error: any) {
    return errorResponse('Lỗi duyệt tất cả: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/reject/:studentId - Reject 1 student
// ========================================
examSchedules.post('/:id/reject/:studentId', async (c) => {
  try {
    const user = c.get('user') as any;
    const denied = requireExamAdmin(user, 'Không có quyền truy cập');
    if (denied) return denied;

    const { id, studentId } = c.req.param();
    await rejectExamRegistration(c.env.DB, parseInt(id), parseInt(studentId), user.id);
    await revokeExamRegistrationFromOnlineClass(c.env.DB, parseInt(id), parseInt(studentId));

    return jsonResponse({ success: true, message: 'Đã từ chối thí sinh' });
  } catch (error: any) {
    return errorResponse('Lỗi từ chối thí sinh: ' + error.message, 500);
  }
});

export default examSchedules;
