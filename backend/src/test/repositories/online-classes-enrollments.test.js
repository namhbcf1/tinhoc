/**
 * Test: online-classes repository - Enrollments (ghi danh)
 * DÙNG DB THẬT qua cloudflare:test env - KHÔNG MOCK.
 * Kiểm tra logic thật: INSERT/UPDATE/SELECT trực tiếp trên D1 SQLite in-process.
 *
 * Mỗi it() hoàn toàn độc lập: tự seed enrollment riêng, không phụ thuộc state từ test khác.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { env } from 'cloudflare:test';
import { countActiveEnrollments, getPendingCountsByClass, findEnrollment, findEnrollmentById, createEnrollment, reEnroll, activateEnrollmentDirect, reactivateEnrollment, approveEnrollment, rejectEnrollment, cancelEnrollment, listEnrolledStudents, listActiveEnrollmentsWithStudents, listPendingEnrollmentsWithStudents, getEnrolledStudentIds } from '../../lib/repositories/online-classes.js';
// ─── Khởi tạo schema thật cho DB test ────────────────────────────────────────
async function setupRealDB(db) {
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
      status TEXT DEFAULT 'active',
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      approved_by INTEGER,
      rejection_reason TEXT,
      UNIQUE(online_class_id, student_id)
    )
  `).run();
}
async function clearRealDB(db) {
    await db.prepare('DELETE FROM online_class_enrollments').run();
    await db.prepare('DELETE FROM online_classes').run();
    await db.prepare('DELETE FROM students').run();
}
// ─── Helpers để seed data độc lập cho từng test ───────────────────────────────
/** Tạo student với cccd duy nhất, trả về studentId */
async function insertStudent(db, cccd, hoTenFull, email, sdt) {
    const parts = hoTenFull.split(' ');
    const ten = parts[parts.length - 1];
    const ho = parts[0];
    const tenDem = parts.slice(1, -1).join(' ') || 'Van';
    const result = await db.prepare(`
    INSERT INTO students (cccd, ho, ten_dem, ten, ho_ten_full, ngay_sinh, noi_sinh, gioi_tinh, email, sdt, dia_chi)
    VALUES (?, ?, ?, ?, ?, '2000-01-01', 'Ha Noi', 'Nam', ?, ?, 'Ha Noi')
  `).bind(cccd, ho, tenDem, ten, hoTenFull, email, sdt).run();
    return result.meta.last_row_id;
}
/** Tạo lớp học, trả về classId */
async function insertClass(db, className) {
    const result = await db.prepare(`
    INSERT INTO online_classes (class_name, schedule_rule, schedule_time, start_date)
    VALUES (?, 'WEEKLY:2,4', '19:00-21:00', '2026-03-01')
  `).bind(className).run();
    return result.meta.last_row_id;
}
// Bộ đếm để tạo cccd/email/sdt duy nhất giữa các test
let _counter = 100;
function nextId() {
    return ++_counter;
}
/** Seed một student + class + enrollment pending, trả về { db, classId, studentId, enrollmentId } */
async function seedPendingEnrollment(db) {
    const n = nextId();
    const studentId = await insertStudent(db, `0123456789${n}`, `Nguyen Van ${n}`, `s${n}@test.com`, `090100${n}`);
    const classId = await insertClass(db, `Lop Test ${n}`);
    await createEnrollment(db, classId, studentId);
    const enrollment = await findEnrollment(db, classId, studentId);
    return { db, classId, studentId, enrollmentId: enrollment.id };
}
/** Seed enrollment với status active trực tiếp */
async function seedActiveEnrollment(db) {
    const n = nextId();
    const studentId = await insertStudent(db, `0123456789${n}`, `Tran Thi ${n}`, `s${n}@test.com`, `090100${n}`);
    const classId = await insertClass(db, `Lop Active ${n}`);
    await activateEnrollmentDirect(db, classId, studentId);
    const enrollment = await findEnrollment(db, classId, studentId);
    return { db, classId, studentId, enrollmentId: enrollment.id };
}
// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('online-classes repository - Enrollments (DB thật)', () => {
    let db;
    beforeAll(async () => {
        db = env.DB;
        await setupRealDB(db);
    });
    afterAll(async () => {
        await clearRealDB(db);
    });
    // ── createEnrollment ──────────────────────────────────────────────────────
    it('createEnrollment - tạo enrollment pending thật trong DB', async () => {
        const studentId = await insertStudent(db, '0100000001', 'Nguyen Van A1', 'a1@test.com', '0900000001');
        const classId = await insertClass(db, 'Lop Create 1');
        const result = await createEnrollment(db, classId, studentId);
        expect(result.meta.last_row_id).toBeGreaterThan(0);
        const row = await db.prepare('SELECT id, status FROM online_class_enrollments WHERE online_class_id = ? AND student_id = ?').bind(classId, studentId).first();
        expect(row).not.toBeNull();
        expect(row.status).toBe('pending');
    });
    // ── findEnrollment ────────────────────────────────────────────────────────
    it('findEnrollment - tìm đúng enrollment theo classId + studentId', async () => {
        const { classId, studentId } = await seedPendingEnrollment(db);
        const row = await findEnrollment(db, classId, studentId);
        expect(row).not.toBeNull();
        expect(row.status).toBe('pending');
        // Xác nhận SELECT explicit (không SELECT *)
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('status');
        expect(row).toHaveProperty('enrolled_at');
        expect(row).toHaveProperty('rejection_reason');
        // Không có trường ngoài danh sách SELECT
        expect(row).not.toHaveProperty('online_class_id');
    });
    // ── findEnrollmentById ────────────────────────────────────────────────────
    it('findEnrollmentById - JOIN với students, trả về ho_ten_full', async () => {
        const n = nextId();
        const studentId = await insertStudent(db, `0123456789${n}`, 'Nguyen Van B', `b${n}@test.com`, `090100${n}`);
        const classId = await insertClass(db, `Lop FindById ${n}`);
        await createEnrollment(db, classId, studentId);
        const enrollment = await findEnrollment(db, classId, studentId);
        const row = await findEnrollmentById(db, enrollment.id, classId);
        expect(row).not.toBeNull();
        expect(row.ho_ten_full).toBe('Nguyen Van B');
        expect(row.student_id).toBe(studentId);
    });
    // ── countActiveEnrollments ────────────────────────────────────────────────
    it('countActiveEnrollments - đếm đúng số active (ban đầu = 0 vì status = pending)', async () => {
        const { classId } = await seedPendingEnrollment(db);
        const count = await countActiveEnrollments(db, classId);
        expect(typeof count).toBe('number');
        expect(count).toBe(0); // pending không được đếm
    });
    // ── getPendingCountsByClass ───────────────────────────────────────────────
    it('getPendingCountsByClass - trả về map classId -> count pending', async () => {
        const { classId } = await seedPendingEnrollment(db);
        const map = await getPendingCountsByClass(db);
        expect(typeof map).toBe('object');
        expect(map[classId]).toBeGreaterThanOrEqual(1);
    });
    // ── reEnroll ──────────────────────────────────────────────────────────────
    it('reEnroll - reset enrollment về pending (từ cancelled)', async () => {
        const { enrollmentId } = await seedPendingEnrollment(db);
        // Đặt thành cancelled trước
        await db.prepare("UPDATE online_class_enrollments SET status = 'cancelled' WHERE id = ?").bind(enrollmentId).run();
        await reEnroll(db, enrollmentId);
        const updated = await db.prepare('SELECT status, rejection_reason FROM online_class_enrollments WHERE id = ?').bind(enrollmentId).first();
        expect(updated.status).toBe('pending');
        expect(updated.rejection_reason).toBeNull();
    });
    // ── rejectEnrollment ──────────────────────────────────────────────────────
    it('rejectEnrollment - cập nhật status = rejected và lý do', async () => {
        const { enrollmentId } = await seedPendingEnrollment(db);
        await rejectEnrollment(db, enrollmentId, 99, 'Hết chỗ');
        const row = await db.prepare('SELECT status, rejection_reason, approved_by FROM online_class_enrollments WHERE id = ?').bind(enrollmentId).first();
        expect(row.status).toBe('rejected');
        expect(row.rejection_reason).toBe('Hết chỗ');
        expect(row.approved_by).toBe(99);
    });
    // ── approveEnrollment ─────────────────────────────────────────────────────
    it('approveEnrollment - cập nhật status = active và approved_by', async () => {
        const { enrollmentId } = await seedPendingEnrollment(db);
        await approveEnrollment(db, enrollmentId, 1);
        const row = await db.prepare('SELECT status, approved_by FROM online_class_enrollments WHERE id = ?').bind(enrollmentId).first();
        expect(row.status).toBe('active');
        expect(row.approved_by).toBe(1);
    });
    // ── countActiveEnrollments sau khi approve ────────────────────────────────
    it('countActiveEnrollments - đếm đúng 1 sau khi approve', async () => {
        const { classId, enrollmentId } = await seedPendingEnrollment(db);
        await approveEnrollment(db, enrollmentId, 1);
        const count = await countActiveEnrollments(db, classId);
        expect(count).toBe(1);
    });
    // ── reactivateEnrollment ──────────────────────────────────────────────────
    it('reactivateEnrollment - đặt lại status = active cho enrollment bị cancelled', async () => {
        const { enrollmentId } = await seedActiveEnrollment(db);
        // Set cancelled trước
        await db.prepare("UPDATE online_class_enrollments SET status = 'cancelled' WHERE id = ?").bind(enrollmentId).run();
        await reactivateEnrollment(db, enrollmentId);
        const row = await db.prepare('SELECT status FROM online_class_enrollments WHERE id = ?').bind(enrollmentId).first();
        expect(row.status).toBe('active');
    });
    // ── cancelEnrollment ──────────────────────────────────────────────────────
    it('cancelEnrollment - cập nhật status = cancelled cho đúng cặp classId + studentId', async () => {
        const { classId, studentId } = await seedActiveEnrollment(db);
        await cancelEnrollment(db, classId, studentId);
        const row = await db.prepare('SELECT status FROM online_class_enrollments WHERE online_class_id = ? AND student_id = ?').bind(classId, studentId).first();
        expect(row.status).toBe('cancelled');
    });
    // ── activateEnrollmentDirect ──────────────────────────────────────────────
    it('activateEnrollmentDirect - insert thẳng với status active', async () => {
        const n = nextId();
        const studentId = await insertStudent(db, `0123456789${n}`, `Le Van ${n}`, `lv${n}@test.com`, `090100${n}`);
        const classId = await insertClass(db, `Lop Direct ${n}`);
        const result = await activateEnrollmentDirect(db, classId, studentId);
        expect(result.meta.last_row_id).toBeGreaterThan(0);
        const row = await db.prepare('SELECT status FROM online_class_enrollments WHERE online_class_id = ? AND student_id = ?').bind(classId, studentId).first();
        expect(row.status).toBe('active');
    });
    // ── listEnrolledStudents ──────────────────────────────────────────────────
    it('listEnrolledStudents - JOIN trả về đúng trường, không SELECT *', async () => {
        const { classId, studentId } = await seedActiveEnrollment(db);
        const { results } = await listEnrolledStudents(db, classId);
        expect(Array.isArray(results)).toBe(true);
        const found = results.find(r => r.id === studentId);
        expect(found).not.toBeUndefined();
        // Kiểm tra explicit columns
        expect(found).toHaveProperty('ho_ten_full');
        expect(found).toHaveProperty('enrollment_status');
        expect(found).toHaveProperty('enrolled_at');
        // Không có trường thừa
        expect(found).not.toHaveProperty('dia_chi');
        expect(found).not.toHaveProperty('noi_sinh');
    });
    // ── listActiveEnrollmentsWithStudents ─────────────────────────────────────
    it('listActiveEnrollmentsWithStudents - chỉ trả active, có enrollment_id', async () => {
        // Tạo class với 1 student active, 1 student cancelled
        const n = nextId();
        const classId = await insertClass(db, `Lop Active List ${n}`);
        const activeStudentId = await insertStudent(db, `0123456789${n}a`, `Active ${n}`, `act${n}@test.com`, `090200${n}`);
        await activateEnrollmentDirect(db, classId, activeStudentId);
        const cancelledStudentId = await insertStudent(db, `0123456789${n}b`, `Cancelled ${n}`, `can${n}@test.com`, `090300${n}`);
        await createEnrollment(db, classId, cancelledStudentId);
        const cancelEnr = await findEnrollment(db, classId, cancelledStudentId);
        await db.prepare("UPDATE online_class_enrollments SET status = 'cancelled' WHERE id = ?")
            .bind(cancelEnr.id).run();
        const { results } = await listActiveEnrollmentsWithStudents(db, classId);
        expect(Array.isArray(results)).toBe(true);
        const found = results.find(r => r.id === activeStudentId);
        expect(found).not.toBeUndefined();
        expect(found.enrollment_status).toBe('active');
        expect(found).toHaveProperty('enrollment_id');
        // Không được có student cancelled
        const notFound = results.find(r => r.id === cancelledStudentId);
        expect(notFound).toBeUndefined();
    });
    // ── listPendingEnrollmentsWithStudents ────────────────────────────────────
    it('listPendingEnrollmentsWithStudents - chỉ trả pending', async () => {
        const n = nextId();
        const classId = await insertClass(db, `Lop Pending List ${n}`);
        const pendingStudentId = await insertStudent(db, `0123456789${n}`, `Pending ${n}`, `pnd${n}@test.com`, `090400${n}`);
        await createEnrollment(db, classId, pendingStudentId);
        const { results } = await listPendingEnrollmentsWithStudents(db, classId);
        expect(Array.isArray(results)).toBe(true);
        const found = results.find(r => r.student_id === pendingStudentId);
        expect(found).not.toBeUndefined();
        expect(found.status).toBe('pending');
        expect(found).toHaveProperty('enrollment_id');
    });
    // ── getEnrolledStudentIds ─────────────────────────────────────────────────
    it('getEnrolledStudentIds - trả Set chứa đúng student đang active', async () => {
        const n = nextId();
        const classId = await insertClass(db, `Lop GetIds ${n}`);
        const activeStudentId = await insertStudent(db, `0123456789${n}a`, `Active Ids ${n}`, `aid${n}@test.com`, `090500${n}`);
        await activateEnrollmentDirect(db, classId, activeStudentId);
        const cancelledStudentId = await insertStudent(db, `0123456789${n}b`, `Cancelled Ids ${n}`, `cid${n}@test.com`, `090600${n}`);
        await createEnrollment(db, classId, cancelledStudentId);
        const ce = await findEnrollment(db, classId, cancelledStudentId);
        await db.prepare("UPDATE online_class_enrollments SET status = 'cancelled' WHERE id = ?")
            .bind(ce.id).run();
        const ids = await getEnrolledStudentIds(db, classId);
        expect(ids instanceof Set).toBe(true);
        expect(ids.has(activeStudentId)).toBe(true);
        expect(ids.has(cancelledStudentId)).toBe(false);
    });
});
