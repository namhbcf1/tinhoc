/**
 * Test: online-classes service - Google Calendar Orchestration (retry meet link)
 * Luồng thật: Service → Repository → D1 DB thật (Miniflare in-memory)
 *
 * KHÔNG dùng vi.mock cho repository. DB thật từ env.DB (cloudflare:test).
 * CHỈ mock Google Calendar vì đó là external API.
 * Kiểm tra logic retry getMeetLinkFromEvent và updateClassMeetLink ghi DB thật.
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

// ─── Xóa dữ liệu giữa các test ───────────────────────────────────────────────

beforeEach(async () => {
  vi.resetAllMocks();
  await clearRealDB(env.DB);

  // Seed admin để FK created_by hợp lệ
  await env.DB.prepare(
    `INSERT OR IGNORE INTO admins (id, username, password_hash, full_name)
     VALUES (1, 'admin_test', 'hashed', 'Admin Test')`
  ).run();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Online Classes Service - Google Calendar Orchestration (DB thật)', () => {
  const db = env.DB;

  describe('syncMeetLink retry - lấy meet_link bị trễ từ Google', () => {
    it('retry thành công lần 2 → ghi meet_link vào DB thật', async () => {
      vi.useFakeTimers();

      const body = {
        class_name: 'Async Meet Link Class',
        schedule_rule: 'Weekly',
        schedule_time: '08:00-10:00',
        start_date: '2025-01-01',
      };

      // Google tạo event thành công nhưng chưa có meet_link ngay
      gc.createOnlineClassEvent.mockResolvedValue({
        eventId: 'google_async_evt',
        meetLink: '', // rỗng → trigger retry
        recurrence: [],
      });

      // Lần 1: null, lần 2: có link
      gc.getMeetLinkFromEvent
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('https://meet.google.com/late-link');

      const createPromise = service.createClass(db, env, body, 1);
      await vi.runAllTimersAsync();
      const result = await createPromise;

      // Service phải retry đúng 2 lần
      expect(gc.getMeetLinkFromEvent).toHaveBeenCalledTimes(2);

      // Kết quả trả về có meet_link đã cập nhật
      expect(result.calendarResult.meetLink).toBe('https://meet.google.com/late-link');

      // Quan trọng: DB thật phải được cập nhật bằng updateClassMeetLink
      const dbRow = await db
        .prepare('SELECT meet_link, calendar_event_id FROM online_classes WHERE id = ?')
        .bind(result.newClass.id)
        .first();

      expect(dbRow).not.toBeNull();
      expect(dbRow.meet_link).toBe('https://meet.google.com/late-link');
      expect(dbRow.calendar_event_id).toBe('google_async_evt');
    });

    it('bỏ cuộc sau maxAttempts (3 lần) nếu Google không trả meet_link → DB không có meet_link', async () => {
      vi.useFakeTimers();

      const body = {
        class_name: 'Never Gets Meet Link',
        schedule_rule: 'Weekly',
        schedule_time: '08:00-10:00',
        start_date: '2025-01-01',
      };

      gc.createOnlineClassEvent.mockResolvedValue({
        eventId: 'google_async_evt_fail',
        meetLink: '', // rỗng → trigger retry
      });

      // Không bao giờ trả về link
      gc.getMeetLinkFromEvent.mockResolvedValue(null);

      const createPromise = service.createClass(db, env, body, 1);
      await vi.runAllTimersAsync();
      const result = await createPromise;

      // Phải retry đúng 3 lần (maxAttempts)
      expect(gc.getMeetLinkFromEvent).toHaveBeenCalledTimes(3);

      // DB thật: class được tạo nhưng meet_link vẫn NULL hoặc rỗng (không có link)
      // D1 lưu NULL khi không có meet_link; Google trả '' → service không update → vẫn NULL
      const dbRow = await db
        .prepare('SELECT meet_link, calendar_event_id FROM online_classes WHERE id = ?')
        .bind(result.newClass.id)
        .first();

      expect(dbRow).not.toBeNull();
      // meet_link phải là null hoặc chuỗi rỗng (không có link thật)
      expect(dbRow.meet_link == null || dbRow.meet_link === '').toBe(true);
      expect(dbRow.calendar_event_id).toBe('google_async_evt_fail');
    });
  });

  describe('autoSyncMeetLink - đồng bộ meet_link sau khi class đã tồn tại', () => {
    it('cập nhật meet_link vào DB thật khi Google trả về link', async () => {
      // Seed class thủ công: có calendar_event_id nhưng KHÔNG có meet_link
      const insertResult = await db.prepare(
        `INSERT INTO online_classes
           (class_name, schedule_rule, schedule_time, start_date, calendar_event_id, created_by)
         VALUES ('Sync Test Class', 'Weekly', '19:00-21:00', '2025-01-01', 'evt_sync_123', 1)`
      ).run();
      const classId = insertResult.meta.last_row_id;

      gc.getMeetLinkFromEvent.mockResolvedValue('https://meet.google.com/synced-link');

      const cls = await db
        .prepare('SELECT id, class_name, calendar_event_id, meet_link FROM online_classes WHERE id = ?')
        .bind(classId).first();

      const syncedLink = await service.autoSyncMeetLink(db, env, cls);

      expect(syncedLink).toBe('https://meet.google.com/synced-link');

      // Xác nhận DB thật được cập nhật
      const updated = await db
        .prepare('SELECT meet_link FROM online_classes WHERE id = ?')
        .bind(classId).first();
      expect(updated.meet_link).toBe('https://meet.google.com/synced-link');
    });

    it('trả về null và KHÔNG cập nhật DB khi class đã có meet_link sẵn', async () => {
      // Seed class đã có đầy đủ cả hai field
      const insertResult = await db.prepare(
        `INSERT INTO online_classes
           (class_name, schedule_rule, schedule_time, start_date,
            calendar_event_id, meet_link, created_by)
         VALUES ('Already Has Link', 'Weekly', '10:00-12:00', '2025-01-01',
                 'evt_already', 'https://meet.google.com/existing', 1)`
      ).run();
      const classId = insertResult.meta.last_row_id;

      const cls = await db
        .prepare('SELECT id, class_name, calendar_event_id, meet_link FROM online_classes WHERE id = ?')
        .bind(classId).first();

      const result = await service.autoSyncMeetLink(db, env, cls);

      // Phải trả về null vì class đã có meet_link
      expect(result).toBeNull();

      // Google Calendar không được gọi
      expect(gc.getMeetLinkFromEvent).not.toHaveBeenCalled();
    });

    it('trả về null và KHÔNG cập nhật DB khi class không có calendar_event_id', async () => {
      const cls = {
        id: 999,
        class_name: 'No Calendar',
        calendar_event_id: null,
        meet_link: null,
      };

      const result = await service.autoSyncMeetLink(db, env, cls);
      expect(result).toBeNull();
      expect(gc.getMeetLinkFromEvent).not.toHaveBeenCalled();
    });
  });
});
