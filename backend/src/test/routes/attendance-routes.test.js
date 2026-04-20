import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import attendanceRouter from '../../routes/attendance.js';
import { authMiddleware } from '../../middleware/auth-middleware.js';
import { generateJWT } from '../../utils/helpers.js';
const JWT_SECRET = 'test-secret-key-for-vitest';
let app;
async function createSchema() {
    const db = env.DB;
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cccd TEXT,
      ho_ten_full TEXT,
      email TEXT
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      status TEXT
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      attendance_date DATE NOT NULL,
      status TEXT,
      notes TEXT,
      marked_by INTEGER,
      marked_by_role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(registration_id, class_id, attendance_date)
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      teacher_name TEXT,
      source_kind TEXT,
      status TEXT DEFAULT 'active',
      deleted_at DATETIME
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      session_date DATE,
      start_time TEXT,
      end_time TEXT,
      note TEXT
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT,
      note TEXT,
      checked_in_at DATETIME,
      zoom_join_source TEXT
    )
  `).run();
}
async function resetData() {
    const db = env.DB;
    await db.prepare('DELETE FROM online_class_attendance').run();
    await db.prepare('DELETE FROM online_class_sessions').run();
    await db.prepare('DELETE FROM online_class_enrollments').run();
    await db.prepare('DELETE FROM online_classes').run();
    await db.prepare('DELETE FROM attendance').run();
    await db.prepare('DELETE FROM registrations').run();
    await db.prepare('DELETE FROM students').run();
}
async function seedAttendanceFixtures() {
    const db = env.DB;
    await db.prepare(`
    INSERT INTO students (id, cccd, ho_ten_full, email)
    VALUES
      (1, '001', 'Nguyen Van A', 'a@example.com'),
      (2, '002', 'Tran Thi B', 'b@example.com')
  `).run();
    await db.prepare(`
    INSERT INTO registrations (id, student_id, class_id, status)
    VALUES
      (101, 1, 9, 'approved'),
      (102, 2, 9, 'approved')
  `).run();
    await db.prepare(`
    INSERT INTO attendance (registration_id, class_id, attendance_date, status, marked_by, marked_by_role)
    VALUES
      (101, 9, '2026-03-30', 'present', 99, 'admin'),
      (102, 9, '2026-03-30', 'absent', 99, 'admin')
  `).run();
    await db.prepare(`
    INSERT INTO online_classes (id, class_name, teacher_name, source_kind, status)
    VALUES
      (21, 'Lớp Zoom B1', 'Co Lan', 'manual', 'active'),
      (22, 'Lớp Meet B2', 'Thay Minh', 'exam_schedule', 'active')
  `).run();
    await db.prepare(`
    INSERT INTO online_class_enrollments (online_class_id, student_id, status)
    VALUES
      (21, 1, 'active'),
      (22, 1, 'active'),
      (21, 2, 'active')
  `).run();
    await db.prepare(`
    INSERT INTO online_class_sessions (id, online_class_id, session_date, start_time, end_time, note)
    VALUES
      (501, 21, '2026-03-30', '19:00', '21:00', 'Buổi Zoom chính'),
      (502, 22, '2026-03-29', '18:00', '20:00', 'Buổi Meet'),
      (503, 21, '2026-03-28', '19:00', '21:00', 'Buổi cũ')
  `).run();
    await db.prepare(`
    INSERT INTO online_class_attendance (session_id, student_id, status, note, checked_in_at, zoom_join_source)
    VALUES
      (501, 1, 'present', 'Đã vào lớp', '2026-03-30T12:01:00.000Z', 'zoom_click'),
      (502, 1, 'late', 'Vào qua Meet', '2026-03-29T11:05:00.000Z', 'meet_click'),
      (501, 2, 'absent', NULL, NULL, NULL)
  `).run();
}
async function buildToken(payload) {
    return generateJWT(payload, JWT_SECRET);
}
beforeAll(async () => {
    await createSchema();
    app = new Hono();
    app.use('*', async (c, next) => {
        c.env = {
            DB: env.DB,
            JWT_SECRET,
        };
        await next();
    });
    app.use('/attendance/*', authMiddleware);
    app.route('/attendance', attendanceRouter);
});
afterEach(async () => {
    await resetData();
});
describe('Attendance Router', () => {
    it('returns 400 instead of fake success when batch payload is invalid', async () => {
        const token = await buildToken({
            id: 99,
            role: 'admin',
            type: 'admin',
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const res = await app.fetch(new Request('http://localhost/attendance/batch', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: [
                    {
                        student_id: 1,
                        class_id: 9,
                        date: '2026-03-30',
                        status: 'present',
                    },
                ],
            }),
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.data.error_count).toBe(1);
    });
    it('blocks students from reading class attendance', async () => {
        await seedAttendanceFixtures();
        const token = await buildToken({
            id: 1,
            role: 'student',
            type: 'student',
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const res = await app.fetch(new Request('http://localhost/attendance/class/9', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }));
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toBe('Không có quyền xem danh sách điểm danh lớp');
    });
    it('allows a student to read only their own registration attendance', async () => {
        await seedAttendanceFixtures();
        const token = await buildToken({
            id: 1,
            role: 'student',
            type: 'student',
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const ownRes = await app.fetch(new Request('http://localhost/attendance/registration/101', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }));
        expect(ownRes.status).toBe(200);
        const ownJson = await ownRes.json();
        expect(Array.isArray(ownJson.data)).toBe(true);
        expect(ownJson.data).toHaveLength(1);
        const otherRes = await app.fetch(new Request('http://localhost/attendance/registration/102', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }));
        expect(otherRes.status).toBe(403);
        const otherJson = await otherRes.json();
        expect(otherJson.error).toBe('Không có quyền xem điểm danh này');
    });
    it('allows a student to read only their own online attendance summary', async () => {
        await seedAttendanceFixtures();
        const token = await buildToken({
            id: 1,
            role: 'student',
            type: 'student',
            exp: Math.floor(Date.now() / 1000) + 3600,
        });
        const ownRes = await app.fetch(new Request('http://localhost/attendance/student/1/online', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }));
        expect(ownRes.status).toBe(200);
        const ownJson = await ownRes.json();
        expect(Array.isArray(ownJson.data)).toBe(true);
        expect(ownJson.data).toHaveLength(2);
        const onlineRecords = ownJson.data.flatMap((item) => item.records || []);
        expect(onlineRecords).toContainEqual(expect.objectContaining({
            status: 'late',
            join_source: 'meet_click',
        }));
        const otherRes = await app.fetch(new Request('http://localhost/attendance/student/2/online', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }));
        expect(otherRes.status).toBe(403);
        const otherJson = await otherRes.json();
        expect(otherJson.error).toBe('Không có quyền xem điểm danh online này');
    });
});
