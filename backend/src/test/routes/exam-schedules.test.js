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
        };
        await next();
    });
    app.route('/exam-schedules', examSchedules);
    return app;
}
async function createAdminToken() {
    return generateJWT({
        id: 1,
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }, JWT_SECRET);
}
async function createLegacyTeacherToken() {
    return generateJWT({
        id: 9,
        role: 'teacher',
        teacher_code: 'GV001',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }, JWT_SECRET);
}
async function createStudentToken(studentId = 101) {
    return generateJWT({
        id: studentId,
        type: 'student',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }, JWT_SECRET);
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
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY,
      full_name TEXT
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
      google_map_url TEXT,
      notes TEXT,
      template_id INTEGER,
      zoom_link TEXT,
      zoom_link_backup TEXT,
      zoom_link_backup_2 TEXT,
      zoom_link_backup_3 TEXT,
      zoom_meeting_id TEXT,
      zoom_passcode TEXT,
      zoom_meeting_id_backup TEXT,
      zoom_passcode_backup TEXT,
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
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_at TEXT,
      approved_by INTEGER,
      rejection_reason TEXT,
      UNIQUE (online_class_id, student_id)
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      session_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      note TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (online_class_id, session_date)
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT,
      note TEXT,
      checked_in_at TEXT,
      marked_by INTEGER,
      marked_by_role TEXT,
      zoom_join_source TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (session_id, student_id)
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY,
      ho TEXT,
      ten_dem TEXT,
      ten TEXT,
      ho_ten_full TEXT,
      ngay_sinh TEXT,
      gioi_tinh TEXT,
      dan_toc TEXT,
      cccd TEXT,
      sdt TEXT,
      email TEXT,
      dia_chi TEXT,
      noi_sinh TEXT,
      ngay_cap_cccd TEXT,
      don_vi_cong_tac TEXT,
      image_3x4 TEXT,
      photo_3x4_image_id INTEGER,
      image_cccd_front TEXT,
      cccd_front_image_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}
