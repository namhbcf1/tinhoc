/**
 * Shared setup cho online-classes test suite.
 * KHÔNG dùng vi.mock(). Dùng DB thật từ cloudflare:test env.
 * Import bởi: online-classes-auth.test.js, online-classes-endpoints.test.js
 */

import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import onlineClassesRouter from '../../routes/online-classes.js';

// ─── DDL: Tạo bảng thật trong D1 test sandbox ────────────────────────────────

export async function setupDatabase() {
  const db = env.DB;

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      description TEXT,
      schedule_rule TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
      recurrence TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      meet_link TEXT,
      calendar_event_id TEXT,
      teacher_name TEXT,
      max_students INTEGER DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'active',
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cccd TEXT UNIQUE NOT NULL,
      ho TEXT,
      ten_dem TEXT,
      ten TEXT,
      ho_ten_full TEXT,
      sdt TEXT,
      email TEXT,
      ngay_sinh TEXT,
      gioi_tinh TEXT,
      cccd_front_image_id TEXT,
      cccd_back_image_id TEXT,
      photo_3x4_image_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS online_class_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      online_class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT,
      approved_by TEXT,
      rejection_reason TEXT,
      FOREIGN KEY (online_class_id) REFERENCES online_classes(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    )
  `).run();
}

// ─── Dọn dữ liệu giữa các test ───────────────────────────────────────────────

export async function cleanDatabase() {
  const db = env.DB;
  await db.prepare('DELETE FROM online_class_enrollments').run();
  await db.prepare('DELETE FROM online_classes').run();
  await db.prepare('DELETE FROM students').run();
}

// ─── Factory: tạo app thật với env.DB ────────────────────────────────────────

export function createTestApp() {
  const app = new Hono();

  // Inject env thật vào context — JWT_SECRET cố định cho test
  app.use('*', async (c, next) => {
    c.env = {
      DB: env.DB,
      JWT_SECRET: 'test-secret-key-for-vitest'
    };
    await next();
  });

  app.route('/online-classes', onlineClassesRouter);
  return app;
}
