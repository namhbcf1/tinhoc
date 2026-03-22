import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import examSchedules from '../../routes/exam-schedules.js';
import { generateJWT } from '../../utils/helpers.js';

const JWT_SECRET = 'test-secret-key';

function createTestApp() {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.env = {
      DB: env.DB,
      JWT_SECRET,
    } as any;
    await next();
  });

  app.route('/exam-schedules', examSchedules);
  return app;
}

async function createAdminToken() {
  return generateJWT(
    {
      id: 1,
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    JWT_SECRET
  );
}

async function createLegacyTeacherToken() {
  return generateJWT(
    {
      id: 9,
      role: 'teacher',
      teacher_code: 'GV001',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    JWT_SECRET
  );
}

async function createStudentToken(studentId = 101) {
  return generateJWT(
    {
      id: studentId,
      type: 'student',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    JWT_SECRET
  );
}

async function setupDatabase() {
  const db = env.DB;

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS program_organizers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by INTEGER,
      source_site TEXT NOT NULL DEFAULT 'edu',
      last_event_uuid TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      organizer_uuid TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      delivery_mode TEXT NOT NULL,
      training_enabled INTEGER NOT NULL DEFAULT 1,
      linked_class_enabled INTEGER NOT NULL DEFAULT 1,
      visible_on_edu_public INTEGER NOT NULL DEFAULT 1,
      visible_on_edu_admin INTEGER NOT NULL DEFAULT 1,
      visible_on_exam_teacher INTEGER NOT NULL DEFAULT 1,
      visible_on_exam_student INTEGER NOT NULL DEFAULT 1,
      redirect_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      legacy_exam_category_id INTEGER,
      legacy_exam_type_id INTEGER,
      assessment_mode TEXT NOT NULL DEFAULT 'official_exam',
      certificate_enabled INTEGER NOT NULL DEFAULT 0,
      schedule_model TEXT NOT NULL DEFAULT 'session_based',
      updated_by INTEGER,
      source_site TEXT NOT NULL DEFAULT 'edu',
      last_event_uuid TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS program_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      program_uuid TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by INTEGER,
      source_site TEXT NOT NULL DEFAULT 'edu',
      last_event_uuid TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_category_id INTEGER,
      name TEXT NOT NULL,
      code TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_lop TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      student_id INTEGER,
      status TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      exam_name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 120,
      location TEXT,
      notes TEXT,
      template_id INTEGER,
      zoom_link TEXT,
      zoom_link_backup TEXT,
      zoom_meeting_id TEXT,
      zoom_passcode TEXT,
      exam_type TEXT,
      exam_level TEXT,
      exam_category_id INTEGER,
      exam_type_id INTEGER,
      organizer_uuid TEXT,
      program_uuid TEXT,
      level_uuid TEXT,
      custom_field_payload TEXT,
      override_payload TEXT,
      updated_by INTEGER,
      source_site TEXT DEFAULT 'edu',
      last_event_uuid TEXT,
      class_seed_name TEXT,
      class_seed_description TEXT,
      class_seed_schedule_rule TEXT,
      class_seed_schedule_time TEXT,
      class_seed_timezone TEXT,
      class_seed_start_date TEXT,
      class_seed_end_date TEXT,
      class_seed_teacher_name TEXT,
      class_seed_max_students INTEGER,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      approved_at TEXT,
      approved_by INTEGER,
      UNIQUE (exam_id, student_id)
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS excel_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      file_key TEXT NOT NULL,
      header_rows INTEGER DEFAULT 8,
      data_start_row INTEGER DEFAULT 10,
      date_cell TEXT,
      column_mapping TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      description TEXT,
      schedule_rule TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      timezone TEXT NOT NULL,
      recurrence TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      meet_link TEXT,
      calendar_event_id TEXT,
      teacher_name TEXT,
      max_students INTEGER,
      status TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source_exam_schedule_id INTEGER,
      source_kind TEXT,
      exam_category_id INTEGER,
      exam_type_id INTEGER,
      organizer_uuid TEXT,
      program_uuid TEXT,
      level_uuid TEXT,
      custom_field_payload TEXT,
      override_payload TEXT
    )
  `).run();
}

async function cleanDatabase() {
  await env.DB.prepare('DELETE FROM online_classes').run();
  await env.DB.prepare('DELETE FROM exam_registrations').run();
  await env.DB.prepare('DELETE FROM exam_schedules').run();
  await env.DB.prepare('DELETE FROM registrations').run();
  await env.DB.prepare('DELETE FROM classes').run();
  await env.DB.prepare('DELETE FROM exam_types').run();
  await env.DB.prepare('DELETE FROM exam_categories').run();
  await env.DB.prepare('DELETE FROM excel_templates').run();
  await env.DB.prepare('DELETE FROM program_levels').run();
  await env.DB.prepare('DELETE FROM programs').run();
  await env.DB.prepare('DELETE FROM program_organizers').run();
}

async function seedProgramPlatform() {
  await env.DB.prepare(`
    INSERT INTO program_organizers (uuid, name, code)
    VALUES (?, ?, ?)
  `).bind('org-ptit', 'PTIT', 'PTIT').run();

  await env.DB.prepare(`
    INSERT INTO program_organizers (uuid, name, code)
    VALUES (?, ?, ?)
  `).bind('org-eduglobal', 'Edu Global', 'EDUGLOBAL').run();

  await env.DB.prepare(`
    INSERT INTO exam_categories (id, name, code)
    VALUES (?, ?, ?)
  `).bind(1, 'Tin hoc', 'TINHOC').run();

  await env.DB.prepare(`
    INSERT INTO exam_types (id, exam_category_id, name, code)
    VALUES (?, ?, ?, ?)
  `).bind(1, 1, 'Tin hoc co ban', 'THCB').run();

  await env.DB.prepare(`
    INSERT INTO exam_categories (id, name, code)
    VALUES (?, ?, ?)
  `).bind(2, 'Vept', 'VEPT').run();

  await env.DB.prepare(`
    INSERT INTO exam_types (id, exam_category_id, name, code)
    VALUES (?, ?, ?, ?)
  `).bind(2, 2, 'Vept placement', 'VEPT').run();

  await env.DB.prepare(`
    INSERT INTO programs (
      uuid, organizer_uuid, name, code, delivery_mode,
      linked_class_enabled, visible_on_exam_teacher, visible_on_exam_student,
      legacy_exam_category_id, legacy_exam_type_id, assessment_mode, schedule_model
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'program-tinhoc',
    'org-ptit',
    'Tin hoc PTIT',
    'TH-PTIT',
    'internal_training',
    1,
    1,
    1,
    1,
    1,
    'official_exam',
    'session_based'
  ).run();

  await env.DB.prepare(`
    INSERT INTO programs (
      uuid, organizer_uuid, name, code, delivery_mode,
      linked_class_enabled, visible_on_exam_teacher, visible_on_exam_student,
      legacy_exam_category_id, legacy_exam_type_id, assessment_mode, schedule_model
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'program-vept',
    'org-eduglobal',
    'VEPT',
    'VEPT',
    'external_redirect',
    0,
    1,
    1,
    2,
    2,
    'official_exam',
    'session_based'
  ).run();

  await env.DB.prepare(`
    INSERT INTO programs (
      uuid, organizer_uuid, name, code, delivery_mode,
      linked_class_enabled, visible_on_exam_teacher, visible_on_exam_student,
      legacy_exam_category_id, legacy_exam_type_id, assessment_mode, schedule_model
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'program-th-edu',
    'org-eduglobal',
    'Tin hoc Edu Global',
    'TH-EDU',
    'internal_training',
    1,
    1,
    1,
    1,
    1,
    'official_exam',
    'session_based'
  ).run();

  await env.DB.prepare(`
    INSERT INTO excel_templates (id, name, display_name, file_key)
    VALUES (?, ?, ?, ?)
  `).bind(1, 'ptit', 'PTIT', 'templates/MAUPTIT.xlsx').run();

  await env.DB.prepare(`
    INSERT INTO excel_templates (id, name, display_name, file_key)
    VALUES (?, ?, ?, ?)
  `).bind(2, 'vept', 'VEPT', 'templates/MAUVEPT.xlsx').run();
}

async function insertExamSchedule() {
  const result = await env.DB.prepare(`
    INSERT INTO exam_schedules (
      exam_name,
      exam_date,
      duration_minutes,
      exam_type,
      exam_category_id,
      exam_type_id,
      organizer_uuid,
      program_uuid
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    'Tin hoc PTIT 22/03/2026',
    '2026-03-22 09:00:00',
    120,
    'Tin hoc co ban',
    1,
    1,
    'org-ptit',
    'program-tinhoc'
  ).run();

  return Number(result.meta.last_row_id);
}

describe('exam schedules routes', () => {
  beforeEach(async () => {
    await setupDatabase();
    await cleanDatabase();
    await seedProgramPlatform();
  });

  it('creates an exam schedule with nullable duration when linked class is disabled', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Tin hoc PTIT 23/03/2026',
        exam_date: '2026-03-23T09:00:00.000Z',
        duration_minutes: null,
        organizer_uuid: 'org-ptit',
        program_uuid: 'program-tinhoc',
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT duration_minutes, class_seed_name, zoom_link
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Tin hoc PTIT 23/03/2026').first<{
      duration_minutes: number | null;
      class_seed_name: string | null;
      zoom_link: string | null;
    }>();

    expect(saved?.duration_minutes ?? null).toBeNull();
    expect(saved?.class_seed_name ?? null).toBeNull();
    expect(saved?.zoom_link ?? null).toBeNull();
  });

  it('auto assigns PTIT template when request omits template_id', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Thi PTIT auto template',
        exam_date: '2026-03-23T09:00:00.000Z',
        organizer_uuid: 'org-ptit',
        program_uuid: 'program-tinhoc',
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT template_id
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi PTIT auto template').first<{ template_id: number | null }>();

    expect(saved?.template_id ?? null).toBe(1);
  });

  it('auto assigns VEPT template when organizer is not PTIT and program code is VEPT', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Thi VEPT auto template',
        exam_date: '2026-03-24T09:00:00.000Z',
        organizer_uuid: 'org-eduglobal',
        program_uuid: 'program-vept',
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT template_id
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi VEPT auto template').first<{ template_id: number | null }>();

    expect(saved?.template_id ?? null).toBe(2);
  });

  it('accepts organizer and program identifiers by code or name when creating an exam schedule', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Thi PTIT theo ma',
        exam_date: '2026-03-24T09:00:00.000Z',
        organizer_uuid: 'PTIT',
        program_uuid: 'TH-PTIT',
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT organizer_uuid, program_uuid, exam_category_id, exam_type_id
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi PTIT theo ma').first<{
      organizer_uuid: string | null;
      program_uuid: string | null;
      exam_category_id: number | null;
      exam_type_id: number | null;
    }>();

    expect(saved?.organizer_uuid ?? null).toBe('org-ptit');
    expect(saved?.program_uuid ?? null).toBe('program-tinhoc');
    expect(saved?.exam_category_id ?? null).toBe(1);
    expect(saved?.exam_type_id ?? null).toBe(1);
  });

  it('accepts fuzzy program labels when the submitted value is only a partial display name', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Thi PTIT fuzzy label',
        exam_date: '2026-03-24T09:00:00.000Z',
        organizer_uuid: 'PTIT',
        program_uuid: 'PTIT',
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT organizer_uuid, program_uuid
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi PTIT fuzzy label').first<{
      organizer_uuid: string | null;
      program_uuid: string | null;
    }>();

    expect(saved?.organizer_uuid ?? null).toBe('org-ptit');
    expect(saved?.program_uuid ?? null).toBe('program-tinhoc');
  });

  it('keeps explicit template_id without overriding it', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Thi giu template tay',
        exam_date: '2026-03-25T09:00:00.000Z',
        organizer_uuid: 'org-eduglobal',
        program_uuid: 'program-vept',
        template_id: 1,
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT template_id
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi giu template tay').first<{ template_id: number | null }>();

    expect(saved?.template_id ?? null).toBe(1);
  });

  it('keeps template_id null when no auto rule matches', async () => {
    const app = createTestApp();
    const token = await createAdminToken();

    const response = await app.request('/exam-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Thi khong auto template',
        exam_date: '2026-03-26T09:00:00.000Z',
        organizer_uuid: 'org-eduglobal',
        program_uuid: 'program-th-edu',
        enable_linked_class: false,
        enable_zoom_meeting: false,
      }),
    });

    expect(response.status).toBe(201);

    const saved = await env.DB.prepare(`
      SELECT template_id
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi khong auto template').first<{ template_id: number | null }>();

    expect(saved?.template_id ?? null).toBeNull();
  });

  it('rejects legacy teacher sessions on admin exam schedule routes', async () => {
    const app = createTestApp();
    const token = await createLegacyTeacherToken();

    const response = await app.request('/exam-schedules', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(403);
  });

  it('ignores invalid linked class fields when linked class is explicitly disabled on update', async () => {
    const app = createTestApp();
    const token = await createAdminToken();
    const examId = await insertExamSchedule();

    const response = await app.request(`/exam-schedules/${examId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exam_name: 'Tin hoc PTIT 22/03/2026',
        exam_date: '2026-03-22T09:00:00.000Z',
        duration_minutes: null,
        organizer_uuid: 'org-ptit',
        program_uuid: 'program-tinhoc',
        enable_linked_class: false,
        enable_zoom_meeting: false,
        class_seed_schedule_rule: 'weekly',
      }),
    });

    expect(response.status).toBe(200);

    const saved = await env.DB.prepare(`
      SELECT duration_minutes, class_seed_name, class_seed_schedule_rule, zoom_link
      FROM exam_schedules
      WHERE id = ?
    `).bind(examId).first<{
      duration_minutes: number | null;
      class_seed_name: string | null;
      class_seed_schedule_rule: string | null;
      zoom_link: string | null;
    }>();

    expect(saved?.duration_minutes ?? null).toBeNull();
    expect(saved?.class_seed_name ?? null).toBeNull();
    expect(saved?.class_seed_schedule_rule ?? null).toBeNull();
    expect(saved?.zoom_link ?? null).toBeNull();
  });

  it('blocks student registration when another active upcoming exam in the same bucket already exists', async () => {
    const app = createTestApp();
    const token = await createStudentToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1001, 'Thi lớp A', '2026-04-01 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1002, 'Thi lớp B', '2026-04-05 15:00:00', 90, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1001, 101, 'pending').run();

    const response = await app.request('/exam-schedules/1002/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(400);

    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION');
    expect(payload.details?.existing_exam_id).toBe(1001);
    expect(payload.details?.registration_bucket).toBe('informatics');
    expect(String(payload.message || '')).toContain('tin học');
  });

  it('allows student registration when existing active exam is in a different bucket (tin học + tiếng Anh)', async () => {
    const app = createTestApp();
    const token = await createStudentToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1021, 'Thi Tin hoc A', '2026-04-01 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1022, 'Thi VEPT B1', '2026-04-05 15:00:00', 90, 2, 2, 'org-eduglobal', 'program-vept').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1021, 101, 'pending').run();

    const response = await app.request('/exam-schedules/1022/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
  });

  it('blocks second English registration (VEPT + VSTEP treated as same bucket)', async () => {
    const app = createTestApp();
    const token = await createStudentToken();

    await env.DB.prepare(`
      INSERT INTO exam_categories (id, name, code)
      VALUES (?, ?, ?)
    `).bind(3, 'Vstep', 'VSTEP').run();

    await env.DB.prepare(`
      INSERT INTO exam_types (id, exam_category_id, name, code)
      VALUES (?, ?, ?, ?)
    `).bind(3, 3, 'Vstep B1', 'VSTEP').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1031, 'Thi VEPT', '2026-04-02 09:00:00', 120, 2, 2, 'org-eduglobal', 'program-vept').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1032, 'Thi VSTEP', '2026-04-06 09:00:00', 120, 3, 3, 'org-eduglobal', 'program-vept').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1031, 101, 'approved').run();

    const response = await app.request('/exam-schedules/1032/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(payload.code).toBe('STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION');
    expect(payload.details?.registration_bucket).toBe('english');
    expect(String(payload.message || '')).toContain('tiếng Anh');
  });

  it('allows student registration when the existing active exam is already in the past', async () => {
    const app = createTestApp();
    const token = await createStudentToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1011, 'Thi đã qua', '2026-03-01 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1012, 'Thi mới', '2026-04-10 09:00:00', 90, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1011, 101, 'approved').run();

    const response = await app.request('/exam-schedules/1012/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.success).toBe(true);
  });

  it('marks other available upcoming exams as blocked when student already holds one active registration in the same bucket', async () => {
    const app = createTestApp();
    const token = await createStudentToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1101, 'Thi đã đăng ký', '2026-04-03 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1102, 'Thi còn lại trong đợt', '2026-04-07 14:00:00', 60, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1101, 101, 'approved').run();

    const response = await app.request('/exam-schedules/my-exams', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);

    const payload = await response.json();
    const exams = payload.data || [];
    const blockedAvailableExam = exams.find((item: any) => item.id === 1102);
    const registeredExam = exams.find((item: any) => item.id === 1101);

    expect(registeredExam?.registration_status).toBe('approved');
    expect(blockedAvailableExam?.registration_status ?? 'available').toBe('available');
    expect(blockedAvailableExam?.has_time_conflict).toBe(true);
    expect(blockedAvailableExam?.conflicting_exam_id).toBe(1101);
    expect(String(blockedAvailableExam?.conflict_message || '')).toContain('Thi đã đăng ký');
  });

  it('does not block available exams when active registration is in a different bucket', async () => {
    const app = createTestApp();
    const token = await createStudentToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1111, 'Thi Tin hoc đã đăng ký', '2026-04-03 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1112, 'Thi VEPT còn lại', '2026-04-07 14:00:00', 60, 2, 2, 'org-eduglobal', 'program-vept').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1111, 101, 'approved').run();

    const response = await app.request('/exam-schedules/my-exams', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);

    const payload = await response.json();
    const exams = payload.data || [];
    const availableExam = exams.find((item: any) => item.id === 1112);

    expect(availableExam?.registration_status ?? 'available').toBe('available');
    expect(availableExam?.has_time_conflict).toBe(false);
    expect(availableExam?.conflicting_exam_id ?? null).toBeNull();
  });

  it('admin add-students blocks same-bucket active registration when force is false', async () => {
    const app = createTestApp();
    const adminToken = await createAdminToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1201, 'Thi Tin hoc đang giữ', '2026-04-03 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1202, 'Thi Tin hoc muốn thêm', '2026-04-07 14:00:00', 60, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1201, 101, 'approved').run();

    const response = await app.request('/exam-schedules/1202/students', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_ids: [101],
        force: false,
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.results?.[0]?.status).toBe('blocked');
    expect(payload.results?.[0]?.code).toBe('STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION');
  });

  it('admin add-students force=true replaces same-bucket active registration', async () => {
    const app = createTestApp();
    const adminToken = await createAdminToken();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1211, 'Thi Tin hoc cũ', '2026-04-03 09:00:00', 120, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_schedules (
        id, exam_name, exam_date, duration_minutes, exam_category_id, exam_type_id, organizer_uuid, program_uuid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(1212, 'Thi Tin hoc mới', '2026-04-07 14:00:00', 60, 1, 1, 'org-ptit', 'program-tinhoc').run();

    await env.DB.prepare(`
      INSERT INTO exam_registrations (exam_id, student_id, status)
      VALUES (?, ?, ?)
    `).bind(1211, 101, 'approved').run();

    const response = await app.request('/exam-schedules/1212/students', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_ids: [101],
        force: true,
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.results?.[0]?.status).toBe('success');

    const oldReg = await env.DB.prepare(`
      SELECT status FROM exam_registrations WHERE exam_id = ? AND student_id = ?
    `).bind(1211, 101).first<{ status: string }>();
    const newReg = await env.DB.prepare(`
      SELECT status FROM exam_registrations WHERE exam_id = ? AND student_id = ?
    `).bind(1212, 101).first<{ status: string }>();

    expect(oldReg?.status).toBe('cancelled');
    expect(newReg?.status).toBe('approved');
  });
});
