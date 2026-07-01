/**
 * setup-real-db.js
 *
 * Khởi tạo DB thật (SQLite in-memory qua @cloudflare/vitest-pool-workers)
 * cho toàn bộ test suite online-classes.
 *
 * Cách dùng trong file test:
 *   import { setupRealDB } from '../setup-real-db.js';
 *   import { env } from 'cloudflare:test';
 *
 *   beforeAll(async () => { await setupRealDB(env.DB); });
 *
 * KHÔNG dùng mock, KHÔNG fake data - gọi trực tiếp D1 binding thật.
 */

// ─── Bảng students (phụ thuộc: online_classes dùng FK) ───────────────────────

const SQL_CREATE_STUDENTS = `
CREATE TABLE IF NOT EXISTS students (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cccd           TEXT UNIQUE NOT NULL,
  ho             TEXT NOT NULL,
  ten_dem        TEXT NOT NULL,
  ten            TEXT NOT NULL,
  ho_ten_full    TEXT NOT NULL,
  ngay_sinh      DATE NOT NULL,
  noi_sinh       TEXT NOT NULL,
  gioi_tinh      TEXT NOT NULL CHECK(gioi_tinh IN ('Nam', 'Nữ')),
  email          TEXT NOT NULL,
  sdt            TEXT NOT NULL,
  dia_chi        TEXT NOT NULL,
  don_vi_cong_tac TEXT,
  nganh_dang_hoc TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// ─── Bảng admins (phụ thuộc: online_classes.created_by → FK) ─────────────────

const SQL_CREATE_ADMINS = `
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT DEFAULT 'admin'
                     CHECK(role IN ('super_admin', 'admin', 'staff')),
  email         TEXT,
  phone         TEXT,
  last_login    DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// ─── Bảng online_classes ──────────────────────────────────────────────────────

const SQL_CREATE_ONLINE_CLASSES = `
CREATE TABLE IF NOT EXISTS online_classes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name        TEXT NOT NULL,
  description       TEXT,
  schedule_rule     TEXT NOT NULL,
  schedule_time     TEXT NOT NULL,
  timezone          TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  recurrence        TEXT,
  start_date        DATE NOT NULL,
  end_date          DATE,
  meet_link         TEXT,
  calendar_event_id TEXT,
  teacher_name      TEXT,
  max_students      INTEGER DEFAULT 50,
  status            TEXT DEFAULT 'active'
                         CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
  created_by        INTEGER,
  source_exam_schedule_id INTEGER,
  source_kind       TEXT DEFAULT 'exam_schedule',
  exam_category_id  INTEGER,
  exam_type_id      INTEGER,
  organizer_uuid    TEXT,
  program_uuid      TEXT,
  level_uuid        TEXT,
  custom_field_payload TEXT,
  override_payload  TEXT,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id)
)`;

// ─── Index cho online_classes ─────────────────────────────────────────────────

const SQL_IDX_ONLINE_CLASSES_STATUS = `
CREATE INDEX IF NOT EXISTS idx_online_classes_status
  ON online_classes(status)`;

const SQL_IDX_ONLINE_CLASSES_DATE = `
CREATE INDEX IF NOT EXISTS idx_online_classes_start_date
  ON online_classes(start_date)`;

// ─── Bảng online_class_enrollments ───────────────────────────────────────────

const SQL_CREATE_ENROLLMENTS = `
CREATE TABLE IF NOT EXISTS online_class_enrollments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  online_class_id INTEGER NOT NULL,
  student_id      INTEGER NOT NULL,
  status          TEXT DEFAULT 'active'
                       CHECK(status IN ('active', 'cancelled', 'pending', 'rejected')),
  approved_by     TEXT,
  approved_at     DATETIME,
  rejection_reason TEXT,
  enrolled_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id)      REFERENCES students(id)       ON DELETE CASCADE,
  UNIQUE(online_class_id, student_id)
)`;

// ─── Index cho enrollments ────────────────────────────────────────────────────

const SQL_IDX_ENROLLMENTS_CLASS = `
CREATE INDEX IF NOT EXISTS idx_online_enrollments_class
  ON online_class_enrollments(online_class_id)`;

const SQL_IDX_ENROLLMENTS_STUDENT = `
CREATE INDEX IF NOT EXISTS idx_online_enrollments_student
  ON online_class_enrollments(student_id)`;

const SQL_IDX_ENROLLMENTS_STATUS = `
CREATE INDEX IF NOT EXISTS idx_online_enrollments_status
  ON online_class_enrollments(status)`;

// ─── Bảng class_schedules (dùng trong một số query JOIN) ─────────────────────

const SQL_CREATE_CLASS_SCHEDULES = `
CREATE TABLE IF NOT EXISTS class_schedules (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id     INTEGER NOT NULL,
  day_of_week  INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  room         TEXT,
  notes        TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES online_classes(id) ON DELETE CASCADE
)`;

// ─── Tập hợp toàn bộ câu lệnh theo đúng thứ tự phụ thuộc ────────────────────

const SETUP_STATEMENTS = [
  SQL_CREATE_ADMINS,
  SQL_CREATE_STUDENTS,
  SQL_CREATE_ONLINE_CLASSES,
  SQL_IDX_ONLINE_CLASSES_STATUS,
  SQL_IDX_ONLINE_CLASSES_DATE,
  SQL_CREATE_ENROLLMENTS,
  SQL_IDX_ENROLLMENTS_CLASS,
  SQL_IDX_ENROLLMENTS_STUDENT,
  SQL_IDX_ENROLLMENTS_STATUS,
  SQL_CREATE_CLASS_SCHEDULES,
];

// ─── Hàm công khai ────────────────────────────────────────────────────────────

/**
 * Thực thi toàn bộ DDL vào D1 binding thật được inject bởi vitest-pool-workers.
 *
 * @param db  env.DB từ cloudflare:test
 */
export async function setupRealDB(db: D1Database): Promise<void> {
  if (!db || typeof db.prepare !== 'function') {
    throw new Error(
      '[setup-real-db] db không hợp lệ. ' +
      'Đảm bảo gọi setupRealDB(env.DB) với env từ "cloudflare:test".'
    );
  }

  for (const sql of SETUP_STATEMENTS) {
    // D1 batch hoặc exec đều được; dùng prepare().run() để nhất quán với
    // cách repository layer sử dụng DB trong production.
    await db.prepare(sql.trim()).run();
  }
}

/**
 * Xóa toàn bộ dữ liệu (không xóa schema) giữa các test case để cô lập dữ liệu.
 * Gọi trong afterEach nếu cần.
 */
export async function clearRealDB(db: D1Database): Promise<void> {
  const tables = [
    'online_class_enrollments',
    'class_schedules',
    'online_classes',
    'students',
    'admins',
  ];
  for (const table of tables) {
    await db.prepare(`DELETE FROM ${table}`).run();
  }
}
