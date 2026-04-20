/**
 * Test: online-classes service - Capacity Checks
 * Luồng thật: Service → Repository → D1 DB thật (Miniflare in-memory)
 *
 * KHÔNG dùng vi.mock cho repository. DB thật từ env.DB (cloudflare:test).
 * CHỈ mock Google Calendar vì đó là external API ngoài tầm kiểm soát.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import * as service from '../../lib/services/online-classes.js';
import { setupRealDB, clearRealDB } from '../setup-real-db.js';
// Chỉ mock Google Calendar (external API)
vi.mock('../../services/google-calendar.js');
// ─── Schema được tạo một lần duy nhất ────────────────────────────────────────
beforeAll(async () => {
    await setupRealDB(env.DB);
});
// ─── Xóa dữ liệu giữa các test ───────────────────────────────────────────────
beforeEach(async () => {
    vi.resetAllMocks();
    await clearRealDB(env.DB);
    // Seed admin để FK created_by hợp lệ
    await env.DB.prepare(`INSERT OR IGNORE INTO admins (id, username, password_hash, full_name)
     VALUES (1, 'admin_test', 'hashed', 'Admin Test')`).run();
});
afterEach(() => {
    vi.useRealTimers();
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Tạo class trong DB thật với max_students và status tuỳ chỉnh.
 * Trả về id của class vừa tạo.
 */
async function seedClass(db, { maxStudents = 50, status = 'active' } = {}) {
    const result = await db.prepare(`INSERT INTO online_classes
       (class_name, schedule_rule, schedule_time, start_date, max_students, status, created_by)
     VALUES ('Test Class', 'Weekly', '19:00-21:00', '2025-01-01', ?, ?, 1)`).bind(maxStudents, status).run();
    return result.meta.last_row_id;
}
/**
 * Tạo student trong DB thật và trả về id.
 */
async function seedStudent(db, suffix = '') {
    const result = await db.prepare(`INSERT INTO students (cccd, ho, ten_dem, ten, ho_ten_full, ngay_sinh, noi_sinh,
                           gioi_tinh, email, sdt, dia_chi)
     VALUES (?, 'Nguyen', 'Van', ?, ?, '2000-01-01', 'HN', 'Nam', ?, ?, 'HN')`).bind(`CCCD_${suffix}_${Date.now()}`, `Hoc Vien ${suffix}`, `Nguyen Van Hoc Vien ${suffix}`, `hv${suffix}@test.com`, `090000${suffix.slice(0, 4)}`).run();
    return result.meta.last_row_id;
}
/**
 * Chèn N enrollment active vào 1 class để mô phỏng lớp đã đầy.
 */
async function seedActiveEnrollments(db, classId, count) {
    for (let i = 0; i < count; i++) {
        const studentId = await seedStudent(db, `fill_${classId}_${i}`);
        await db.prepare(`INSERT INTO online_class_enrollments (online_class_id, student_id, status)
       VALUES (?, ?, 'active')`).bind(classId, studentId).run();
    }
}
/**
 * Tạo enrollment pending cho 1 student, trả về enrollmentId.
 */
