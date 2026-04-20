/**
 * Test suite: Online Classes - Endpoints (GET/POST)
 * KHÔNG dùng vi.mock(). Dùng DB thật + JWT thật từ cloudflare:test env.
 * Mọi HTTP request đều đi qua app.fetch() với env.DB thật.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import { generateJWT } from '../../utils/helpers.js';
import { setupDatabase, cleanDatabase, createTestApp } from './online-classes-test-setup.js';
const JWT_SECRET = 'test-secret-key-for-vitest';
let app;
beforeAll(async () => {
    await setupDatabase();
    app = createTestApp();
});
afterEach(async () => {
    await cleanDatabase();
});
// ─── Helper: tạo JWT admin thật ─────────────────────────────────────────────
async function makeAdminToken(id = 99) {
    return generateJWT({ id, role: 'admin', exp: Date.now() + 3_600_000 }, JWT_SECRET);
}
async function makeStudentToken(id) {
    return generateJWT({ id, role: 'student', type: 'student', exp: Date.now() + 3_600_000 }, JWT_SECRET);
}
// ─── Helper: chèn class thật vào DB ─────────────────────────────────────────
async function insertTestClass(overrides = {}) {
    const db = env.DB;
    const result = await db.prepare(`
    INSERT INTO online_classes
      (class_name, schedule_rule, schedule_time, start_date, status, max_students)
    VALUES (?, ?, ?, ?, 'active', 50)
  `).bind(overrides.class_name ?? 'Lớp Test Thật', overrides.schedule_rule ?? 'WEEKLY:2', overrides.schedule_time ?? '19:00-21:00', overrides.start_date ?? '2026-03-01').run();
    return result.meta.last_row_id;
}
// ─── Helper: chèn student thật vào DB ───────────────────────────────────────
async function insertTestStudent(cccd = '123456789012') {
    const db = env.DB;
    const result = await db.prepare(`
    INSERT INTO students (cccd, ho_ten_full) VALUES (?, ?)
  `).bind(cccd, 'Nguyễn Văn Test').run();
    return result.meta.last_row_id;
}
// ─── GET /online-classes ─────────────────────────────────────────────────────
describe('GET /online-classes (getClassList)', () => {
    it('nên trả về 200 và danh sách rỗng khi không có lớp', async () => {
        const res = await app.fetch(new Request('http://localhost/online-classes'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        // Service trả về { classes, pagination }
        expect(Array.isArray(json.data.classes)).toBe(true);
        expect(json.data.classes).toHaveLength(0);
    });
    it('nên trả về 200 và 1 lớp sau khi insert thật vào DB', async () => {
        await insertTestClass({ class_name: 'Lớp Python Nâng Cao' });
        const res = await app.fetch(new Request('http://localhost/online-classes'));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.classes).toHaveLength(1);
        expect(json.data.classes[0].class_name).toBe('Lớp Python Nâng Cao');
    });
    it('nên ẩn meet_link với anonymous user', async () => {
        await insertTestClass({ class_name: 'Lớp Bí Mật' });
        // Insert meet_link trực tiếp vào DB
        await env.DB.prepare(`UPDATE online_classes SET meet_link = 'https://meet.google.com/secret' WHERE class_name = ?`).bind('Lớp Bí Mật').run();
        const res = await app.fetch(new Request('http://localhost/online-classes'));
        expect(res.status).toBe(200);
        const json = await res.json();
        const cls = json.data.classes[0];
        // Anonymous user không được thấy meet_link
        expect(cls.meet_link).toBeNull();
    });
});
// ─── GET /online-classes/:id ─────────────────────────────────────────────────
describe('GET /online-classes/:id (getClassDetail)', () => {
    it('nên trả về 404 nếu không tìm thấy lớp học', async () => {
        const res = await app.fetch(new Request('http://localhost/online-classes/99999'));
        expect(res.status).toBe(404);
        const json = await res.json();
        // helpers.errorResponse trả về { error: message }
        expect(json.error).toBe('Không tìm thấy lớp học');
    });
    it('nên trả về 200 với thông tin chi tiết lớp học thật', async () => {
        const classId = await insertTestClass({ class_name: 'Lớp Chi Tiết' });
        const res = await app.fetch(new Request(`http://localhost/online-classes/${classId}`));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.class_name).toBe('Lớp Chi Tiết');
        expect(json.data.id).toBe(classId);
    });
});
// ─── POST /online-classes ────────────────────────────────────────────────────
describe('GET /online-classes/my-enrolled', () => {
    it('nên trả về lớp active của học viên mà không phụ thuộc cột deleted_at', async () => {
        const classId = await insertTestClass({ class_name: 'Lớp My Enrolled' });
        const studentId = await insertTestStudent('555555555555');
        const studentToken = await makeStudentToken(studentId);
        const today = new Date().toISOString().slice(0, 10);
        await env.DB.prepare(`
      INSERT INTO online_class_enrollments (online_class_id, student_id, status)
      VALUES (?, ?, 'active')
    `).bind(classId, studentId).run();
        await env.DB.prepare(`
      INSERT INTO online_class_sessions (online_class_id, session_date, start_time, end_time)
      VALUES (?, ?, '19:00', '21:00')
    `).bind(classId, today).run();
        const res = await app.fetch(new Request('http://localhost/online-classes/my-enrolled', {
            headers: {
                Authorization: `Bearer ${studentToken}`
            }
        }));
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data).toHaveLength(1);
        expect(json.data[0].class_name).toBe('Lớp My Enrolled');
        expect(json.data[0].today_session_date).toBe(today);
    });
});
describe('POST /online-classes (createClass)', () => {
    it('nên tạo lớp thành công với quyền admin (201)', async () => {
        const adminToken = await makeAdminToken();
        const res = await app.fetch(new Request('http://localhost/online-classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                class_name: 'Lớp Mới Tạo Thật',
                schedule_rule: 'WEEKLY:3',
                schedule_time: '19:00-21:00',
                start_date: '2026-04-01'
            })
        }));
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.class.class_name).toBe('Lớp Mới Tạo Thật');
        expect(typeof json.data.class.id).toBe('number');
        // Xác nhận lớp thực sự có trong DB
        const row = await env.DB.prepare('SELECT id, class_name FROM online_classes WHERE class_name = ?').bind('Lớp Mới Tạo Thật').first();
        expect(row).not.toBeNull();
        expect(row.class_name).toBe('Lớp Mới Tạo Thật');
    });
    it('nên trả về 400 khi thiếu trường bắt buộc', async () => {
        const adminToken = await makeAdminToken();
        const res = await app.fetch(new Request('http://localhost/online-classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({ class_name: 'Thiếu Thông Tin' })
            // Thiếu schedule_rule, schedule_time, start_date
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Thiếu thông tin bắt buộc');
    });
    it('nên trả về 400 khi schedule_time sai định dạng', async () => {
        const adminToken = await makeAdminToken();
        const res = await app.fetch(new Request('http://localhost/online-classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                class_name: 'Lớp Sai Giờ',
                schedule_rule: 'WEEKLY:2',
                schedule_time: '7h-9h', // Sai định dạng
                start_date: '2026-04-01'
            })
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('HH:MM-HH:MM');
    });
    it('nên từ chối tạo lớp khi không có token (401)', async () => {
        const res = await app.fetch(new Request('http://localhost/online-classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_name: 'Không Auth' })
        }));
        expect(res.status).toBe(401);
    });
});
// ─── POST /online-classes/:id/enroll ────────────────────────────────────────
describe('POST /online-classes/:id/enroll (enrollStudent)', () => {
    it('nên chặn khi không có CCCD và không có JWT (401)', async () => {
        const res = await app.fetch(new Request('http://localhost/online-classes/1/enroll', {
            method: 'POST'
        }));
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain('Vui lòng đăng nhập với CCCD để đăng ký lớp');
    });
    it('nên đăng ký thành công học viên với header X-Student-CCCD thật', async () => {
        // Chuẩn bị: tạo lớp và student thật trong DB
        const classId = await insertTestClass({ class_name: 'Lớp Đăng Ký Test' });
        await insertTestStudent('098765432100');
        const res = await app.fetch(new Request(`http://localhost/online-classes/${classId}/enroll`, {
            method: 'POST',
            headers: { 'X-Student-CCCD': '098765432100' }
        }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.message).toContain('Đăng ký thành công');
        expect(json.data.status).toBe('pending');
        // Xác nhận enrollment thực sự có trong DB
        const enrollment = await env.DB.prepare(`SELECT status FROM online_class_enrollments WHERE online_class_id = ?`).bind(classId).first();
        expect(enrollment).not.toBeNull();
        expect(enrollment.status).toBe('pending');
    });
    it('nên trả về 401 khi CCCD không tồn tại trong DB', async () => {
        const classId = await insertTestClass();
        const res = await app.fetch(new Request(`http://localhost/online-classes/${classId}/enroll`, {
            method: 'POST',
            headers: { 'X-Student-CCCD': '000000000000' } // CCCD không có trong DB
        }));
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain('Vui lòng đăng nhập với CCCD để đăng ký lớp');
    });
    it('nên trả về 400 khi lớp đã hết chỗ', async () => {
        // Tạo lớp với max_students = 1
        const db = env.DB;
        const classResult = await db.prepare(`
      INSERT INTO online_classes
        (class_name, schedule_rule, schedule_time, start_date, status, max_students)
      VALUES ('Lớp Đầy', 'WEEKLY:1', '08:00-10:00', '2026-04-01', 'active', 1)
    `).run();
        const classId = classResult.meta.last_row_id;
        // Tạo 2 student và đăng ký student 1 (đã full)
        const s1Id = await insertTestStudent('111111111111');
        const s2Id = await insertTestStudent('222222222222');
        // Insert enrollment active trực tiếp để fill slot
        await db.prepare(`INSERT INTO online_class_enrollments (online_class_id, student_id, status) VALUES (?, ?, 'active')`).bind(classId, s1Id).run();
        // Student 2 cố đăng ký — phải bị từ chối
        const res = await app.fetch(new Request(`http://localhost/online-classes/${classId}/enroll`, {
            method: 'POST',
            headers: { 'X-Student-CCCD': '222222222222' }
        }));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('đủ số lượng');
    });
});
// ─── GET /online-classes/:id/available-students ──────────────────────────────
describe('GET /online-classes/:id/available-students (admin only)', () => {
    it('nên trả về danh sách students chưa đăng ký', async () => {
        const classId = await insertTestClass();
        await insertTestStudent('300000000001');
        await insertTestStudent('300000000002');
        const adminToken = await makeAdminToken();
        const res = await app.fetch(new Request(`http://localhost/online-classes/${classId}/available-students`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.count).toBe(2);
        expect(Array.isArray(json.data.data)).toBe(true);
    });
    it('nên trả về 404 nếu lớp không tồn tại', async () => {
        const adminToken = await makeAdminToken();
        const res = await app.fetch(new Request('http://localhost/online-classes/99999/available-students', {
            headers: { Authorization: `Bearer ${adminToken}` }
        }));
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe('Không tìm thấy lớp học');
    });
});
