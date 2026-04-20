import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import classes from '../../routes/classes.js';
function createTestApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.env = {
            DB: env.DB,
            JWT_SECRET: 'test-secret-key',
        };
        await next();
    });
    app.route('/classes', classes);
    return app;
}
async function setupDatabase() {
    const db = env.DB;
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_lop TEXT,
      ma_lop TEXT,
      ngay_thi TEXT NOT NULL,
      ngay_bat_dau TEXT,
      ngay_ket_thuc TEXT,
      gio_thi TEXT,
      dia_diem TEXT,
      hoc_phi INTEGER DEFAULT 0,
      open_at TEXT,
      close_at TEXT,
      status TEXT DEFAULT 'open',
      class_type TEXT DEFAULT 'hoc',
      max_students INTEGER,
      current_students INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ho_ten TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS class_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      session_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      session_type TEXT NOT NULL DEFAULT 'lesson',
      title TEXT,
      content_outline TEXT,
      period_count INTEGER,
      teacher_id INTEGER,
      room TEXT,
      meeting_link TEXT,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    )
  `).run();
}
async function cleanDatabase() {
    await env.DB.prepare('DELETE FROM class_sessions').run();
    await env.DB.prepare('DELETE FROM teachers').run();
    await env.DB.prepare('DELETE FROM classes').run();
}
async function insertClass() {
    const result = await env.DB.prepare(`
    INSERT INTO classes (
      ten_lop, ma_lop, ngay_thi, ngay_bat_dau, ngay_ket_thuc, status, class_type, max_students
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind('Lop Tin hoc K1', 'TH-K1', '2026-03-20', '2026-03-12', '2026-04-12', 'open', 'hoc', 30).run();
    return Number(result.meta.last_row_id);
}
async function insertTeacher() {
    const result = await env.DB.prepare(`
    INSERT INTO teachers (ho_ten, email)
    VALUES (?, ?)
  `).bind('Nguyen Van A', 'teacher@example.com').run();
    return Number(result.meta.last_row_id);
}
describe('class sessions routes', () => {
    beforeEach(async () => {
        await setupDatabase();
        await cleanDatabase();
    });
    it('supports CRUD for session-based schedules', async () => {
        const app = createTestApp();
        const classId = await insertClass();
        const teacherId = await insertTeacher();
        const createResponse = await app.request(`/classes/${classId}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_date: '2026-03-12',
                start_time: '18:30',
                end_time: '20:30',
                session_type: 'lesson',
                title: 'Buoi 1',
                content_outline: 'Lam quen va cai dat',
                period_count: 3,
                teacher_id: teacherId,
                room: 'P.301',
                meeting_link: 'https://meet.google.com/session-1',
                notes: 'Mang laptop',
                sort_order: 1,
            }),
        });
        expect(createResponse.status).toBe(200);
        const created = await createResponse.json();
        expect(created.success).toBe(true);
        expect(created.data.title).toBe('Buoi 1');
        expect(created.data.session_type).toBe('lesson');
        expect(created.data.teacher_id).toBe(teacherId);
        const sessionId = created.data.id;
        const listResponse = await app.request(`/classes/${classId}/sessions`);
        expect(listResponse.status).toBe(200);
        const listed = await listResponse.json();
        expect(listed.success).toBe(true);
        expect(Array.isArray(listed.data)).toBe(true);
        expect(listed.data).toHaveLength(1);
        expect(listed.data[0].session_type).toBe('lesson');
        const updateResponse = await app.request(`/classes/${classId}/sessions/${sessionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_type: 'final_assessment',
                title: 'Danh gia cuoi khoa',
                period_count: 2,
            }),
        });
        expect(updateResponse.status).toBe(200);
        const updated = await updateResponse.json();
        expect(updated.success).toBe(true);
        expect(updated.data.session_type).toBe('final_assessment');
        expect(updated.data.title).toBe('Danh gia cuoi khoa');
        expect(updated.data.period_count).toBe(2);
        const deleteResponse = await app.request(`/classes/${classId}/sessions/${sessionId}`, {
            method: 'DELETE',
        });
        expect(deleteResponse.status).toBe(200);
        const deleted = await deleteResponse.json();
        expect(deleted.success).toBe(true);
        const afterDeleteResponse = await app.request(`/classes/${classId}/sessions`);
        const afterDelete = await afterDeleteResponse.json();
        expect(afterDelete.data).toHaveLength(0);
    });
});
