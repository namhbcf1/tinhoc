import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { generateJWT } from '../../utils/helpers.js';
import studentFeedbacksRouter from '../../routes/student-feedbacks.js';
import publicStudentFeedbacksRouter from '../../routes/public-student-feedbacks.js';
const JWT_SECRET = 'test-secret-feedback';
let app;
async function setupDatabase() {
    const db = env.DB;
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cccd TEXT UNIQUE NOT NULL,
      ho_ten_full TEXT
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      schedule_time TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS student_feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      online_class_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      sentiment TEXT CHECK(sentiment IN ('positive', 'mixed', 'negative') OR sentiment IS NULL),
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'approved', 'rejected')),
      teacher_response TEXT,
      review_note_internal TEXT,
      reviewer_admin_id INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, online_class_id)
    )
  `).run();
}
async function cleanDatabase() {
    await env.DB.prepare('DELETE FROM student_feedbacks').run();
    await env.DB.prepare('DELETE FROM online_class_enrollments').run();
    await env.DB.prepare('DELETE FROM online_classes').run();
    await env.DB.prepare('DELETE FROM students').run();
    await env.DB.prepare('DELETE FROM admins').run();
}
async function makeStudentToken(studentId) {
    return generateJWT({
        id: studentId,
        role: 'student',
        type: 'student',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }, JWT_SECRET);
}
async function makeAdminToken(adminId) {
    return generateJWT({
        id: adminId,
        role: 'admin',
        type: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
    }, JWT_SECRET);
}
async function seedStudent(id, name, cccd) {
    await env.DB.prepare('INSERT INTO students (id, cccd, ho_ten_full) VALUES (?, ?, ?)')
        .bind(id, cccd, name)
        .run();
}
async function seedAdmin(id, name) {
    await env.DB.prepare('INSERT INTO admins (id, full_name) VALUES (?, ?)')
        .bind(id, name)
        .run();
}
async function seedClass(id, className) {
    await env.DB.prepare('INSERT INTO online_classes (id, class_name, start_date, schedule_time) VALUES (?, ?, ?, ?)')
        .bind(id, className, '2026-04-01', '19:00-21:00')
        .run();
}
async function seedEnrollment(classId, studentId, status = 'approved') {
    await env.DB.prepare('INSERT INTO online_class_enrollments (online_class_id, student_id, status) VALUES (?, ?, ?)')
        .bind(classId, studentId, status)
        .run();
}
beforeAll(async () => {
    await setupDatabase();
    app = new Hono();
    app.use('*', async (c, next) => {
        c.env = {
            DB: env.DB,
            JWT_SECRET,
        };
        await next();
    });
    app.route('/student-feedbacks', studentFeedbacksRouter);
    app.route('/public/student-feedbacks', publicStudentFeedbacksRouter);
});
afterEach(async () => {
    await cleanDatabase();
});
describe('student feedback routes', () => {
    it('rejects student submission for a class without eligible enrollment', async () => {
        await seedStudent(1, 'Nguyen Van A', '100000000001');
        await seedClass(11, 'Lớp VSTEP');
        const token = await makeStudentToken(1);
        const response = await app.request('/student-feedbacks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                online_class_id: 11,
                rating: 4,
                title: 'Ổn',
                content: 'Giáo viên hỗ trợ tốt.',
            }),
        });
        expect(response.status).toBe(403);
    });
    it('requires teacher_response when approving mixed or negative feedback', async () => {
        await seedAdmin(99, 'Admin A');
        await seedStudent(1, 'Nguyen Van A', '100000000001');
        await seedClass(11, 'Lớp VSTEP');
        await seedEnrollment(11, 1, 'approved');
        await env.DB.prepare(`
      INSERT INTO student_feedbacks (student_id, online_class_id, rating, title, content, status)
      VALUES (1, 11, 2, 'Cần cải thiện', 'Lịch học chưa đều', 'submitted')
    `).run();
        const adminToken = await makeAdminToken(99);
        const response = await app.request('/student-feedbacks/1/review', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                status: 'approved',
                sentiment: 'negative',
            }),
        });
        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.error).toContain('teacher_response');
    });
    it('resubmits rejected feedback back to submitted on student update', async () => {
        await seedStudent(1, 'Nguyen Van A', '100000000001');
        await seedClass(11, 'Lớp VSTEP');
        await seedEnrollment(11, 1, 'approved');
        await env.DB.prepare(`
      INSERT INTO student_feedbacks (
        id, student_id, online_class_id, rating, title, content, status, review_note_internal
      ) VALUES (1, 1, 11, 2, 'Cần cải thiện', 'Lịch học chưa đều', 'rejected', 'Bổ sung chi tiết hơn')
    `).run();
        const token = await makeStudentToken(1);
        const response = await app.request('/student-feedbacks/1', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                rating: 4,
                title: 'Đã cập nhật',
                content: 'Sau khi học thêm, trải nghiệm đã tốt hơn.',
            }),
        });
        expect(response.status).toBe(200);
        const row = await env.DB.prepare('SELECT status, review_note_internal FROM student_feedbacks WHERE id = 1').first();
        expect(row.status).toBe('submitted');
        expect(row.review_note_internal).toBeNull();
    });
    it('publishes approved feedback to the public endpoint and hides rejected ones', async () => {
        await seedAdmin(99, 'Admin A');
        await seedStudent(1, 'Nguyen Van A', '100000000001');
        await seedStudent(2, 'Nguyen Van B', '100000000002');
        await seedClass(11, 'Lớp VSTEP');
        await seedEnrollment(11, 1, 'approved');
        await seedEnrollment(11, 2, 'approved');
        await env.DB.prepare(`
      INSERT INTO student_feedbacks (
        id, student_id, online_class_id, rating, title, content, status, sentiment, teacher_response, reviewer_admin_id, reviewed_at
      ) VALUES
        (1, 1, 11, 5, 'Rất tốt', 'Khoá học rõ ràng.', 'approved', 'positive', NULL, 99, CURRENT_TIMESTAMP),
        (2, 2, 11, 2, 'Chưa ổn', 'Cần bổ sung tài liệu.', 'rejected', NULL, NULL, 99, CURRENT_TIMESTAMP)
    `).run();
        const response = await app.request('/public/student-feedbacks');
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(json.success).toBe(true);
        expect(json.data.items).toHaveLength(1);
        expect(json.data.items[0].title).toBe('Rất tốt');
        expect(json.data.items[0].student_name).not.toBe('Nguyen Van A');
    });
});
