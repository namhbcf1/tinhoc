import type { JWTPayload } from '../../types/env.js';

export const PROGRAM_DELIVERY_MODES = ['internal_training', 'external_redirect'] as const;
export type ProgramDeliveryMode = (typeof PROGRAM_DELIVERY_MODES)[number];

export const PROGRAM_ASSESSMENT_MODES = [
  'none',
  'official_exam',
  'practice_test',
  'manual_assessment',
  'mixed',
] as const;
export type ProgramAssessmentMode = (typeof PROGRAM_ASSESSMENT_MODES)[number];

export const PROGRAM_SCHEDULE_MODELS = ['session_based', 'weekly_template'] as const;
export type ProgramScheduleModel = (typeof PROGRAM_SCHEDULE_MODELS)[number];

export const FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
  'multi_select',
  'toggle',
  'link',
  'file',
  'rich_text',
  'object',
  'repeatable_group',
  'computed',
] as const;

export interface ProgramOrganizerRow {
  id: number;
  uuid: string;
  name: string;
  code: string;
  description: string | null;
  is_active: number;
  updated_by: number | null;
  source_site: string;
  last_event_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramRow {
  id: number;
  uuid: string;
  organizer_uuid: string;
  name: string;
  code: string;
  description: string | null;
  delivery_mode: ProgramDeliveryMode;
  training_enabled: number;
  linked_class_enabled: number;
  visible_on_edu_public: number;
  visible_on_edu_admin: number;
  visible_on_exam_teacher: number;
  visible_on_exam_student: number;
  redirect_url: string | null;
  is_active: number;
  legacy_exam_category_id: number | null;
  legacy_exam_type_id: number | null;
  assessment_mode: ProgramAssessmentMode;
  certificate_enabled: number;
  schedule_model: ProgramScheduleModel;
  updated_by: number | null;
  source_site: string;
  last_event_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramLevelRow {
  id: number;
  uuid: string;
  program_uuid: string;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
  is_active: number;
  updated_by: number | null;
  source_site: string;
  last_event_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldDefinitionRow {
  id: number;
  uuid: string;
  field_key: string;
  label: string;
  description: string | null;
  field_type: string;
  target_entity_type: string;
  owner_entity_type: string | null;
  owner_entity_uuid: string | null;
  placeholder: string | null;
  help_text: string | null;
  config_json: string | null;
  searchable: number;
  filterable: number;
  exportable: number;
  reportable: number;
  visible_on_edu_public: number;
  visible_on_edu_admin: number;
  visible_on_exam_teacher: number;
  visible_on_exam_student: number;
  is_active: number;
  sort_order: number;
  updated_by: number | null;
  source_site: string;
  last_event_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldOptionRow {
  id: number;
  uuid: string;
  field_definition_uuid: string;
  label: string;
  value: string;
  color: string | null;
  sort_order: number;
  is_active: number;
  updated_by: number | null;
  source_site: string;
  last_event_uuid: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramContextRow {
  organizerUuid: string | null;
  organizerCode: string | null;
  organizerName: string | null;
  programUuid: string | null;
  programCode: string | null;
  programName: string | null;
  levelUuid: string | null;
  levelCode: string | null;
  levelName: string | null;
  deliveryMode: ProgramDeliveryMode | null;
  linkedClassEnabled: boolean;
  trainingEnabled: boolean;
  redirectUrl: string | null;
  visibleOnEduPublic: boolean;
  visibleOnEduAdmin: boolean;
  visibleOnExamTeacher: boolean;
  visibleOnExamStudent: boolean;
  legacyExamCategoryId: number | null;
  legacyExamTypeId: number | null;
  assessmentMode: ProgramAssessmentMode | null;
  certificateEnabled: boolean;
  scheduleModel: ProgramScheduleModel | null;
  hasLevels: boolean;
}

type SiteName = 'edu' | 'exam';

function nowIso() {
  return new Date().toISOString();
}

function createUuid() {
  return crypto.randomUUID();
}

function normalizeString(value: unknown) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCode(value: unknown) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toUpperCase().replace(/\s+/g, '_') : null;
}

function parseBooleanFlag(value: unknown, fallback = false) {
  if (value == null || value === '') {
    return fallback ? 1 : 0;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized) ? 1 : 0;
}

function parseOptionalInteger(value: unknown) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseEnumValue<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number],
  errorLabel: string
): T[number] {
  if (value == null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!allowedValues.includes(normalized as T[number])) {
    throw new Error(`Invalid ${errorLabel}`);
  }

  return normalized as T[number];
}

function supportsLegacyExamMapping(assessmentMode: ProgramAssessmentMode) {
  return ['official_exam', 'practice_test', 'mixed'].includes(assessmentMode);
}

function resolveActorId(actor: JWTPayload) {
  return parseOptionalInteger(actor.id) ?? parseOptionalInteger(actor.userId);
}

function parseJsonValue(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  return JSON.stringify(value);
}

function boolToFlag(value: number | boolean | null | undefined) {
  return Boolean(Number(value || 0));
}

function assertEduWritable(row: { source_site?: string | null }, entityLabel: string) {
  if (row.source_site !== 'edu') {
    throw new Error(`${entityLabel} is read-only`);
  }
}

function mapOrganizerRow(row: ProgramOrganizerRow) {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    code: row.code,
    description: row.description,
    isActive: boolToFlag(row.is_active),
    updatedBy: row.updated_by,
    sourceSite: row.source_site,
    lastEventUuid: row.last_event_uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProgramRow(
  row: ProgramRow,
  organizer?: ProgramOrganizerRow | null,
  options: { hasLevels?: number | boolean | null } = {}
) {
  return {
    id: row.id,
    uuid: row.uuid,
    organizerUuid: row.organizer_uuid,
    organizerCode: organizer?.code || null,
    organizerName: organizer?.name || null,
    name: row.name,
    code: row.code,
    description: row.description,
    deliveryMode: row.delivery_mode,
    trainingEnabled: boolToFlag(row.training_enabled),
    linkedClassEnabled: boolToFlag(row.linked_class_enabled),
    visibleOnEduPublic: boolToFlag(row.visible_on_edu_public),
    visibleOnEduAdmin: boolToFlag(row.visible_on_edu_admin),
    visibleOnExamTeacher: boolToFlag(row.visible_on_exam_teacher),
    visibleOnExamStudent: boolToFlag(row.visible_on_exam_student),
    redirectUrl: row.redirect_url,
    isActive: boolToFlag(row.is_active),
    legacyExamCategoryId: row.legacy_exam_category_id,
    legacyExamTypeId: row.legacy_exam_type_id,
    assessmentMode: row.assessment_mode,
    certificateEnabled: boolToFlag(row.certificate_enabled),
    scheduleModel: row.schedule_model,
    hasLevels: boolToFlag(options.hasLevels),
    updatedBy: row.updated_by,
    sourceSite: row.source_site,
    lastEventUuid: row.last_event_uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLevelRow(row: ProgramLevelRow, program?: ProgramRow | null) {
  return {
    id: row.id,
    uuid: row.uuid,
    programUuid: row.program_uuid,
    programCode: program?.code || null,
    programName: program?.name || null,
    name: row.name,
    code: row.code,
    description: row.description,
    sortOrder: Number(row.sort_order || 0),
    isActive: boolToFlag(row.is_active),
    updatedBy: row.updated_by,
    sourceSite: row.source_site,
    lastEventUuid: row.last_event_uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFieldDefinitionRow(row: FieldDefinitionRow) {
  return {
    id: row.id,
    uuid: row.uuid,
    fieldKey: row.field_key,
    label: row.label,
    description: row.description,
    fieldType: row.field_type,
    targetEntityType: row.target_entity_type,
    ownerEntityType: row.owner_entity_type,
    ownerEntityUuid: row.owner_entity_uuid,
    placeholder: row.placeholder,
    helpText: row.help_text,
    config: row.config_json ? JSON.parse(row.config_json) : null,
    searchable: boolToFlag(row.searchable),
    filterable: boolToFlag(row.filterable),
    exportable: boolToFlag(row.exportable),
    reportable: boolToFlag(row.reportable),
    visibleOnEduPublic: boolToFlag(row.visible_on_edu_public),
    visibleOnEduAdmin: boolToFlag(row.visible_on_edu_admin),
    visibleOnExamTeacher: boolToFlag(row.visible_on_exam_teacher),
    visibleOnExamStudent: boolToFlag(row.visible_on_exam_student),
    isActive: boolToFlag(row.is_active),
    sortOrder: Number(row.sort_order || 0),
    updatedBy: row.updated_by,
    sourceSite: row.source_site,
    lastEventUuid: row.last_event_uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFieldOptionRow(row: FieldOptionRow) {
  return {
    id: row.id,
    uuid: row.uuid,
    fieldDefinitionUuid: row.field_definition_uuid,
    label: row.label,
    value: row.value,
    color: row.color,
    sortOrder: Number(row.sort_order || 0),
    isActive: boolToFlag(row.is_active),
    updatedBy: row.updated_by,
    sourceSite: row.source_site,
    lastEventUuid: row.last_event_uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function resolveLegacyExamCategoryId(db: D1Database, code: string, name: string) {
  try {
    const row = await db
      .prepare(
        `
          SELECT id
          FROM exam_categories
          WHERE UPPER(TRIM(code)) = ?
             OR UPPER(TRIM(name)) = ?
          ORDER BY id ASC
          LIMIT 1
        `
      )
      .bind(code, name.toUpperCase())
      .first<{ id?: number }>();

    return row?.id ?? null;
  } catch {
    return null;
  }
}

async function resolveLegacyExamTypeId(db: D1Database, code: string, name: string) {
  try {
    const row = await db
      .prepare(
        `
          SELECT id
          FROM exam_types
          WHERE UPPER(TRIM(code)) = ?
             OR UPPER(TRIM(name)) = ?
          ORDER BY id ASC
          LIMIT 1
        `
      )
      .bind(code, name.toUpperCase())
      .first<{ id?: number }>();

    return row?.id ?? null;
  } catch {
    return null;
  }
}

const PROGRAM_PLATFORM_SEED = {
  organizers: [
    {
      uuid: '10000000-0000-4000-8000-000000000001',
      code: 'EDUGLOBAL',
      name: 'EDUGLOBAL',
    },
    {
      uuid: '10000000-0000-4000-8000-000000000002',
      code: 'HVKHQS',
      name: 'HVKHQS',
    },
    {
      uuid: '10000000-0000-4000-8000-000000000003',
      code: 'PTIT',
      name: 'Học viện PTIT',
    },
  ],
  programs: [
    { uuid: '20000000-0000-4000-8000-000000000001', organizerCode: 'EDUGLOBAL', code: 'VSTEP', name: 'VSTEP', deliveryMode: 'internal_training' as const, trainingEnabled: 1, linkedClassEnabled: 1, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 1, visibleOnExamStudent: 1, redirectUrl: null, assessmentMode: 'official_exam' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
    { uuid: '20000000-0000-4000-8000-000000000002', organizerCode: 'EDUGLOBAL', code: 'VEPT', name: 'VEPT', deliveryMode: 'external_redirect' as const, trainingEnabled: 0, linkedClassEnabled: 0, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 0, visibleOnExamStudent: 0, redirectUrl: '/vept', assessmentMode: 'official_exam' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
    { uuid: '20000000-0000-4000-8000-000000000003', organizerCode: 'EDUGLOBAL', code: 'TIN_HOC', name: 'Tin học', deliveryMode: 'internal_training' as const, trainingEnabled: 1, linkedClassEnabled: 1, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 1, visibleOnExamStudent: 1, redirectUrl: null, assessmentMode: 'mixed' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
    { uuid: '20000000-0000-4000-8000-000000000004', organizerCode: 'HVKHQS', code: 'VSTEP', name: 'VSTEP', deliveryMode: 'internal_training' as const, trainingEnabled: 1, linkedClassEnabled: 1, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 1, visibleOnExamStudent: 1, redirectUrl: null, assessmentMode: 'official_exam' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
    { uuid: '20000000-0000-4000-8000-000000000005', organizerCode: 'HVKHQS', code: 'VEPT', name: 'VEPT', deliveryMode: 'external_redirect' as const, trainingEnabled: 0, linkedClassEnabled: 0, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 0, visibleOnExamStudent: 0, redirectUrl: '/vept', assessmentMode: 'official_exam' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
    { uuid: '20000000-0000-4000-8000-000000000006', organizerCode: 'HVKHQS', code: 'TIN_HOC', name: 'Tin học', deliveryMode: 'internal_training' as const, trainingEnabled: 1, linkedClassEnabled: 1, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 1, visibleOnExamStudent: 1, redirectUrl: null, assessmentMode: 'mixed' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
    { uuid: '20000000-0000-4000-8000-000000000007', organizerCode: 'PTIT', code: 'TIN_HOC', name: 'Tin học', deliveryMode: 'internal_training' as const, trainingEnabled: 1, linkedClassEnabled: 1, visibleOnEduPublic: 1, visibleOnEduAdmin: 1, visibleOnExamTeacher: 1, visibleOnExamStudent: 1, redirectUrl: null, assessmentMode: 'mixed' as const, certificateEnabled: 1, scheduleModel: 'session_based' as const },
  ],
  levels: [
    { uuid: '30000000-0000-4000-8000-000000000001', organizerCode: 'EDUGLOBAL', programCode: 'VSTEP', code: 'A2', name: 'A2', sortOrder: 1 },
    { uuid: '30000000-0000-4000-8000-000000000002', organizerCode: 'EDUGLOBAL', programCode: 'VSTEP', code: 'B1', name: 'B1', sortOrder: 2 },
    { uuid: '30000000-0000-4000-8000-000000000003', organizerCode: 'EDUGLOBAL', programCode: 'VSTEP', code: 'B2', name: 'B2', sortOrder: 3 },
    { uuid: '30000000-0000-4000-8000-000000000004', organizerCode: 'EDUGLOBAL', programCode: 'VSTEP', code: 'C1', name: 'C1', sortOrder: 4 },
    { uuid: '30000000-0000-4000-8000-000000000005', organizerCode: 'EDUGLOBAL', programCode: 'VEPT', code: 'A2', name: 'A2', sortOrder: 1 },
    { uuid: '30000000-0000-4000-8000-000000000006', organizerCode: 'EDUGLOBAL', programCode: 'VEPT', code: 'B1', name: 'B1', sortOrder: 2 },
    { uuid: '30000000-0000-4000-8000-000000000007', organizerCode: 'EDUGLOBAL', programCode: 'VEPT', code: 'B2', name: 'B2', sortOrder: 3 },
    { uuid: '30000000-0000-4000-8000-000000000008', organizerCode: 'EDUGLOBAL', programCode: 'VEPT', code: 'C1', name: 'C1', sortOrder: 4 },
    { uuid: '30000000-0000-4000-8000-000000000009', organizerCode: 'HVKHQS', programCode: 'VSTEP', code: 'A2', name: 'A2', sortOrder: 1 },
    { uuid: '30000000-0000-4000-8000-000000000010', organizerCode: 'HVKHQS', programCode: 'VSTEP', code: 'B1', name: 'B1', sortOrder: 2 },
    { uuid: '30000000-0000-4000-8000-000000000011', organizerCode: 'HVKHQS', programCode: 'VSTEP', code: 'B2', name: 'B2', sortOrder: 3 },
    { uuid: '30000000-0000-4000-8000-000000000012', organizerCode: 'HVKHQS', programCode: 'VSTEP', code: 'C1', name: 'C1', sortOrder: 4 },
    { uuid: '30000000-0000-4000-8000-000000000013', organizerCode: 'HVKHQS', programCode: 'VEPT', code: 'A2', name: 'A2', sortOrder: 1 },
    { uuid: '30000000-0000-4000-8000-000000000014', organizerCode: 'HVKHQS', programCode: 'VEPT', code: 'B1', name: 'B1', sortOrder: 2 },
    { uuid: '30000000-0000-4000-8000-000000000015', organizerCode: 'HVKHQS', programCode: 'VEPT', code: 'B2', name: 'B2', sortOrder: 3 },
    { uuid: '30000000-0000-4000-8000-000000000016', organizerCode: 'HVKHQS', programCode: 'VEPT', code: 'C1', name: 'C1', sortOrder: 4 },
    { uuid: '30000000-0000-4000-8000-000000000017', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MODUL1', name: 'PTIT Modul 1', sortOrder: 1 },
    { uuid: '30000000-0000-4000-8000-000000000018', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MODUL2', name: 'PTIT Modul 2', sortOrder: 2 },
    { uuid: '30000000-0000-4000-8000-000000000019', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MODUL3', name: 'PTIT Modul 3', sortOrder: 3 },
    { uuid: '30000000-0000-4000-8000-000000000020', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MODUL4', name: 'PTIT Modul 4', sortOrder: 4 },
    { uuid: '30000000-0000-4000-8000-000000000021', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MODUL5', name: 'PTIT Modul 5', sortOrder: 5 },
    { uuid: '30000000-0000-4000-8000-000000000022', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MODUL6', name: 'PTIT Modul 6', sortOrder: 6 },
    { uuid: '30000000-0000-4000-8000-000000000023', organizerCode: 'PTIT', programCode: 'TIN_HOC', code: 'MOS', name: 'PTIT MOS', sortOrder: 7 },
  ],
};

export async function recordProgramPlatformSyncEvent(
  db: D1Database,
  input: {
    eventUuid?: string | null;
    entityType: string;
    entityUuid: string;
    action: string;
    sourceSite: SiteName;
    changedAt?: string;
    payload?: unknown;
  }
) {
  const eventUuid = normalizeString(input.eventUuid) || createUuid();
  const changedAt = normalizeString(input.changedAt) || nowIso();
  const payloadJson = input.payload == null ? null : JSON.stringify(input.payload);

  await db
    .prepare(
      `
        INSERT OR IGNORE INTO sync_events (
          event_uuid,
          entity_type,
          entity_uuid,
          action,
          source_site,
          changed_at,
          payload_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      eventUuid,
      input.entityType,
      input.entityUuid,
      input.action,
      input.sourceSite,
      changedAt,
      payloadJson
    )
    .run();

  return eventUuid;
}

export async function ensureSeedProgramPlatform(db: D1Database) {
  for (const organizer of PROGRAM_PLATFORM_SEED.organizers) {
    await db
      .prepare(
        `
          INSERT OR IGNORE INTO program_organizers (uuid, name, code, source_site)
          VALUES (?, ?, ?, 'edu')
        `
      )
      .bind(organizer.uuid, organizer.name, organizer.code)
      .run();
  }

  for (const program of PROGRAM_PLATFORM_SEED.programs) {
    const seedOrganizer = PROGRAM_PLATFORM_SEED.organizers.find((item) => item.code === program.organizerCode);
    if (!seedOrganizer) {
      continue;
    }

    const existingOrganizer = await db
      .prepare(`SELECT uuid FROM program_organizers WHERE code = ? AND source_site IN ('edu', 'system') LIMIT 1`)
      .bind(program.organizerCode)
      .first<{ uuid: string }>();
    const organizerUuid = existingOrganizer?.uuid || seedOrganizer.uuid;

    const legacyCategoryId = await resolveLegacyExamCategoryId(db, program.code, program.name);
    const legacyTypeId = await resolveLegacyExamTypeId(db, program.code, program.name);

    await db
      .prepare(
        `
          INSERT OR IGNORE INTO programs (
            uuid,
            organizer_uuid,
            name,
            code,
            delivery_mode,
            training_enabled,
            linked_class_enabled,
            visible_on_edu_public,
            visible_on_edu_admin,
            visible_on_exam_teacher,
            visible_on_exam_student,
            redirect_url,
            legacy_exam_category_id,
            legacy_exam_type_id,
            assessment_mode,
            certificate_enabled,
            schedule_model,
            source_site
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'edu')
        `
      )
      .bind(
        program.uuid,
        organizerUuid,
        program.name,
        program.code,
        program.deliveryMode,
        program.trainingEnabled,
        program.linkedClassEnabled,
        program.visibleOnEduPublic,
        program.visibleOnEduAdmin,
        program.visibleOnExamTeacher,
        program.visibleOnExamStudent,
        program.redirectUrl,
        legacyCategoryId,
        legacyTypeId,
        program.assessmentMode,
        program.certificateEnabled,
        program.scheduleModel
      )
      .run();

  }

  for (const level of PROGRAM_PLATFORM_SEED.levels) {
    const program = PROGRAM_PLATFORM_SEED.programs.find(
      (item) => item.organizerCode === level.organizerCode && item.code === level.programCode
    );
    if (!program) {
      continue;
    }

    await db
      .prepare(
        `
          INSERT OR IGNORE INTO program_levels (
            uuid,
            program_uuid,
            name,
            code,
            sort_order,
            source_site
          )
          VALUES (?, ?, ?, ?, ?, 'edu')
        `
      )
      .bind(level.uuid, program.uuid, level.name, level.code, level.sortOrder)
      .run();
  }
}

export async function listProgramOrganizers(
  db: D1Database,
  options: { includeInactive?: boolean } = {}
) {
  await ensureSeedProgramPlatform(db);

  const result = await db
    .prepare(
      `
        SELECT *
        FROM program_organizers
        WHERE source_site IN ('edu', 'system')
          AND (? = 1 OR is_active = 1)
        ORDER BY name ASC, id ASC
      `
    )
    .bind(options.includeInactive ? 1 : 0)
    .all<ProgramOrganizerRow>();

  return (result.results || []).map((row) => mapOrganizerRow(row as ProgramOrganizerRow));
}

export async function getProgramOrganizerByUuid(db: D1Database, uuid: string) {
  const row = await db
    .prepare(`SELECT * FROM program_organizers WHERE uuid = ? AND source_site IN ('edu', 'system') LIMIT 1`)
    .bind(uuid)
    .first<ProgramOrganizerRow>();

  return row || null;
}

export async function createProgramOrganizer(
  db: D1Database,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const name = normalizeString(payload.name);
  const code = normalizeCode(payload.code || name);

  if (!name || !code) {
    throw new Error('Organizer name and code are required');
  }

  const uuid = normalizeString(payload.uuid) || createUuid();
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        INSERT INTO program_organizers (
          uuid,
          name,
          code,
          description,
          is_active,
          updated_by,
          source_site,
          last_event_uuid,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      uuid,
      name,
      code,
      normalizeString(payload.description),
      parseBooleanFlag(payload.is_active, true),
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso()
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'program_organizer',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, name, code },
  });

  const row = await getProgramOrganizerByUuid(db, uuid);
  return row ? mapOrganizerRow(row) : null;
}

export async function updateProgramOrganizer(
  db: D1Database,
  uuid: string,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const existing = await getProgramOrganizerByUuid(db, uuid);
  if (!existing) {
    throw new Error('Organizer not found');
  }
  assertEduWritable(existing, 'Organizer');

  const name = normalizeString(payload.name) || existing.name;
  const code = normalizeCode(payload.code || existing.code) || existing.code;
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        UPDATE program_organizers
        SET
          name = ?,
          code = ?,
          description = ?,
          is_active = ?,
          updated_by = ?,
          source_site = ?,
          last_event_uuid = ?,
          updated_at = ?
        WHERE uuid = ? AND source_site = 'edu'
      `
    )
    .bind(
      name,
      code,
      normalizeString(payload.description) ?? existing.description,
      payload.is_active === undefined ? existing.is_active : parseBooleanFlag(payload.is_active, true),
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso(),
      uuid
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'program_organizer',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, name, code },
  });

  const row = await getProgramOrganizerByUuid(db, uuid);
  return row ? mapOrganizerRow(row) : null;
}

export async function listPrograms(
  db: D1Database,
  options: {
    organizerUuid?: string | null;
    includeInactive?: boolean;
  } = {}
) {
  await ensureSeedProgramPlatform(db);

  const result = await db
    .prepare(
      `
        SELECT p.*,
               EXISTS(
                 SELECT 1
                 FROM program_levels pl
                 WHERE pl.program_uuid = p.uuid
                   AND pl.is_active = 1
               ) as has_levels,
               o.id as organizer_id, o.uuid as organizer_ref_uuid, o.name as organizer_name, o.code as organizer_code,
               o.description as organizer_description, o.is_active as organizer_is_active, o.updated_by as organizer_updated_by,
               o.source_site as organizer_source_site, o.last_event_uuid as organizer_last_event_uuid,
               o.created_at as organizer_created_at, o.updated_at as organizer_updated_at
        FROM programs p
        JOIN program_organizers o ON o.uuid = p.organizer_uuid AND o.source_site IN ('edu', 'system')
        WHERE p.source_site IN ('edu', 'system')
          AND (? IS NULL OR p.organizer_uuid = ?)
          AND (? = 1 OR p.is_active = 1)
        ORDER BY o.name ASC, p.name ASC, p.id ASC
      `
    )
    .bind(options.organizerUuid || null, options.organizerUuid || null, options.includeInactive ? 1 : 0)
    .all<any>();

  return (result.results || []).map((row) =>
    mapProgramRow(
      row as ProgramRow,
      {
        id: Number(row.organizer_id),
        uuid: row.organizer_ref_uuid,
        name: row.organizer_name,
        code: row.organizer_code,
        description: row.organizer_description,
        is_active: Number(row.organizer_is_active || 0),
        updated_by: row.organizer_updated_by ?? null,
        source_site: row.organizer_source_site,
        last_event_uuid: row.organizer_last_event_uuid ?? null,
        created_at: row.organizer_created_at,
        updated_at: row.organizer_updated_at,
      } satisfies ProgramOrganizerRow,
      { hasLevels: row.has_levels }
    )
  );
}

export async function getProgramByUuid(db: D1Database, uuid: string) {
  const row = await db
    .prepare(`SELECT * FROM programs WHERE uuid = ? AND source_site IN ('edu', 'system') LIMIT 1`)
    .bind(uuid)
    .first<ProgramRow>();
  return row || null;
}

export async function createProgram(
  db: D1Database,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const organizerUuid = normalizeString(payload.organizer_uuid);
  const organizer = organizerUuid ? await getProgramOrganizerByUuid(db, organizerUuid) : null;
  if (!organizer) {
    throw new Error('Organizer is required');
  }

  const name = normalizeString(payload.name);
  const code = normalizeCode(payload.code || name);
  if (!name || !code) {
    throw new Error('Program name and code are required');
  }

  const deliveryMode = normalizeString(payload.delivery_mode) as ProgramDeliveryMode | null;
  if (!deliveryMode || !PROGRAM_DELIVERY_MODES.includes(deliveryMode)) {
    throw new Error('Invalid delivery_mode');
  }

  const assessmentMode = parseEnumValue(
    payload.assessment_mode,
    PROGRAM_ASSESSMENT_MODES,
    'official_exam',
    'assessment_mode'
  );
  const scheduleModel = parseEnumValue(
    payload.schedule_model,
    PROGRAM_SCHEDULE_MODELS,
    'session_based',
    'schedule_model'
  );

  const uuid = normalizeString(payload.uuid) || createUuid();
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);
  const legacyCategoryId = supportsLegacyExamMapping(assessmentMode)
    ? parseOptionalInteger(payload.legacy_exam_category_id) ?? (await resolveLegacyExamCategoryId(db, code, name))
    : null;
  const legacyTypeId = supportsLegacyExamMapping(assessmentMode)
    ? parseOptionalInteger(payload.legacy_exam_type_id) ?? (await resolveLegacyExamTypeId(db, code, name))
    : null;

  await db
    .prepare(
      `
        INSERT INTO programs (
          uuid,
          organizer_uuid,
          name,
          code,
          description,
          delivery_mode,
          training_enabled,
          linked_class_enabled,
          visible_on_edu_public,
          visible_on_edu_admin,
          visible_on_exam_teacher,
          visible_on_exam_student,
          redirect_url,
          is_active,
          legacy_exam_category_id,
          legacy_exam_type_id,
          assessment_mode,
          certificate_enabled,
          schedule_model,
          updated_by,
          source_site,
          last_event_uuid,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      uuid,
      organizerUuid,
      name,
      code,
      normalizeString(payload.description),
      deliveryMode,
      parseBooleanFlag(payload.training_enabled, true),
      parseBooleanFlag(payload.linked_class_enabled, deliveryMode === 'internal_training'),
      parseBooleanFlag(payload.visible_on_edu_public, true),
      parseBooleanFlag(payload.visible_on_edu_admin, true),
      parseBooleanFlag(payload.visible_on_exam_teacher, deliveryMode === 'internal_training'),
      parseBooleanFlag(payload.visible_on_exam_student, deliveryMode === 'internal_training'),
      normalizeString(payload.redirect_url),
      parseBooleanFlag(payload.is_active, true),
      legacyCategoryId,
      legacyTypeId,
      assessmentMode,
      parseBooleanFlag(payload.certificate_enabled, false),
      scheduleModel,
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso()
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'program',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, organizerUuid, name, code, deliveryMode, assessmentMode, scheduleModel },
  });

  const row = await getProgramByUuid(db, uuid);
  return row ? mapProgramRow(row, organizer, { hasLevels: 0 }) : null;
}

export async function updateProgram(
  db: D1Database,
  uuid: string,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const existing = await getProgramByUuid(db, uuid);
  if (!existing) {
    throw new Error('Program not found');
  }
  assertEduWritable(existing, 'Program');

  const organizerUuid = normalizeString(payload.organizer_uuid) || existing.organizer_uuid;
  const organizer = await getProgramOrganizerByUuid(db, organizerUuid);
  if (!organizer) {
    throw new Error('Organizer not found');
  }

  const name = normalizeString(payload.name) || existing.name;
  const code = normalizeCode(payload.code || existing.code) || existing.code;
  const deliveryMode = (normalizeString(payload.delivery_mode) || existing.delivery_mode) as ProgramDeliveryMode;
  if (!PROGRAM_DELIVERY_MODES.includes(deliveryMode)) {
    throw new Error('Invalid delivery_mode');
  }
  const assessmentMode = parseEnumValue(
    payload.assessment_mode,
    PROGRAM_ASSESSMENT_MODES,
    existing.assessment_mode,
    'assessment_mode'
  );
  const scheduleModel = parseEnumValue(
    payload.schedule_model,
    PROGRAM_SCHEDULE_MODELS,
    existing.schedule_model,
    'schedule_model'
  );

  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);
  const legacyCategoryId = supportsLegacyExamMapping(assessmentMode)
    ? parseOptionalInteger(payload.legacy_exam_category_id) ?? existing.legacy_exam_category_id ?? (await resolveLegacyExamCategoryId(db, code, name))
    : null;
  const legacyTypeId = supportsLegacyExamMapping(assessmentMode)
    ? parseOptionalInteger(payload.legacy_exam_type_id) ?? existing.legacy_exam_type_id ?? (await resolveLegacyExamTypeId(db, code, name))
    : null;

  await db
    .prepare(
      `
        UPDATE programs
        SET
          organizer_uuid = ?,
          name = ?,
          code = ?,
          description = ?,
          delivery_mode = ?,
          training_enabled = ?,
          linked_class_enabled = ?,
          visible_on_edu_public = ?,
          visible_on_edu_admin = ?,
          visible_on_exam_teacher = ?,
          visible_on_exam_student = ?,
          redirect_url = ?,
          is_active = ?,
          legacy_exam_category_id = ?,
          legacy_exam_type_id = ?,
          assessment_mode = ?,
          certificate_enabled = ?,
          schedule_model = ?,
          updated_by = ?,
          source_site = ?,
          last_event_uuid = ?,
          updated_at = ?
        WHERE uuid = ? AND source_site = 'edu'
      `
    )
    .bind(
      organizerUuid,
      name,
      code,
      normalizeString(payload.description) ?? existing.description,
      deliveryMode,
      payload.training_enabled === undefined ? existing.training_enabled : parseBooleanFlag(payload.training_enabled, true),
      payload.linked_class_enabled === undefined ? existing.linked_class_enabled : parseBooleanFlag(payload.linked_class_enabled, deliveryMode === 'internal_training'),
      payload.visible_on_edu_public === undefined ? existing.visible_on_edu_public : parseBooleanFlag(payload.visible_on_edu_public, true),
      payload.visible_on_edu_admin === undefined ? existing.visible_on_edu_admin : parseBooleanFlag(payload.visible_on_edu_admin, true),
      payload.visible_on_exam_teacher === undefined ? existing.visible_on_exam_teacher : parseBooleanFlag(payload.visible_on_exam_teacher, deliveryMode === 'internal_training'),
      payload.visible_on_exam_student === undefined ? existing.visible_on_exam_student : parseBooleanFlag(payload.visible_on_exam_student, deliveryMode === 'internal_training'),
      normalizeString(payload.redirect_url) ?? existing.redirect_url,
      payload.is_active === undefined ? existing.is_active : parseBooleanFlag(payload.is_active, true),
      legacyCategoryId,
      legacyTypeId,
      assessmentMode,
      payload.certificate_enabled === undefined ? existing.certificate_enabled : parseBooleanFlag(payload.certificate_enabled, false),
      scheduleModel,
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso(),
      uuid
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'program',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, organizerUuid, name, code, deliveryMode, assessmentMode, scheduleModel },
  });

  const row = await getProgramByUuid(db, uuid);
  const levelCount = await db
    .prepare(`SELECT COUNT(1) as total FROM program_levels WHERE program_uuid = ? AND source_site IN ('edu', 'system') AND is_active = 1`)
    .bind(uuid)
    .first<{ total?: number }>();

  return row ? mapProgramRow(row, organizer, { hasLevels: levelCount?.total ?? 0 }) : null;
}

export async function listProgramLevels(
  db: D1Database,
  options: { programUuid?: string | null; includeInactive?: boolean } = {}
) {
  await ensureSeedProgramPlatform(db);

  const result = await db
    .prepare(
      `
        SELECT pl.*, p.id as program_id, p.organizer_uuid, p.name as program_name, p.code as program_code,
               p.description as program_description, p.delivery_mode, p.training_enabled, p.linked_class_enabled,
               p.visible_on_edu_public, p.visible_on_edu_admin, p.visible_on_exam_teacher, p.visible_on_exam_student,
               p.redirect_url, p.is_active as program_is_active, p.legacy_exam_category_id, p.legacy_exam_type_id,
               p.updated_by as program_updated_by, p.source_site as program_source_site,
               p.last_event_uuid as program_last_event_uuid, p.created_at as program_created_at, p.updated_at as program_updated_at
        FROM program_levels pl
        JOIN programs p ON p.uuid = pl.program_uuid AND p.source_site IN ('edu', 'system')
        WHERE pl.source_site IN ('edu', 'system')
          AND (? IS NULL OR pl.program_uuid = ?)
          AND (? = 1 OR pl.is_active = 1)
        ORDER BY p.name ASC, pl.sort_order ASC, pl.name ASC, pl.id ASC
      `
    )
    .bind(options.programUuid || null, options.programUuid || null, options.includeInactive ? 1 : 0)
    .all<any>();

  return (result.results || []).map((row) =>
    mapLevelRow(
      row as ProgramLevelRow,
      {
        id: Number(row.program_id),
        uuid: row.program_uuid,
        organizer_uuid: row.organizer_uuid,
        name: row.program_name,
        code: row.program_code,
        description: row.program_description,
        delivery_mode: row.delivery_mode,
        training_enabled: Number(row.training_enabled || 0),
        linked_class_enabled: Number(row.linked_class_enabled || 0),
        visible_on_edu_public: Number(row.visible_on_edu_public || 0),
        visible_on_edu_admin: Number(row.visible_on_edu_admin || 0),
        visible_on_exam_teacher: Number(row.visible_on_exam_teacher || 0),
        visible_on_exam_student: Number(row.visible_on_exam_student || 0),
        redirect_url: row.redirect_url,
        is_active: Number(row.program_is_active || 0),
        legacy_exam_category_id: row.legacy_exam_category_id ?? null,
        legacy_exam_type_id: row.legacy_exam_type_id ?? null,
        updated_by: row.program_updated_by ?? null,
        source_site: row.program_source_site,
        last_event_uuid: row.program_last_event_uuid ?? null,
        assessment_mode: row.assessment_mode ?? 'none',
        certificate_enabled: Number(row.certificate_enabled || 0),
        schedule_model: row.schedule_model ?? 'session_based',
        created_at: row.program_created_at,
        updated_at: row.program_updated_at,
      } satisfies ProgramRow
    )
  );
}

export async function getProgramLevelByUuid(db: D1Database, uuid: string) {
  const row = await db
    .prepare(`SELECT * FROM program_levels WHERE uuid = ? AND source_site IN ('edu', 'system') LIMIT 1`)
    .bind(uuid)
    .first<ProgramLevelRow>();
  return row || null;
}

export async function createProgramLevel(
  db: D1Database,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const programUuid = normalizeString(payload.program_uuid);
  const program = programUuid ? await getProgramByUuid(db, programUuid) : null;
  if (!program) {
    throw new Error('Program is required');
  }

  const name = normalizeString(payload.name);
  const code = normalizeCode(payload.code || name);
  if (!name || !code) {
    throw new Error('Level name and code are required');
  }

  const uuid = normalizeString(payload.uuid) || createUuid();
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        INSERT INTO program_levels (
          uuid,
          program_uuid,
          name,
          code,
          description,
          sort_order,
          is_active,
          updated_by,
          source_site,
          last_event_uuid,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      uuid,
      programUuid,
      name,
      code,
      normalizeString(payload.description),
      parseOptionalInteger(payload.sort_order) ?? 0,
      parseBooleanFlag(payload.is_active, true),
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso()
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'program_level',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, programUuid, name, code },
  });

  const row = await getProgramLevelByUuid(db, uuid);
  return row ? mapLevelRow(row, program) : null;
}

export async function updateProgramLevel(
  db: D1Database,
  uuid: string,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const existing = await getProgramLevelByUuid(db, uuid);
  if (!existing) {
    throw new Error('Level not found');
  }
  assertEduWritable(existing, 'Level');

  const programUuid = normalizeString(payload.program_uuid) || existing.program_uuid;
  const program = await getProgramByUuid(db, programUuid);
  if (!program) {
    throw new Error('Program not found');
  }

  const name = normalizeString(payload.name) || existing.name;
  const code = normalizeCode(payload.code || existing.code) || existing.code;
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        UPDATE program_levels
        SET
          program_uuid = ?,
          name = ?,
          code = ?,
          description = ?,
          sort_order = ?,
          is_active = ?,
          updated_by = ?,
          source_site = ?,
          last_event_uuid = ?,
          updated_at = ?
        WHERE uuid = ? AND source_site = 'edu'
      `
    )
    .bind(
      programUuid,
      name,
      code,
      normalizeString(payload.description) ?? existing.description,
      parseOptionalInteger(payload.sort_order) ?? existing.sort_order,
      payload.is_active === undefined ? existing.is_active : parseBooleanFlag(payload.is_active, true),
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso(),
      uuid
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'program_level',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, programUuid, name, code },
  });

  const row = await getProgramLevelByUuid(db, uuid);
  return row ? mapLevelRow(row, program) : null;
}

export async function listFieldDefinitions(
  db: D1Database,
  options: {
    targetEntityType?: string | null;
    ownerEntityType?: string | null;
    ownerEntityUuid?: string | null;
    includeInactive?: boolean;
  } = {}
) {
  const result = await db
    .prepare(
      `
        SELECT *
        FROM field_definitions
        WHERE source_site IN ('edu', 'system')
          AND (? IS NULL OR target_entity_type = ?)
          AND (? IS NULL OR owner_entity_type = ?)
          AND (? IS NULL OR owner_entity_uuid = ?)
          AND (? = 1 OR is_active = 1)
        ORDER BY sort_order ASC, label ASC, id ASC
      `
    )
    .bind(
      options.targetEntityType || null,
      options.targetEntityType || null,
      options.ownerEntityType || null,
      options.ownerEntityType || null,
      options.ownerEntityUuid || null,
      options.ownerEntityUuid || null,
      options.includeInactive ? 1 : 0
    )
    .all<FieldDefinitionRow>();

  return (result.results || []).map((row) => mapFieldDefinitionRow(row as FieldDefinitionRow));
}

export async function getFieldDefinitionByUuid(db: D1Database, uuid: string) {
  const row = await db
    .prepare(`SELECT * FROM field_definitions WHERE uuid = ? AND source_site IN ('edu', 'system') LIMIT 1`)
    .bind(uuid)
    .first<FieldDefinitionRow>();
  return row || null;
}

export async function createFieldDefinition(
  db: D1Database,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const label = normalizeString(payload.label || payload.name);
  const fieldKey = normalizeCode(payload.field_key || payload.code || label)?.toLowerCase();
  const fieldType = normalizeString(payload.field_type);
  const targetEntityType = normalizeString(payload.target_entity_type || payload.scope_type);
  const ownerEntityType = normalizeString(payload.owner_entity_type || payload.scope_type);
  const ownerEntityUuid = normalizeString(payload.owner_entity_uuid || payload.scope_uuid);

  if (!label || !fieldKey || !fieldType || !FIELD_TYPES.includes(fieldType as (typeof FIELD_TYPES)[number]) || !targetEntityType) {
    throw new Error('Invalid field definition payload');
  }

  const uuid = normalizeString(payload.uuid) || createUuid();
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        INSERT INTO field_definitions (
          uuid,
          field_key,
          label,
          description,
          field_type,
          target_entity_type,
          owner_entity_type,
          owner_entity_uuid,
          placeholder,
          help_text,
          config_json,
          searchable,
          filterable,
          exportable,
          reportable,
          visible_on_edu_public,
          visible_on_edu_admin,
          visible_on_exam_teacher,
          visible_on_exam_student,
          is_active,
          sort_order,
          updated_by,
          source_site,
          last_event_uuid,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      uuid,
      fieldKey,
      label,
      normalizeString(payload.description),
      fieldType,
      targetEntityType,
      ownerEntityType,
      ownerEntityUuid,
      normalizeString(payload.placeholder),
      normalizeString(payload.help_text || payload.helper_text),
      parseJsonValue(payload.config ?? payload.config_json),
      parseBooleanFlag(payload.searchable, false),
      parseBooleanFlag(payload.filterable, false),
      parseBooleanFlag(payload.exportable, false),
      parseBooleanFlag(payload.reportable, false),
      parseBooleanFlag(payload.visible_on_edu_public, false),
      parseBooleanFlag(payload.visible_on_edu_admin, true),
      parseBooleanFlag(payload.visible_on_exam_teacher, true),
      parseBooleanFlag(payload.visible_on_exam_student, false),
      parseBooleanFlag(payload.is_active, true),
      parseOptionalInteger(payload.sort_order) ?? 0,
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso()
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'field_definition',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, fieldKey, targetEntityType },
  });

  const row = await getFieldDefinitionByUuid(db, uuid);
  return row ? mapFieldDefinitionRow(row) : null;
}

export async function updateFieldDefinition(
  db: D1Database,
  uuid: string,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const existing = await getFieldDefinitionByUuid(db, uuid);
  if (!existing) {
    throw new Error('Field definition not found');
  }
  assertEduWritable(existing, 'Field definition');

  const label = normalizeString(payload.label || payload.name) || existing.label;
  const fieldKey = normalizeCode(payload.field_key || payload.code || existing.field_key)?.toLowerCase() || existing.field_key;
  const fieldType = normalizeString(payload.field_type) || existing.field_type;
  const targetEntityType = normalizeString(payload.target_entity_type || payload.scope_type) || existing.target_entity_type;
  const ownerEntityType = normalizeString(payload.owner_entity_type || payload.scope_type) ?? existing.owner_entity_type;
  const ownerEntityUuid = normalizeString(payload.owner_entity_uuid || payload.scope_uuid) ?? existing.owner_entity_uuid;
  if (!FIELD_TYPES.includes(fieldType as (typeof FIELD_TYPES)[number])) {
    throw new Error('Invalid field_type');
  }

  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        UPDATE field_definitions
        SET
          field_key = ?,
          label = ?,
          description = ?,
          field_type = ?,
          target_entity_type = ?,
          owner_entity_type = ?,
          owner_entity_uuid = ?,
          placeholder = ?,
          help_text = ?,
          config_json = ?,
          searchable = ?,
          filterable = ?,
          exportable = ?,
          reportable = ?,
          visible_on_edu_public = ?,
          visible_on_edu_admin = ?,
          visible_on_exam_teacher = ?,
          visible_on_exam_student = ?,
          is_active = ?,
          sort_order = ?,
          updated_by = ?,
          source_site = ?,
          last_event_uuid = ?,
          updated_at = ?
        WHERE uuid = ? AND source_site = 'edu'
      `
    )
    .bind(
      fieldKey,
      label,
      normalizeString(payload.description) ?? existing.description,
      fieldType,
      targetEntityType,
      ownerEntityType,
      ownerEntityUuid,
      normalizeString(payload.placeholder) ?? existing.placeholder,
      normalizeString(payload.help_text || payload.helper_text) ?? existing.help_text,
      payload.config === undefined && payload.config_json === undefined
        ? existing.config_json
        : parseJsonValue(payload.config ?? payload.config_json),
      payload.searchable === undefined ? existing.searchable : parseBooleanFlag(payload.searchable, false),
      payload.filterable === undefined ? existing.filterable : parseBooleanFlag(payload.filterable, false),
      payload.exportable === undefined ? existing.exportable : parseBooleanFlag(payload.exportable, false),
      payload.reportable === undefined ? existing.reportable : parseBooleanFlag(payload.reportable, false),
      payload.visible_on_edu_public === undefined ? existing.visible_on_edu_public : parseBooleanFlag(payload.visible_on_edu_public, false),
      payload.visible_on_edu_admin === undefined ? existing.visible_on_edu_admin : parseBooleanFlag(payload.visible_on_edu_admin, true),
      payload.visible_on_exam_teacher === undefined ? existing.visible_on_exam_teacher : parseBooleanFlag(payload.visible_on_exam_teacher, true),
      payload.visible_on_exam_student === undefined ? existing.visible_on_exam_student : parseBooleanFlag(payload.visible_on_exam_student, false),
      payload.is_active === undefined ? existing.is_active : parseBooleanFlag(payload.is_active, true),
      parseOptionalInteger(payload.sort_order) ?? existing.sort_order,
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso(),
      uuid
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'field_definition',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, fieldKey, targetEntityType },
  });

  const row = await getFieldDefinitionByUuid(db, uuid);
  return row ? mapFieldDefinitionRow(row) : null;
}

export async function listFieldOptions(
  db: D1Database,
  options: { fieldDefinitionUuid?: string | null; includeInactive?: boolean } = {}
) {
  const result = await db
    .prepare(
      `
        SELECT *
        FROM field_options
        WHERE source_site IN ('edu', 'system')
          AND (? IS NULL OR field_definition_uuid = ?)
          AND (? = 1 OR is_active = 1)
        ORDER BY sort_order ASC, label ASC, id ASC
      `
    )
    .bind(options.fieldDefinitionUuid || null, options.fieldDefinitionUuid || null, options.includeInactive ? 1 : 0)
    .all<FieldOptionRow>();

  return (result.results || []).map((row) => mapFieldOptionRow(row as FieldOptionRow));
}

export async function getFieldOptionByUuid(db: D1Database, uuid: string) {
  const row = await db
    .prepare(`SELECT * FROM field_options WHERE uuid = ? AND source_site IN ('edu', 'system') LIMIT 1`)
    .bind(uuid)
    .first<FieldOptionRow>();
  return row || null;
}

export async function createFieldOption(
  db: D1Database,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const fieldDefinitionUuid = normalizeString(payload.field_definition_uuid);
  const fieldDefinition = fieldDefinitionUuid ? await getFieldDefinitionByUuid(db, fieldDefinitionUuid) : null;
  if (!fieldDefinition) {
    throw new Error('Field definition is required');
  }

  const label = normalizeString(payload.label || payload.name);
  const value = normalizeString(payload.value || payload.code || label);
  if (!label || !value) {
    throw new Error('Field option label and value are required');
  }

  const uuid = normalizeString(payload.uuid) || createUuid();
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        INSERT INTO field_options (
          uuid,
          field_definition_uuid,
          label,
          value,
          color,
          sort_order,
          is_active,
          updated_by,
          source_site,
          last_event_uuid,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      uuid,
      fieldDefinitionUuid,
      label,
      value,
      normalizeString(payload.color),
      parseOptionalInteger(payload.sort_order) ?? 0,
      parseBooleanFlag(payload.is_active, true),
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso()
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'field_option',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, fieldDefinitionUuid, label, value },
  });

  const row = await getFieldOptionByUuid(db, uuid);
  return row ? mapFieldOptionRow(row) : null;
}

export async function updateFieldOption(
  db: D1Database,
  uuid: string,
  payload: Record<string, unknown>,
  actor: JWTPayload,
  sourceSite: SiteName
) {
  const existing = await getFieldOptionByUuid(db, uuid);
  if (!existing) {
    throw new Error('Field option not found');
  }
  assertEduWritable(existing, 'Field option');

  const fieldDefinitionUuid = normalizeString(payload.field_definition_uuid) || existing.field_definition_uuid;
  const label = normalizeString(payload.label || payload.name) || existing.label;
  const value = normalizeString(payload.value || payload.code || existing.value) || existing.value;
  const eventUuid = normalizeString(payload.last_event_uuid) || createUuid();
  const updatedBy = parseOptionalInteger(payload.updated_by) ?? resolveActorId(actor);

  await db
    .prepare(
      `
        UPDATE field_options
        SET
          field_definition_uuid = ?,
          label = ?,
          value = ?,
          color = ?,
          sort_order = ?,
          is_active = ?,
          updated_by = ?,
          source_site = ?,
          last_event_uuid = ?,
          updated_at = ?
        WHERE uuid = ? AND source_site = 'edu'
      `
    )
    .bind(
      fieldDefinitionUuid,
      label,
      value,
      normalizeString(payload.color) ?? existing.color,
      parseOptionalInteger(payload.sort_order) ?? existing.sort_order,
      payload.is_active === undefined ? existing.is_active : parseBooleanFlag(payload.is_active, true),
      updatedBy,
      sourceSite,
      eventUuid,
      nowIso(),
      uuid
    )
    .run();

  await recordProgramPlatformSyncEvent(db, {
    eventUuid,
    entityType: 'field_option',
    entityUuid: uuid,
    action: 'upsert',
    sourceSite,
    payload: { uuid, fieldDefinitionUuid, label, value },
  });

  const row = await getFieldOptionByUuid(db, uuid);
  return row ? mapFieldOptionRow(row) : null;
}

export async function resolveProgramContext(
  db: D1Database,
  input: {
    organizerUuid?: string | null;
    programUuid?: string | null;
    levelUuid?: string | null;
  }
): Promise<ProgramContextRow | null> {
  const programUuid = normalizeString(input.programUuid);
  if (!programUuid) {
    return null;
  }

  const result = await db
    .prepare(
      `
        SELECT
          o.uuid as organizer_uuid,
          o.code as organizer_code,
          o.name as organizer_name,
          p.uuid as program_uuid,
          p.code as program_code,
          p.name as program_name,
          pl.uuid as level_uuid,
          pl.code as level_code,
          pl.name as level_name,
          p.delivery_mode,
          p.linked_class_enabled,
          p.training_enabled,
          p.redirect_url,
          p.visible_on_edu_public,
          p.visible_on_edu_admin,
          p.visible_on_exam_teacher,
          p.visible_on_exam_student,
          p.legacy_exam_category_id,
          p.legacy_exam_type_id,
          p.assessment_mode,
          p.certificate_enabled,
          p.schedule_model,
          EXISTS(
            SELECT 1
            FROM program_levels levels
            WHERE levels.program_uuid = p.uuid
              AND levels.source_site IN ('edu', 'system')
              AND levels.is_active = 1
          ) as has_levels
        FROM programs p
        JOIN program_organizers o ON o.uuid = p.organizer_uuid AND o.source_site IN ('edu', 'system')
        LEFT JOIN program_levels pl ON pl.uuid = ? AND pl.program_uuid = p.uuid AND pl.source_site IN ('edu', 'system')
        WHERE p.uuid = ?
          AND p.source_site IN ('edu', 'system')
        LIMIT 1
      `
    )
    .bind(normalizeString(input.levelUuid), programUuid)
    .first<any>();

  if (!result) {
    return null;
  }

  if (input.organizerUuid && normalizeString(input.organizerUuid) !== result.organizer_uuid) {
    throw new Error('Organizer does not match program');
  }

  if (input.levelUuid && !result.level_uuid) {
    throw new Error('Level does not belong to program');
  }

  return {
    organizerUuid: result.organizer_uuid,
    organizerCode: result.organizer_code,
    organizerName: result.organizer_name,
    programUuid: result.program_uuid,
    programCode: result.program_code,
    programName: result.program_name,
    levelUuid: result.level_uuid ?? null,
    levelCode: result.level_code ?? null,
    levelName: result.level_name ?? null,
    deliveryMode: result.delivery_mode,
    linkedClassEnabled: boolToFlag(result.linked_class_enabled),
    trainingEnabled: boolToFlag(result.training_enabled),
    redirectUrl: result.redirect_url ?? null,
    visibleOnEduPublic: boolToFlag(result.visible_on_edu_public),
    visibleOnEduAdmin: boolToFlag(result.visible_on_edu_admin),
    visibleOnExamTeacher: boolToFlag(result.visible_on_exam_teacher),
    visibleOnExamStudent: boolToFlag(result.visible_on_exam_student),
    legacyExamCategoryId: result.legacy_exam_category_id ?? null,
    legacyExamTypeId: result.legacy_exam_type_id ?? null,
    assessmentMode: result.assessment_mode ?? null,
    certificateEnabled: boolToFlag(result.certificate_enabled),
    scheduleModel: result.schedule_model ?? null,
    hasLevels: boolToFlag(result.has_levels),
  };
}