async function cleanDatabase() {
    await env.DB.prepare('DELETE FROM online_class_attendance').run();
    await env.DB.prepare('DELETE FROM online_class_sessions').run();
    await env.DB.prepare('DELETE FROM online_class_enrollments').run();
    await env.DB.prepare('DELETE FROM online_classes').run();
    await env.DB.prepare('DELETE FROM exam_registrations').run();
    await env.DB.prepare('DELETE FROM exam_schedules').run();
    await env.DB.prepare('DELETE FROM students').run();
    await env.DB.prepare('DELETE FROM admins').run();
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
  `).bind('program-tinhoc', 'org-ptit', 'Tin hoc PTIT', 'TH-PTIT', 'internal_training', 1, 1, 1, 1, 1, 'official_exam', 'session_based').run();
    await env.DB.prepare(`
    INSERT INTO programs (
      uuid, organizer_uuid, name, code, delivery_mode,
      linked_class_enabled, visible_on_exam_teacher, visible_on_exam_student,
      legacy_exam_category_id, legacy_exam_type_id, assessment_mode, schedule_model
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind('program-vept', 'org-eduglobal', 'VEPT', 'VEPT', 'external_redirect', 0, 1, 1, 2, 2, 'official_exam', 'session_based').run();
    await env.DB.prepare(`
    INSERT INTO programs (
      uuid, organizer_uuid, name, code, delivery_mode,
      linked_class_enabled, visible_on_exam_teacher, visible_on_exam_student,
      legacy_exam_category_id, legacy_exam_type_id, assessment_mode, schedule_model
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind('program-th-edu', 'org-eduglobal', 'Tin hoc Edu Global', 'TH-EDU', 'internal_training', 1, 1, 1, 1, 1, 'official_exam', 'session_based').run();
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
  `).bind('Tin hoc PTIT 22/03/2026', '2026-03-22 09:00:00', 120, 'Tin hoc co ban', 1, 1, 'org-ptit', 'program-tinhoc').run();
    return Number(result.meta.last_row_id);
}
async function insertStudent(studentId, fullName, cccd) {
    await env.DB.prepare(`
    INSERT INTO students (id, ho_ten_full, cccd)
    VALUES (?, ?, ?)
  `).bind(studentId, fullName, cccd).run();
}
async function insertLinkedExamScheduleForAttendanceWindow() {
    const result = await env.DB.prepare(`
    INSERT INTO exam_schedules (
      exam_name,
      exam_date,
      duration_minutes,
      exam_type,
      exam_category_id,
      exam_type_id,
      organizer_uuid,
      program_uuid,
      class_seed_name,
      class_seed_schedule_rule,
      class_seed_schedule_time,
      class_seed_start_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind('TOEFL ITP A2 HCM G8', '2026-04-10 07:00:00', 240, 'Tin hoc co ban', 1, 1, 'org-ptit', 'program-tinhoc', 'TOEFL ITP A2 HCM G8 - Lớp ôn tập', 'DAILY', '07:00-11:00', '2026-04-02').run();
    return Number(result.meta.last_row_id);
}
async function insertApprovedExamRegistration(examId, studentId, createdAt) {
    await env.DB.prepare(`
    INSERT INTO exam_registrations (exam_id, student_id, status, created_at, approved_at)
    VALUES (?, ?, 'approved', ?, ?)
  `).bind(examId, studentId, createdAt, createdAt).run();
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
                google_map_url: 'https://maps.app.goo.gl/test-location',
                organizer_uuid: 'org-ptit',
                program_uuid: 'program-tinhoc',
                enable_linked_class: false,
                enable_zoom_meeting: false,
            }),
        });
        expect(response.status).toBe(201);
        const saved = await env.DB.prepare(`
      SELECT duration_minutes, class_seed_name, zoom_link, google_map_url
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Tin hoc PTIT 23/03/2026').first();
        expect(saved?.duration_minutes ?? null).toBeNull();
        expect(saved?.class_seed_name ?? null).toBeNull();
        expect(saved?.zoom_link ?? null).toBeNull();
        expect(saved?.google_map_url ?? null).toBe('https://maps.app.goo.gl/test-location');
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
    `).bind('Thi PTIT auto template').first();
        expect(saved?.template_id ?? null).toBe(1);
    });
    it('keeps only 2 Zoom links when zoom meeting is enabled', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const response = await app.request('/exam-schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'VEPT HUC 28-29/3/2026',
                exam_date: '2026-03-28T00:00:00.000Z',
                duration_minutes: 50,
                organizer_uuid: 'org-eduglobal',
                program_uuid: 'program-vept',
                enable_linked_class: false,
                enable_zoom_meeting: true,
                zoom_link: 'https://zoom.example/main',
                zoom_link_backup: 'https://zoom.example/backup-1',
                zoom_link_backup_2: 'https://zoom.example/backup-2',
                zoom_link_backup_3: 'https://zoom.example/backup-3',
                zoom_meeting_id: '111 1111 1111',
                zoom_passcode: 'main-pass',
                zoom_meeting_id_backup: '222 2222 2222',
                zoom_passcode_backup: 'backup-pass',
            }),
        });
        expect(response.status).toBe(201);
        const saved = await env.DB.prepare(`
      SELECT zoom_link, zoom_link_backup, zoom_link_backup_2, zoom_link_backup_3, zoom_meeting_id, zoom_passcode, zoom_meeting_id_backup, zoom_passcode_backup
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('VEPT HUC 28-29/3/2026').first();
        expect(saved?.zoom_link ?? null).toBe('https://zoom.example/main');
        expect(saved?.zoom_link_backup ?? null).toBe('https://zoom.example/backup-1');
        expect(saved?.zoom_link_backup_2 ?? null).toBeNull();
        expect(saved?.zoom_link_backup_3 ?? null).toBeNull();
        expect(saved?.zoom_meeting_id ?? null).toBe('111 1111 1111');
        expect(saved?.zoom_passcode ?? null).toBe('main-pass');
        expect(saved?.zoom_meeting_id_backup ?? null).toBe('222 2222 2222');
        expect(saved?.zoom_passcode_backup ?? null).toBe('backup-pass');
    });
    it('auto enables linked class seed and syncs teacher workspace class when zoom is enabled', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const response = await app.request('/exam-schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'Thi zoom auto linked class',
                exam_date: '2026-03-28T00:00:00.000Z',
                duration_minutes: 60,
                organizer_uuid: 'org-ptit',
                program_uuid: 'program-tinhoc',
                enable_linked_class: false,
                enable_zoom_meeting: true,
                zoom_link: 'https://zoom.example/main',
            }),
        });
        expect(response.status).toBe(201);
        const payload = await response.json();
        const scheduleId = Number(payload?.data?.id);
        const savedSchedule = await env.DB.prepare(`
      SELECT class_seed_name, class_seed_schedule_rule, class_seed_schedule_time, class_seed_start_date, zoom_link
      FROM exam_schedules
      WHERE id = ?
    `).bind(scheduleId).first();
        expect(savedSchedule?.zoom_link ?? null).toBe('https://zoom.example/main');
        expect(savedSchedule?.class_seed_name ?? null).toContain('Thi zoom auto linked class');
        expect(savedSchedule?.class_seed_schedule_rule ?? null).toBe('DAILY');
        expect(savedSchedule?.class_seed_schedule_time ?? null).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/);
        expect(savedSchedule?.class_seed_start_date ?? null).toBe('2026-03-28');
        const linkedClass = await env.DB.prepare(`
      SELECT id, source_exam_schedule_id, class_name
      FROM online_classes
      WHERE source_exam_schedule_id = ?
      LIMIT 1
    `).bind(scheduleId).first();
        expect(linkedClass?.id ?? null).not.toBeNull();
        expect(linkedClass?.source_exam_schedule_id ?? null).toBe(scheduleId);
        expect(linkedClass?.class_name ?? '').toContain('Thi zoom auto linked class');
    });
    it('promotes backup_2 as secondary link when first backup is empty', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const response = await app.request('/exam-schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'VEPT fallback backup link',
                exam_date: '2026-03-28T00:00:00.000Z',
                duration_minutes: 50,
                organizer_uuid: 'org-eduglobal',
                program_uuid: 'program-vept',
                enable_linked_class: false,
                enable_zoom_meeting: true,
                zoom_link: '',
                zoom_link_backup: '',
                zoom_link_backup_2: 'https://zoom.example/backup-2',
                zoom_link_backup_3: 'https://zoom.example/backup-3',
                zoom_meeting_id_backup: '333 3333 3333',
                zoom_passcode_backup: 'fallback-pass',
            }),
        });
        expect(response.status).toBe(201);
        const saved = await env.DB.prepare(`
      SELECT zoom_link, zoom_link_backup, zoom_link_backup_2, zoom_link_backup_3, zoom_meeting_id, zoom_passcode, zoom_meeting_id_backup, zoom_passcode_backup
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('VEPT fallback backup link').first();
        expect(saved?.zoom_link ?? null).toBe('https://zoom.example/backup-2');
        expect(saved?.zoom_link_backup ?? null).toBe('https://zoom.example/backup-3');
        expect(saved?.zoom_link_backup_2 ?? null).toBeNull();
        expect(saved?.zoom_link_backup_3 ?? null).toBeNull();
        expect(saved?.zoom_meeting_id ?? null).toBeNull();
        expect(saved?.zoom_passcode ?? null).toBeNull();
        expect(saved?.zoom_meeting_id_backup ?? null).toBeNull();
        expect(saved?.zoom_passcode_backup ?? null).toBeNull();
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
    `).bind('Thi VEPT auto template').first();
        expect(saved?.template_id ?? null).toBe(2);
    });
    it('prioritizes VEPT template when program is VEPT even if organizer label contains PTIT', async () => {
        await env.DB.prepare(`
      INSERT INTO programs (
        uuid, organizer_uuid, name, code, delivery_mode,
        linked_class_enabled, visible_on_exam_teacher, visible_on_exam_student,
        legacy_exam_category_id, legacy_exam_type_id, assessment_mode, schedule_model
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind('program-vept-ptit', 'org-ptit', 'VEPT PTIT', 'VEPT', 'external_redirect', 0, 1, 1, 2, 2, 'official_exam', 'session_based').run();
        const app = createTestApp();
        const token = await createAdminToken();
        const response = await app.request('/exam-schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'Thi VEPT PTIT uu tien program',
                exam_date: '2026-03-24T09:00:00.000Z',
                organizer_uuid: 'org-ptit',
                program_uuid: 'program-vept-ptit',
                enable_linked_class: false,
                enable_zoom_meeting: false,
            }),
        });
        expect(response.status).toBe(201);
        const saved = await env.DB.prepare(`
      SELECT template_id
      FROM exam_schedules
      WHERE exam_name = ?
    `).bind('Thi VEPT PTIT uu tien program').first();
        expect(saved?.template_id ?? null).toBe(2);
    });
    it('auto assigns PTIT template for tin hoc programs even when organizer is not PTIT', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const response = await app.request('/exam-schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'Thi Tin hoc Edu Global auto template',
                exam_date: '2026-03-24T09:00:00.000Z',
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
    `).bind('Thi Tin hoc Edu Global auto template').first();
        expect(saved?.template_id ?? null).toBe(1);
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
    `).bind('Thi PTIT theo ma').first();
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
    `).bind('Thi PTIT fuzzy label').first();
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
    `).bind('Thi giu template tay').first();
        expect(saved?.template_id ?? null).toBe(1);
    });
    it('auto assigns PTIT template for non-PTIT organizers when the selected program is tin hoc', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const response = await app.request('/exam-schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'Thi tin hoc auto template theo program',
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
    `).bind('Thi tin hoc auto template theo program').first();
        expect(saved?.template_id ?? null).toBe(1);
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
    `).bind(examId).first();
        expect(saved?.duration_minutes ?? null).toBeNull();
        expect(saved?.class_seed_name ?? null).toBeNull();
        expect(saved?.class_seed_schedule_rule ?? null).toBeNull();
        expect(saved?.zoom_link ?? null).toBeNull();
    });
    it('generates daily linked-class sessions from first registration date until the day before exam', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const examId = await insertLinkedExamScheduleForAttendanceWindow();
        await insertStudent(101, 'Hà Thanh Liêm', '111111111111');
        await insertApprovedExamRegistration(examId, 101, '2026-04-02 08:00:00');
        const response = await app.request('/exam-schedules/resync-classes', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        expect(response.status).toBe(200);
        const sessions = await env.DB.prepare(`
      SELECT ocs.session_date
      FROM online_class_sessions ocs
      JOIN online_classes oc ON oc.id = ocs.online_class_id
      WHERE oc.source_exam_schedule_id = ?
      ORDER BY ocs.session_date ASC
    `).bind(examId).all();
        expect((sessions.results || []).map((row) => row.session_date)).toEqual([
            '2026-04-02',
            '2026-04-03',
            '2026-04-04',
            '2026-04-05',
            '2026-04-06',
            '2026-04-07',
            '2026-04-08',
            '2026-04-09',
        ]);
    });
    it('returns expected_session_count and is_counted per student registration date', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const examId = await insertLinkedExamScheduleForAttendanceWindow();
        await insertStudent(101, 'Hà Thanh Liêm', '111111111111');
        await insertStudent(102, 'Phạm Thanh Bình', '222222222222');
        await insertApprovedExamRegistration(examId, 101, '2026-04-02 08:00:00');
        await insertApprovedExamRegistration(examId, 102, '2026-04-05 09:00:00');
        await app.request('/exam-schedules/resync-classes', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const response = await app.request(`/exam-schedules/${examId}/learning-attendance`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        expect(response.status).toBe(200);
        const payload = await response.json();
        const students = payload?.data?.students || [];
        const firstStudent = students.find((item) => Number(item.student_id) === 101);
        const secondStudent = students.find((item) => Number(item.student_id) === 102);
        expect(firstStudent?.registration_date).toBe('2026-04-02');
        expect(firstStudent?.expected_session_count).toBe(8);
        expect(firstStudent?.sessions?.[0]?.is_counted).toBe(true);
        expect(secondStudent?.registration_date).toBe('2026-04-05');
        expect(secondStudent?.expected_session_count).toBe(5);
        expect(secondStudent?.sessions?.[0]?.session_date).toBe('2026-04-02');
        expect(secondStudent?.sessions?.[0]?.is_counted).toBe(false);
        expect(secondStudent?.sessions?.[3]?.session_date).toBe('2026-04-05');
        expect(secondStudent?.sessions?.[3]?.is_counted).toBe(true);
    });
    it('blocks manual attendance updates for sessions before a student registration date', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const examId = await insertLinkedExamScheduleForAttendanceWindow();
        await insertStudent(101, 'Hà Thanh Liêm', '111111111111');
        await insertStudent(102, 'Phạm Thanh Bình', '222222222222');
        await insertApprovedExamRegistration(examId, 101, '2026-04-02 08:00:00');
        await insertApprovedExamRegistration(examId, 102, '2026-04-05 09:00:00');
        await app.request('/exam-schedules/resync-classes', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const earlySession = await env.DB.prepare(`
      SELECT ocs.id
      FROM online_class_sessions ocs
      JOIN online_classes oc ON oc.id = ocs.online_class_id
      WHERE oc.source_exam_schedule_id = ?
        AND ocs.session_date = '2026-04-02'
      LIMIT 1
    `).bind(examId).first();
        const invalidResponse = await app.request(`/exam-schedules/${examId}/learning-sessions/${earlySession?.id}/attendance/102`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: 'present' }),
        });
        expect(invalidResponse.status).toBe(400);
    });
    it('shrinks future auto sessions when removing earliest student but keeps sessions with attendance history', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const examId = await insertLinkedExamScheduleForAttendanceWindow();
        await insertStudent(101, 'Hà Thanh Liêm', '111111111111');
        await insertStudent(102, 'Phạm Thanh Bình', '222222222222');
        await insertApprovedExamRegistration(examId, 101, '2026-04-02 08:00:00');
        await insertApprovedExamRegistration(examId, 102, '2026-04-05 09:00:00');
        await app.request('/exam-schedules/resync-classes', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const linkedClass = await env.DB.prepare(`
      SELECT id
      FROM online_classes
      WHERE source_exam_schedule_id = ?
      LIMIT 1
    `).bind(examId).first();
        const firstSession = await env.DB.prepare(`
      SELECT id
      FROM online_class_sessions
      WHERE online_class_id = ?
        AND session_date = '2026-04-02'
      LIMIT 1
    `).bind(linkedClass?.id ?? null).first();
        await env.DB.prepare(`
      INSERT INTO online_class_attendance (
        session_id, student_id, status, checked_in_at, zoom_join_source
      )
      VALUES (?, ?, 'present', '2026-04-02T01:00:00.000Z', 'zoom_click')
    `).bind(firstSession?.id ?? null, 101).run();
        const response = await app.request(`/exam-schedules/${examId}/students/101`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        expect(response.status).toBe(200);
        const sessions = await env.DB.prepare(`
      SELECT ocs.session_date
      FROM online_class_sessions ocs
      JOIN online_classes oc ON oc.id = ocs.online_class_id
      WHERE oc.source_exam_schedule_id = ?
      ORDER BY ocs.session_date ASC
    `).bind(examId).all();
        expect((sessions.results || []).map((row) => row.session_date)).toEqual([
            '2026-04-02',
            '2026-04-05',
            '2026-04-06',
            '2026-04-07',
            '2026-04-08',
            '2026-04-09',
        ]);
    });
    it('clears every Zoom backup link when zoom meeting is disabled on update', async () => {
        const app = createTestApp();
        const token = await createAdminToken();
        const examId = await insertExamSchedule();
        await env.DB.prepare(`
      UPDATE exam_schedules
      SET zoom_link = ?, zoom_link_backup = ?, zoom_link_backup_2 = ?, zoom_link_backup_3 = ?
      WHERE id = ?
    `).bind('https://zoom.example/main', 'https://zoom.example/backup-1', 'https://zoom.example/backup-2', 'https://zoom.example/backup-3', examId).run();
        const response = await app.request(`/exam-schedules/${examId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                exam_name: 'Tin hoc PTIT 22/03/2026',
                exam_date: '2026-03-22T09:00:00.000Z',
                organizer_uuid: 'org-ptit',
                program_uuid: 'program-tinhoc',
                enable_linked_class: false,
                enable_zoom_meeting: false,
            }),
        });
        expect(response.status).toBe(200);
        const saved = await env.DB.prepare(`
      SELECT zoom_link, zoom_link_backup, zoom_link_backup_2, zoom_link_backup_3
      FROM exam_schedules
      WHERE id = ?
    `).bind(examId).first();
        expect(saved?.zoom_link ?? null).toBeNull();
        expect(saved?.zoom_link_backup ?? null).toBeNull();
        expect(saved?.zoom_link_backup_2 ?? null).toBeNull();
        expect(saved?.zoom_link_backup_3 ?? null).toBeNull();
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
        const blockedAvailableExam = exams.find((item) => item.id === 1102);
        const registeredExam = exams.find((item) => item.id === 1101);
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
        const availableExam = exams.find((item) => item.id === 1112);
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
    `).bind(1211, 101).first();
        const newReg = await env.DB.prepare(`
      SELECT status FROM exam_registrations WHERE exam_id = ? AND student_id = ?
    `).bind(1212, 101).first();
        expect(oldReg?.status).toBe('cancelled');
        expect(newReg?.status).toBe('approved');
    });
});
