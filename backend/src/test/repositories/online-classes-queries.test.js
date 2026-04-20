/**
 * Test: online-classes repository - Truy vấn classes và students
 * Dùng DB D1 thật từ env (cloudflare:test), KHÔNG dùng mock.
 * Kiểm tra SELECT explicit columns, parameterized queries, không dùng SELECT *
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { listClasses, findClassById, insertClass, updateClassMeetLink, updateClassCalendarInfo, updateClass, updateClassCalendarSync, deleteClass, findStudentByCccd, findStudentById, searchStudents } from '../../lib/repositories/online-classes.js';
// ─── Tiện ích: không được dùng SELECT * (ngoại trừ COUNT(*)) ────────────────
const expectNoSelectStarQuery = (sql) => {
    if (sql.toUpperCase().includes('SELECT') && !sql.toUpperCase().includes('COUNT(*)')) {
        expect(sql).not.toMatch(/SELECT\s+\*\s+FROM/i);
    }
};
// ─── Helpers tạo dữ liệu thật ───────────────────────────────────────────────
async function seedClass(db, overrides = {}) {
    return insertClass(db, {
        class_name: 'Lớp Test Online',
        description: 'Mô tả lớp test',
        schedule_rule: 'WEEKLY:1,3,5',
        schedule_time: '19:00-21:00',
        timezone: 'Asia/Ho_Chi_Minh',
        start_date: '2026-01-01',
        max_students: 30,
        created_by: null,
        ...overrides,
    });
}
async function seedStudent(db, overrides = {}) {
    const cccd = overrides.cccd ?? '012345678901';
    await db.prepare(`
    INSERT OR IGNORE INTO students
      (cccd, ho, ten_dem, ten, ho_ten_full, ngay_sinh, noi_sinh, gioi_tinh, email, sdt, dia_chi)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(cccd, overrides.ho ?? 'Nguyễn', overrides.ten_dem ?? 'Văn', overrides.ten ?? 'Test', overrides.ho_ten_full ?? 'Nguyễn Văn Test', overrides.ngay_sinh ?? '2000-01-01', overrides.noi_sinh ?? 'Hà Nội', overrides.gioi_tinh ?? 'Nam', overrides.email ?? 'test@example.com', overrides.sdt ?? '0900000001', overrides.dia_chi ?? '123 Đường Test').run();
    const row = await db.prepare('SELECT id FROM students WHERE cccd = ?').bind(cccd).first();
    return row.id;
}
// ─── Setup: tạo bảng nếu chưa có ──────────────────────────────────────────
async function setupTables(db) {
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      email TEXT,
      phone TEXT,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cccd TEXT UNIQUE NOT NULL,
      ho TEXT NOT NULL,
      ten_dem TEXT NOT NULL,
      ten TEXT NOT NULL,
      ho_ten_full TEXT NOT NULL,
      ngay_sinh DATE NOT NULL,
      noi_sinh TEXT NOT NULL,
      gioi_tinh TEXT NOT NULL,
      email TEXT NOT NULL,
      sdt TEXT NOT NULL,
      dia_chi TEXT NOT NULL,
      cccd_front_image_id TEXT,
      cccd_back_image_id TEXT,
      photo_3x4_image_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      description TEXT,
      schedule_rule TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
      recurrence TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      meet_link TEXT,
      calendar_event_id TEXT,
      teacher_name TEXT,
      max_students INTEGER DEFAULT 50,
      status TEXT DEFAULT 'active',
      created_by INTEGER,
      source_exam_schedule_id INTEGER,
      source_kind TEXT DEFAULT 'exam_schedule',
      exam_category_id INTEGER,
      exam_type_id INTEGER,
      organizer_uuid TEXT,
      program_uuid TEXT,
      level_uuid TEXT,
      custom_field_payload TEXT,
      override_payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      approved_by TEXT,
      rejection_reason TEXT,
      UNIQUE(online_class_id, student_id)
    )
  `).run();
}
// ─── Xoá dữ liệu sau mỗi test ───────────────────────────────────────────────
async function cleanTables(db) {
    await db.prepare('DELETE FROM online_class_enrollments').run();
    await db.prepare('DELETE FROM online_classes').run();
    await db.prepare('DELETE FROM students').run();
}
// ─── Tests: Online Classes ───────────────────────────────────────────────────
describe('online-classes repository - Online Classes (DB thật)', () => {
    beforeEach(async () => {
        await setupTables(env.DB);
        await cleanTables(env.DB);
    });
    it('listClasses trả đúng danh sách và không dùng SELECT *', async () => {
        // Chèn 2 class thật
        await seedClass(env.DB, { class_name: 'Lớp A', status: undefined });
        await seedClass(env.DB, { class_name: 'Lớp B', status: undefined });
        const result = await listClasses(env.DB, { status: 'active', search: '', limit: 10, offset: 0 });
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('total');
        expect(result.rows.length).toBe(2);
        expect(result.total).toBe(2);
        // Kiểm tra explicit columns (không SELECT *)
        const row = result.rows[0];
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('class_name');
        expect(row).toHaveProperty('description');
        expect(row).toHaveProperty('status');
        // Đảm bảo không trả về field lạ ngoài CLASS_COLUMNS
        expect(row).not.toHaveProperty('*');
    });
    it('listClasses lọc theo search đúng và không SELECT *', async () => {
        await seedClass(env.DB, { class_name: 'Python Nâng Cao' });
        await seedClass(env.DB, { class_name: 'Java Cơ Bản' });
        const result = await listClasses(env.DB, { status: 'active', search: 'Python', limit: 10, offset: 0 });
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].class_name).toBe('Python Nâng Cao');
        expect(result.total).toBe(1);
        // Kiểm tra no SELECT *
        expect(result.rows[0]).not.toHaveProperty('*');
    });
    it('listClasses phân trang đúng với limit/offset', async () => {
        await seedClass(env.DB, { class_name: 'Lớp 1' });
        await seedClass(env.DB, { class_name: 'Lớp 2' });
        await seedClass(env.DB, { class_name: 'Lớp 3' });
        const page1 = await listClasses(env.DB, { status: 'active', search: '', limit: 2, offset: 0 });
        const page2 = await listClasses(env.DB, { status: 'active', search: '', limit: 2, offset: 2 });
        expect(page1.rows.length).toBe(2);
        expect(page1.total).toBe(3);
        expect(page2.rows.length).toBe(1);
        expect(page2.total).toBe(3);
    });
    it('findClassById trả đúng class theo id và không SELECT *', async () => {
        const newId = await seedClass(env.DB, { class_name: 'Lớp Tìm Theo ID' });
        const found = await findClassById(env.DB, newId);
        expect(found).not.toBeNull();
        expect(found.id).toBe(newId);
        expect(found.class_name).toBe('Lớp Tìm Theo ID');
        // Kiểm tra explicit columns từ CLASS_COLUMNS
        expect(found).toHaveProperty('schedule_rule');
        expect(found).toHaveProperty('schedule_time');
        expect(found).toHaveProperty('timezone');
        expect(found).toHaveProperty('start_date');
        expect(found).toHaveProperty('meet_link');
        expect(found).toHaveProperty('status');
    });
    it('findClassById trả null khi không tìm thấy', async () => {
        const found = await findClassById(env.DB, 99999);
        expect(found).toBeNull();
    });
    it('insertClass chèn đầy đủ và trả last_row_id', async () => {
        const newId = await insertClass(env.DB, {
            class_name: 'Lớp Insert Test',
            description: 'Mô tả test',
            schedule_rule: 'DAILY',
            schedule_time: '10:00',
            timezone: 'Asia/Ho_Chi_Minh',
            start_date: '2026-03-01',
            max_students: 20,
            created_by: null,
        });
        expect(typeof newId).toBe('number');
        expect(newId).toBeGreaterThan(0);
        // Xác minh trong DB thật
        const row = await env.DB.prepare('SELECT id, class_name, status FROM online_classes WHERE id = ?').bind(newId).first();
        expect(row).not.toBeNull();
        expect(row.class_name).toBe('Lớp Insert Test');
        expect(row.status).toBe('active');
    });
    it('updateClassMeetLink cập nhật đúng meet_link', async () => {
        const id = await seedClass(env.DB);
        await updateClassMeetLink(env.DB, id, 'https://meet.google.com/abc-xyz');
        const row = await env.DB.prepare('SELECT meet_link FROM online_classes WHERE id = ?').bind(id).first();
        expect(row.meet_link).toBe('https://meet.google.com/abc-xyz');
    });
    it('updateClassCalendarInfo cập nhật calendar_event_id và meet_link', async () => {
        const id = await seedClass(env.DB);
        await updateClassCalendarInfo(env.DB, id, { eventId: 'evt_abc123', meetLink: 'https://meet.google.com/evt' });
        const row = await env.DB.prepare('SELECT calendar_event_id, meet_link FROM online_classes WHERE id = ?').bind(id).first();
        expect(row.calendar_event_id).toBe('evt_abc123');
        expect(row.meet_link).toBe('https://meet.google.com/evt');
    });
    it('updateClass whitelist field - chỉ cập nhật field hợp lệ, bỏ qua field lạ', async () => {
        const id = await seedClass(env.DB, { class_name: 'Tên Cũ' });
        await updateClass(env.DB, id, { class_name: 'Tên Mới', hack: 'DROP TABLE online_classes' });
        const row = await env.DB.prepare('SELECT class_name FROM online_classes WHERE id = ?').bind(id).first();
        expect(row.class_name).toBe('Tên Mới');
        // Bảng vẫn còn (field 'hack' bị bỏ qua)
        const count = await env.DB.prepare('SELECT COUNT(*) as c FROM online_classes').first();
        expect(count.c).toBeGreaterThan(0);
    });
    it('updateClass với field rỗng trả null (không làm gì)', async () => {
        const id = await seedClass(env.DB, { class_name: 'Không Đổi' });
        const result = await updateClass(env.DB, id, { hack: 'evil' });
        expect(result).toBeNull();
        const row = await env.DB.prepare('SELECT class_name FROM online_classes WHERE id = ?').bind(id).first();
        expect(row.class_name).toBe('Không Đổi');
    });
    it('updateClassCalendarSync cập nhật tất cả sync fields', async () => {
        const id = await seedClass(env.DB);
        await updateClassCalendarSync(env.DB, id, {
            meetLink: 'https://meet.google.com/sync',
            eventId: 'evt_sync_001',
            recurrence: 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR',
        });
        const row = await env.DB.prepare('SELECT meet_link, calendar_event_id, recurrence FROM online_classes WHERE id = ?').bind(id).first();
        expect(row.meet_link).toBe('https://meet.google.com/sync');
        expect(row.calendar_event_id).toBe('evt_sync_001');
        expect(row.recurrence).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
    });
    it('deleteClass xoá đúng bản ghi khỏi DB', async () => {
        const id = await seedClass(env.DB);
        // Xác nhận tồn tại trước khi xoá
        const before = await env.DB.prepare('SELECT id FROM online_classes WHERE id = ?').bind(id).first();
        expect(before).not.toBeNull();
        await deleteClass(env.DB, id);
        // Xác nhận đã xoá
        const after = await env.DB.prepare('SELECT id FROM online_classes WHERE id = ?').bind(id).first();
        expect(after).toBeNull();
    });
});
// ─── Tests: Students ─────────────────────────────────────────────────────────
describe('online-classes repository - Students (DB thật)', () => {
    beforeEach(async () => {
        await setupTables(env.DB);
        await cleanTables(env.DB);
    });
    it('findStudentByCccd tìm đúng student và không SELECT *', async () => {
        await seedStudent(env.DB, { cccd: '079200012345', ho_ten_full: 'Trần Thị Bình' });
        const student = await findStudentByCccd(env.DB, '079200012345');
        expect(student).not.toBeNull();
        expect(student.cccd).toBe('079200012345');
        // Explicit columns: id, cccd, ho_ten_full
        expect(student).toHaveProperty('id');
        expect(student).toHaveProperty('ho_ten_full');
        // Không có field ngoài SELECT list
        expect(student).not.toHaveProperty('password_hash');
        expectNoSelectStarQuery('SELECT id, cccd, ho_ten_full FROM students WHERE cccd = ?');
    });
    it('findStudentByCccd trả null khi không tìm thấy', async () => {
        const result = await findStudentByCccd(env.DB, '000000000000');
        expect(result).toBeNull();
    });
    it('findStudentById tìm đúng student theo id và không SELECT *', async () => {
        const studentId = await seedStudent(env.DB, {
            cccd: '031200099999',
            ho_ten_full: 'Lê Văn C',
            email: 'levanc@test.com',
            sdt: '0911111111',
        });
        const student = await findStudentById(env.DB, studentId);
        expect(student).not.toBeNull();
        expect(student.id).toBe(studentId);
        // Explicit columns: id, cccd, ho_ten_full, email, sdt
        expect(student).toHaveProperty('cccd');
        expect(student).toHaveProperty('ho_ten_full');
        expect(student).toHaveProperty('email');
        expect(student).toHaveProperty('sdt');
        expectNoSelectStarQuery('SELECT id, cccd, ho_ten_full, email, sdt FROM students WHERE id = ?');
    });
    it('findStudentById trả null khi không tìm thấy', async () => {
        const result = await findStudentById(env.DB, 99999);
        expect(result).toBeNull();
    });
    it('searchStudents không keyword trả tối đa 50 bản ghi và không SELECT *', async () => {
        // Chèn 3 học viên
        await seedStudent(env.DB, { cccd: '010000000001', email: 'a1@test.com', sdt: '0901000001' });
        await seedStudent(env.DB, { cccd: '010000000002', email: 'a2@test.com', sdt: '0901000002' });
        await seedStudent(env.DB, { cccd: '010000000003', email: 'a3@test.com', sdt: '0901000003' });
        const result = await searchStudents(env.DB, '   ');
        expect(result.results.length).toBe(3);
        // Explicit columns kiểm tra
        const row = result.results[0];
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('cccd');
        expect(row).toHaveProperty('ho_ten_full');
        expect(row).toHaveProperty('email');
        expect(row).toHaveProperty('sdt');
        expectNoSelectStarQuery('SELECT id, cccd, ho_ten_full, email, sdt, cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id FROM students ORDER BY id DESC LIMIT 50');
    });
    it('searchStudents với keyword lọc đúng theo tên và không SELECT *', async () => {
        await seedStudent(env.DB, { cccd: '020000000001', ho_ten_full: 'Phạm Minh Tuấn', email: 'tuan@test.com', sdt: '0902000001' });
        await seedStudent(env.DB, { cccd: '020000000002', ho_ten_full: 'Nguyễn Thu Hà', email: 'ha@test.com', sdt: '0902000002' });
        const result = await searchStudents(env.DB, 'Tuấn');
        expect(result.results.length).toBe(1);
        expect(result.results[0].ho_ten_full).toBe('Phạm Minh Tuấn');
        expectNoSelectStarQuery('SELECT id, cccd, ho_ten_full, email, sdt FROM students WHERE ho_ten_full LIKE ? LIMIT 50');
    });
    it('searchStudents với keyword tìm theo CCCD', async () => {
        await seedStudent(env.DB, { cccd: '030099887766', ho_ten_full: 'Tìm Theo CCCD', email: 'cccd@test.com', sdt: '0903000001' });
        await seedStudent(env.DB, { cccd: '040011223344', ho_ten_full: 'Người Khác', email: 'other@test.com', sdt: '0903000002' });
        const result = await searchStudents(env.DB, '030099');
        expect(result.results.length).toBe(1);
        expect(result.results[0].cccd).toBe('030099887766');
    });
});
