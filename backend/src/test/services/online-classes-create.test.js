/**
 * Test: online-classes service - Schedule Parsing & Validation + createClass
 * Luồng thật: Validation → Service → Repository → D1 DB thật (Miniflare in-memory)
 *
 * KHÔNG dùng vi.mock cho repository. DB thật từ env.DB (cloudflare:test).
 * CHỈ mock Google Calendar vì đó là external API ngoài tầm kiểm soát của test.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:test';
import * as service from '../../lib/services/online-classes.js';
import * as gc from '../../services/google-calendar.js';
import { setupRealDB, clearRealDB } from '../setup-real-db.js';
// Chỉ mock Google Calendar (external API)
vi.mock('../../services/google-calendar.js');
// ─── Schema được tạo một lần duy nhất ────────────────────────────────────────
beforeAll(async () => {
    await setupRealDB(env.DB);
});
// ─── Xóa dữ liệu giữa các test để cô lập ────────────────────────────────────
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
// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Online Classes Service - Schedule Parsing & Validation (DB thật)', () => {
    const db = env.DB;
    describe('Validation schedule_time - từ chối format sai', () => {
        it('phải throw khi schedule_time là chuỗi tự do không đúng format', async () => {
            const body = {
                class_name: 'Test Class',
                description: 'Mô tả',
                schedule_rule: 'Weekly',
                schedule_time: 'eight to ten', // format sai
                start_date: '2025-01-01',
            };
            await expect(service.createClass(db, env, body, 1))
                .rejects
                .toThrow('schedule_time phải có định dạng HH:MM-HH:MM (VD: 19:00-21:00)');
        });
        it('phải throw khi giờ thiếu số 0 đứng trước (8:00 thay vì 08:00)', async () => {
            const body = {
                class_name: 'Test Class',
                schedule_rule: 'Weekly',
                schedule_time: '8:00-10:00', // thiếu leading zero
                start_date: '2025-01-01',
            };
            await expect(service.createClass(db, env, body, 1))
                .rejects
                .toThrow('schedule_time phải có định dạng HH:MM-HH:MM (VD: 19:00-21:00)');
        });
        it('KHÔNG ghi record vào DB khi validation thất bại', async () => {
            const body = {
                class_name: 'Class Invalid',
                schedule_rule: 'Weekly',
                schedule_time: 'bad-format',
                start_date: '2025-01-01',
            };
            await expect(service.createClass(db, env, body, 1)).rejects.toThrow();
            // Xác nhận DB thật không có record nào được insert
            const row = await db.prepare('SELECT COUNT(*) as c FROM online_classes').first();
            expect(row.c).toBe(0);
        });
    });
    describe('createClass thành công - ghi DB thật', () => {
        it('tạo class thành công và trả về đúng cấu trúc, không có warning', async () => {
            const body = {
                class_name: 'Math 101',
                schedule_rule: 'Weekly',
                schedule_time: '19:00-21:00',
                start_date: '2025-01-01',
            };
            gc.createOnlineClassEvent.mockResolvedValue({
                eventId: 'google_evt_001',
                meetLink: 'https://meet.google.com/test-link',
                recurrence: 'RRULE:FREQ=WEEKLY', // string, không phải Array - D1 chỉ nhận string
            });
            const result = await service.createClass(db, env, body, 1);
            // Kiểm tra cấu trúc trả về
            expect(result).toMatchObject({
                newClass: expect.objectContaining({
                    class_name: 'Math 101',
                    calendar_event_id: 'google_evt_001',
                    meet_link: 'https://meet.google.com/test-link',
                    status: 'active',
                }),
                calendarResult: expect.objectContaining({
                    eventId: 'google_evt_001',
                    meetLink: 'https://meet.google.com/test-link',
                }),
                warning: null,
            });
            // Xác nhận record đã tồn tại trong DB thật
            const dbRow = await db
                .prepare('SELECT id, class_name, meet_link, calendar_event_id FROM online_classes WHERE id = ?')
                .bind(result.newClass.id)
                .first();
            expect(dbRow).not.toBeNull();
            expect(dbRow.class_name).toBe('Math 101');
            expect(dbRow.meet_link).toBe('https://meet.google.com/test-link');
            expect(dbRow.calendar_event_id).toBe('google_evt_001');
        });
        it('tạo class thành công kể cả khi Google Calendar lỗi, trả về warning', async () => {
            const body = {
                class_name: 'Physics 201',
                schedule_rule: 'Weekly',
                schedule_time: '14:00-16:00',
                start_date: '2025-06-01',
            };
            gc.createOnlineClassEvent.mockRejectedValue(new Error('API Down'));
            const result = await service.createClass(db, env, body, 1);
            // Class vẫn được tạo trong DB thật, nhưng không có meet_link
            expect(result.warning).toContain('Không thể tạo Google Meet tự động: API Down');
            expect(result.newClass).toBeDefined();
            expect(result.newClass.class_name).toBe('Physics 201');
            expect(result.newClass.meet_link).toBeNull();
            // Xác nhận DB thật có row này
            const dbRow = await db
                .prepare('SELECT id, class_name, meet_link FROM online_classes WHERE class_name = ?')
                .bind('Physics 201')
                .first();
            expect(dbRow).not.toBeNull();
            expect(dbRow.meet_link).toBeNull();
        });
        it('ghi đúng id và record phân biệt được trong DB (auto-increment thật)', async () => {
            gc.createOnlineClassEvent.mockResolvedValue({
                eventId: 'evt-A',
                meetLink: 'https://meet.google.com/aaa',
                recurrence: [],
            });
            const result1 = await service.createClass(db, env, {
                class_name: 'Class A',
                schedule_rule: 'Daily',
                schedule_time: '08:00-10:00',
                start_date: '2025-02-01',
            }, 1);
            gc.createOnlineClassEvent.mockResolvedValue({
                eventId: 'evt-B',
                meetLink: 'https://meet.google.com/bbb',
                recurrence: [],
            });
            const result2 = await service.createClass(db, env, {
                class_name: 'Class B',
                schedule_rule: 'Weekly',
                schedule_time: '19:00-21:00',
                start_date: '2025-03-01',
            }, 1);
            // ID phải khác nhau (auto-increment thật)
            expect(result1.newClass.id).not.toBe(result2.newClass.id);
            expect(result1.newClass.calendar_event_id).toBe('evt-A');
            expect(result2.newClass.calendar_event_id).toBe('evt-B');
            const total = await db.prepare('SELECT COUNT(*) as c FROM online_classes').first();
            expect(total.c).toBe(2);
        });
    });
});
