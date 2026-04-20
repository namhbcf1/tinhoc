import { describe, expect, it, vi } from 'vitest';
import { exportDatabaseToJSON, listDatabaseTables } from '../../utils/backup.js';

type MockResultRow = Record<string, unknown>;

function createMockDb() {
  return {
    prepare: vi.fn((sql: string) => ({
      all: vi.fn(async () => {
        if (sql.includes('FROM sqlite_master')) {
          return {
            results: [
              { name: 'students', sql: 'CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT)' },
              { name: 'auth_sessions', sql: 'CREATE TABLE auth_sessions (sid TEXT PRIMARY KEY, user_id INTEGER)' },
              { name: 'sqlite_sequence', sql: null },
            ],
          };
        }

        if (sql.includes('FROM "students"')) {
          return {
            results: [
              { id: 1, name: 'Nguyen Van A' },
            ] satisfies MockResultRow[],
          };
        }

        if (sql.includes('FROM "auth_sessions"')) {
          return {
            results: [
              { sid: 'sid-1', user_id: 1 },
            ] satisfies MockResultRow[],
          };
        }

        if (sql.includes('FROM "sqlite_sequence"')) {
          return {
            results: [
              { name: 'students', seq: 10 },
            ] satisfies MockResultRow[],
          };
        }

        throw new Error(`Unexpected SQL in mock DB: ${sql}`);
      }),
    })),
  } as unknown as D1Database;
}

describe('backup utilities', () => {
  it('discovers live tables dynamically from sqlite_master', async () => {
    const db = createMockDb();

    const tables = await listDatabaseTables(db);

    expect(tables.map((table) => table.name)).toEqual([
      'students',
      'auth_sessions',
      'sqlite_sequence',
    ]);
    expect(tables[0]?.schema).toContain('CREATE TABLE students');
  });

  it('exports all discovered tables with schemas and order metadata', async () => {
    const db = createMockDb();

    const json = await exportDatabaseToJSON(db);
    const backup = JSON.parse(json) as {
      version: string;
      table_order: string[];
      table_schemas: Record<string, string | null>;
      tables: Record<string, MockResultRow[]>;
    };

    expect(backup.version).toBe('2.0');
    expect(backup.table_order).toEqual([
      'students',
      'auth_sessions',
      'sqlite_sequence',
    ]);
    expect(backup.table_schemas.students).toContain('CREATE TABLE students');
    expect(backup.table_schemas.sqlite_sequence).toBeNull();
    expect(backup.tables.students).toEqual([{ id: 1, name: 'Nguyen Van A' }]);
    expect(backup.tables.auth_sessions).toEqual([{ sid: 'sid-1', user_id: 1 }]);
    expect(backup.tables.sqlite_sequence).toEqual([{ name: 'students', seq: 10 }]);
  });
});
