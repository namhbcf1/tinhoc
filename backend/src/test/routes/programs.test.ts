import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import programs from '../../routes/programs.js';
import programLevels from '../../routes/program-levels.js';

function createTestApp(user: Record<string, unknown>) {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.env = {
      DB: env.DB,
      JWT_SECRET: 'test-secret-key',
    } as any;
    c.set('user', user as any);
    await next();
  });

  app.route('/programs', programs);
  app.route('/program-levels', programLevels);
  return app;
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
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_uuid) REFERENCES program_organizers(uuid),
      UNIQUE (organizer_uuid, code)
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
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (program_uuid) REFERENCES programs(uuid),
      UNIQUE (program_uuid, code)
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS sync_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_uuid TEXT NOT NULL UNIQUE,
      entity_type TEXT NOT NULL,
      entity_uuid TEXT NOT NULL,
      action TEXT NOT NULL,
      source_site TEXT NOT NULL,
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      payload_json TEXT
    )
  `).run();
}

async function cleanDatabase() {
  await env.DB.prepare('DELETE FROM sync_events').run();
  await env.DB.prepare('DELETE FROM program_levels').run();
  await env.DB.prepare('DELETE FROM programs').run();
  await env.DB.prepare('DELETE FROM program_organizers').run();
}

async function insertOrganizer() {
  await env.DB.prepare(`
    INSERT INTO program_organizers (
      uuid, name, code, description, is_active, source_site, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(
    'org-ptit',
    'PTIT',
    'PTIT',
    'Hoc vien Cong nghe Buu chinh Vien thong',
    1,
    'edu'
  ).run();
}

describe('programs routes', () => {
  beforeEach(async () => {
    await setupDatabase();
    await cleanDatabase();
    await insertOrganizer();
  });

  it('creates a training-first program and returns capability fields', async () => {
    const app = createTestApp({ id: 7, role: 'admin' });

    const createResponse = await app.request('/programs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizer_uuid: 'org-ptit',
        name: 'Ky nang song',
        code: 'KNS',
        delivery_mode: 'internal_training',
        assessment_mode: 'none',
        certificate_enabled: true,
        schedule_model: 'session_based',
        training_enabled: true,
        linked_class_enabled: true,
      }),
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();

    expect(created.success).toBe(true);
    expect(created.data.assessmentMode).toBe('none');
    expect(created.data.certificateEnabled).toBe(true);
    expect(created.data.scheduleModel).toBe('session_based');
    expect(created.data.hasLevels).toBe(false);

    const listResponse = await app.request('/programs?includeInactive=1');
    expect(listResponse.status).toBe(200);

    const listed = await listResponse.json();
    const item = listed.data.find((program: any) => program.code === 'KNS');

    expect(item).toBeTruthy();
    expect(item.assessmentMode).toBe('none');
    expect(item.certificateEnabled).toBe(true);
    expect(item.scheduleModel).toBe('session_based');
    expect(item.hasLevels).toBe(false);
  });

  it('reports hasLevels=true when the program has at least one level', async () => {
    const app = createTestApp({ id: 7, role: 'admin' });

    const programResponse = await app.request('/programs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizer_uuid: 'org-ptit',
        name: 'Tieng Anh',
        code: 'TA',
        delivery_mode: 'internal_training',
        assessment_mode: 'official_exam',
        certificate_enabled: true,
        schedule_model: 'session_based',
      }),
    });

    const programPayload = await programResponse.json();
    const programUuid = programPayload.data.uuid;

    const levelResponse = await app.request('/program-levels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        program_uuid: programUuid,
        name: 'A1',
        code: 'A1',
        sort_order: 1,
      }),
    });

    expect(levelResponse.status).toBe(201);

    const listResponse = await app.request('/programs?includeInactive=1');
    const listed = await listResponse.json();
    const item = listed.data.find((program: any) => program.uuid === programUuid);

    expect(item).toBeTruthy();
    expect(item.hasLevels).toBe(true);
    expect(item.assessmentMode).toBe('official_exam');
  });
});
