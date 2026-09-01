import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { ensureSeedProgramPlatform } from '../../lib/program-platform/repository.js';

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
}

async function cleanDatabase() {
  await env.DB.prepare('DELETE FROM program_levels').run();
  await env.DB.prepare('DELETE FROM programs').run();
  await env.DB.prepare('DELETE FROM program_organizers').run();
}

describe('ensureSeedProgramPlatform (PTIT / Tin học)', () => {
  beforeEach(async () => {
    await setupDatabase();
    await cleanDatabase();
  });

  it('seeds the PTIT organizer with source_site=edu', async () => {
    await ensureSeedProgramPlatform(env.DB);

    const row = await env.DB.prepare(
      'SELECT name, code, source_site FROM program_organizers WHERE code = ?'
    ).bind('PTIT').first<{ name: string; code: string; source_site: string }>();

    expect(row).toBeTruthy();
    expect(row?.name).toBe('Học viện PTIT');
    expect(row?.code).toBe('PTIT');
    expect(row?.source_site).toBe('edu');
  });

  it('seeds the TIN_HOC program under PTIT', async () => {
    await ensureSeedProgramPlatform(env.DB);

    const row = await env.DB.prepare(
      `
        SELECT p.code AS program_code, p.name AS program_name, o.code AS organizer_code
        FROM programs p
        JOIN program_organizers o ON o.uuid = p.organizer_uuid
        WHERE o.code = 'PTIT' AND p.code = 'TIN_HOC'
      `
    ).first<{ program_code: string; program_name: string; organizer_code: string }>();

    expect(row).toBeTruthy();
    expect(row?.program_code).toBe('TIN_HOC');
    expect(row?.program_name).toBe('Tin học');
    expect(row?.organizer_code).toBe('PTIT');
  });

  it('seeds the PTIT TIN_HOC levels (Modul 1-6 + MOS)', async () => {
    await ensureSeedProgramPlatform(env.DB);

    const rows = await env.DB.prepare(
      `
        SELECT l.code, l.name, l.sort_order
        FROM program_levels l
        JOIN programs p ON p.uuid = l.program_uuid
        JOIN program_organizers o ON o.uuid = p.organizer_uuid
        WHERE o.code = 'PTIT' AND p.code = 'TIN_HOC'
        ORDER BY l.sort_order ASC
      `
    ).all<{ code: string; name: string; sort_order: number }>();

    const codes = (rows.results || []).map((r) => r.code);
    expect(codes).toEqual(['MODUL1', 'MODUL2', 'MODUL3', 'MODUL4', 'MODUL5', 'MODUL6', 'MOS']);

    const mos = (rows.results || []).find((r) => r.code === 'MOS');
    expect(mos?.name).toBe('PTIT MOS');
  });

  it('runs idempotently without duplicating rows', async () => {
    await ensureSeedProgramPlatform(env.DB);
    await ensureSeedProgramPlatform(env.DB);

    const organizerCount = await env.DB.prepare(
      'SELECT COUNT(*) AS c FROM program_organizers WHERE code = ?'
    ).bind('PTIT').first<{ c: number }>();

    const programCount = await env.DB.prepare(
      `
        SELECT COUNT(*) AS c
        FROM programs p
        JOIN program_organizers o ON o.uuid = p.organizer_uuid
        WHERE o.code = 'PTIT' AND p.code = 'TIN_HOC'
      `
    ).first<{ c: number }>();

    const levelCount = await env.DB.prepare(
      `
        SELECT COUNT(*) AS c
        FROM program_levels l
        JOIN programs p ON p.uuid = l.program_uuid
        JOIN program_organizers o ON o.uuid = p.organizer_uuid
        WHERE o.code = 'PTIT' AND p.code = 'TIN_HOC'
      `
    ).first<{ c: number }>();

    expect(organizerCount?.c).toBe(1);
    expect(programCount?.c).toBe(1);
    expect(levelCount?.c).toBe(7);
  });
});
