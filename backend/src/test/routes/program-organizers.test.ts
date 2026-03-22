import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import programOrganizers from '../../routes/program-organizers.js';

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

  app.route('/program-organizers', programOrganizers);
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
  await env.DB.prepare('DELETE FROM program_organizers').run();
}

describe('program-organizers routes', () => {
  beforeEach(async () => {
    await setupDatabase();
    await cleanDatabase();
  });

  it('accepts admin JWT payloads that only expose role', async () => {
    const app = createTestApp({ id: 7, role: 'admin' });

    const response = await app.request('/program-organizers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'PTIT',
        code: 'PTIT',
        description: 'Hoc vien Cong nghe Buu chinh Vien thong',
      }),
    });

    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('PTIT');
    expect(json.data.code).toBe('PTIT');

    const row = await env.DB.prepare(
      'SELECT name, code, source_site, updated_by FROM program_organizers WHERE code = ?'
    ).bind('PTIT').first<{ name: string; code: string; source_site: string; updated_by: number | null }>();

    expect(row?.name).toBe('PTIT');
    expect(row?.code).toBe('PTIT');
    expect(row?.source_site).toBe('edu');
    expect(row?.updated_by).toBe(7);
  });

  it('returns a friendly duplicate-code error', async () => {
    const app = createTestApp({ id: 7, role: 'admin' });

    await env.DB.prepare(
      `
        INSERT INTO program_organizers (
          uuid, name, code, description, is_active, source_site, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
    ).bind(
      'existing-organizer-uuid',
      'PTIT',
      'PTIT',
      'Existing organizer',
      1,
      'edu'
    ).run();

    const response = await app.request('/program-organizers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'PTIT duplicate',
        code: 'PTIT',
      }),
    });

    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe('Mã đơn vị đã tồn tại');
  });
});