async function seedPendingEnrollment(db, classId, studentId) {
    const result = await db.prepare(`INSERT INTO online_class_enrollments (online_class_id, student_id, status)
     VALUES (?, ?, 'pending')`).bind(classId, studentId).run();
    return result.meta.last_row_id;
}
// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Online Classes Service - Capacity Checks (DB thật)', () => {
    const db = env.DB;
    describe('enrollStudent - kiểm tra capacity', () => {
        it('phải throw khi lớp đã đầy (active enrollments >= max_students)', async () => {
            // Tạo lớp max 3 học viên trong DB thật
            const classId = await seedClass(db, { maxStudents: 3 });
            // Chèn đúng 3 enrollment active (lấp đầy lớp)
            await seedActiveEnrollments(db, classId, 3);
            // Tạo một học viên mới muốn đăng ký
            const newStudentId = await seedStudent(db, 'new');
            // Gọi service thật - phải throw vì lớp đã đầy
            await expect(service.enrollStudent(db, classId, newStudentId))
                .rejects
                .toThrow('Lớp học đã đủ số lượng học viên');
        });
        it('cho phép đăng ký khi còn chỗ trống', async () => {
            // Tạo lớp max 5 học viên, chỉ điền 4
            const classId = await seedClass(db, { maxStudents: 5 });
            await seedActiveEnrollments(db, classId, 4);
            const newStudentId = await seedStudent(db, 'new');
            // Phải thành công (còn 1 chỗ)
            const result = await service.enrollStudent(db, classId, newStudentId);
            expect(result.status).toBe('pending');
            expect(result.message).toContain('Đăng ký thành công');
            // Xác nhận DB có enrollment mới với status 'pending'
            const dbRow = await db.prepare(`SELECT status FROM online_class_enrollments
         WHERE online_class_id = ? AND student_id = ?`).bind(classId, newStudentId).first();
            expect(dbRow.status).toBe('pending');
        });
        it('throw khi lớp không còn mở đăng ký (status != active)', async () => {
            const classId = await seedClass(db, { status: 'paused' });
            const studentId = await seedStudent(db, 'paused_test');
            await expect(service.enrollStudent(db, classId, studentId))
                .rejects
                .toThrow('Lớp học không còn mở đăng ký');
        });
        it('throw khi học viên đã đăng ký và đang chờ duyệt', async () => {
            const classId = await seedClass(db, { maxStudents: 50 });
            const studentId = await seedStudent(db, 'dup_pending');
            // Tạo enrollment pending trước
            await seedPendingEnrollment(db, classId, studentId);
            await expect(service.enrollStudent(db, classId, studentId))
                .rejects
                .toThrow('Bạn đã đăng ký và đang chờ duyệt');
        });
        it('throw khi học viên đã là active enrollment', async () => {
            const classId = await seedClass(db, { maxStudents: 50 });
            const studentId = await seedStudent(db, 'dup_active');
            // Chèn trực tiếp enrollment active
            await db.prepare(`INSERT INTO online_class_enrollments (online_class_id, student_id, status)
         VALUES (?, ?, 'active')`).bind(classId, studentId).run();
            await expect(service.enrollStudent(db, classId, studentId))
                .rejects
                .toThrow('Bạn đã đăng ký lớp học này');
        });
    });
    describe('approveEnrollmentById - kiểm tra capacity khi admin duyệt', () => {
        it('phải throw khi admin cố duyệt nhưng lớp đã đầy', async () => {
            // Lớp max 2 học viên, đã có 2 active
            const classId = await seedClass(db, { maxStudents: 2 });
            await seedActiveEnrollments(db, classId, 2);
            // Một học viên đang pending
            const pendingStudentId = await seedStudent(db, 'pending_over');
            const enrollmentId = await seedPendingEnrollment(db, classId, pendingStudentId);
            await expect(service.approveEnrollmentById(db, classId, enrollmentId, 1))
                .rejects
                .toThrow('Lớp học đã đủ số lượng học viên. Không thể duyệt thêm.');
            // Xác nhận enrollment vẫn còn 'pending' trong DB
            const dbRow = await db.prepare(`SELECT status FROM online_class_enrollments WHERE id = ?`).bind(enrollmentId).first();
            expect(dbRow.status).toBe('pending');
        });
        it('admin duyệt thành công khi còn chỗ trống', async () => {
            // Lớp max 5, đang có 4 active
            const classId = await seedClass(db, { maxStudents: 5 });
            await seedActiveEnrollments(db, classId, 4);
            const pendingStudentId = await seedStudent(db, 'pending_ok');
            const enrollmentId = await seedPendingEnrollment(db, classId, pendingStudentId);
            const result = await service.approveEnrollmentById(db, classId, enrollmentId, 1);
            expect(result.message).toContain('Đã duyệt học viên');
            expect(result.enrollment_id).toBe(enrollmentId);
            // Xác nhận DB: enrollment đã thành 'active'
            const dbRow = await db.prepare(`SELECT status, approved_by FROM online_class_enrollments WHERE id = ?`).bind(enrollmentId).first();
            expect(dbRow.status).toBe('active');
            expect(String(dbRow.approved_by)).toBe('1');
        });
        it('countActiveEnrollments chính xác: cancelled/pending không được tính', async () => {
            // Lớp max 2 học viên
            const classId = await seedClass(db, { maxStudents: 2 });
            // Thêm 2 active (đầy lớp)
            await seedActiveEnrollments(db, classId, 2);
            // Thêm 3 pending và 1 cancelled - KHÔNG được tính vào capacity
            for (let i = 0; i < 3; i++) {
                const sid = await seedStudent(db, `pending_noise_${i}`);
                await db.prepare(`INSERT INTO online_class_enrollments (online_class_id, student_id, status)
           VALUES (?, ?, 'pending')`).bind(classId, sid).run();
            }
            const cancelledSid = await seedStudent(db, 'cancelled');
            await db.prepare(`INSERT INTO online_class_enrollments (online_class_id, student_id, status)
         VALUES (?, ?, 'cancelled')`).bind(classId, cancelledSid).run();
            // Dù có 6 enrollment tổng cộng, chỉ 2 active => lớp đã đầy
            const newStudentId = await seedStudent(db, 'try_enroll');
            await expect(service.enrollStudent(db, classId, newStudentId))
                .rejects
                .toThrow('Lớp học đã đủ số lượng học viên');
        });
    });
});
