ALTER TABLE programs ADD COLUMN assessment_mode TEXT NOT NULL DEFAULT 'official_exam';
ALTER TABLE programs ADD COLUMN certificate_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE programs ADD COLUMN schedule_model TEXT NOT NULL DEFAULT 'session_based';

UPDATE programs
SET
  assessment_mode = CASE
    WHEN code IN ('VSTEP', 'VEPT') THEN 'official_exam'
    WHEN code = 'TIN_HOC' THEN 'mixed'
    ELSE 'official_exam'
  END,
  certificate_enabled = CASE
    WHEN code IN ('VSTEP', 'VEPT', 'TIN_HOC') THEN 1
    ELSE 0
  END,
  schedule_model = 'session_based'
WHERE assessment_mode IS NULL
   OR certificate_enabled IS NULL
   OR schedule_model IS NULL;

CREATE TABLE IF NOT EXISTS class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'lesson',
  title TEXT,
  content_outline TEXT,
  period_count INTEGER,
  teacher_id INTEGER,
  room TEXT,
  meeting_link TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_class_sessions_class_date
  ON class_sessions(class_id, session_date, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher
  ON class_sessions(teacher_id);
