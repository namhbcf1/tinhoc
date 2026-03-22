-- Canonical class-centric learning hub schema for vantrangedu <-> vantrangexam

ALTER TABLE exam_schedules ADD COLUMN exam_category_id INTEGER;
ALTER TABLE exam_schedules ADD COLUMN exam_type_id INTEGER;
ALTER TABLE exam_schedules ADD COLUMN class_seed_name TEXT;
ALTER TABLE exam_schedules ADD COLUMN class_seed_description TEXT;
ALTER TABLE exam_schedules ADD COLUMN class_seed_schedule_rule TEXT;
ALTER TABLE exam_schedules ADD COLUMN class_seed_schedule_time TEXT;
ALTER TABLE exam_schedules ADD COLUMN class_seed_timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh';
ALTER TABLE exam_schedules ADD COLUMN class_seed_start_date DATE;
ALTER TABLE exam_schedules ADD COLUMN class_seed_end_date DATE;
ALTER TABLE exam_schedules ADD COLUMN class_seed_teacher_name TEXT;
ALTER TABLE exam_schedules ADD COLUMN class_seed_max_students INTEGER DEFAULT 50;

ALTER TABLE online_classes ADD COLUMN source_exam_schedule_id INTEGER;
ALTER TABLE online_classes ADD COLUMN source_kind TEXT DEFAULT 'exam_schedule';
ALTER TABLE online_classes ADD COLUMN exam_category_id INTEGER;
ALTER TABLE online_classes ADD COLUMN exam_type_id INTEGER;

ALTER TABLE documents ADD COLUMN r2_key TEXT;
ALTER TABLE documents ADD COLUMN exam_category_id INTEGER;
ALTER TABLE documents ADD COLUMN exam_type_id INTEGER;

ALTER TABLE assignments ADD COLUMN exam_category_id INTEGER;
ALTER TABLE assignments ADD COLUMN exam_type_id INTEGER;

ALTER TABLE notifications ADD COLUMN audience_scope TEXT DEFAULT 'all';
ALTER TABLE notifications ADD COLUMN online_class_id INTEGER;
ALTER TABLE notifications ADD COLUMN delivery_channels TEXT DEFAULT 'in_app';

CREATE TABLE IF NOT EXISTS assignment_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS practice_exam_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  online_class_id INTEGER,
  student_id INTEGER,
  assigned_by INTEGER NOT NULL,
  available_from DATETIME,
  due_at DATETIME,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES vstep_exams(id) ON DELETE CASCADE,
  FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  online_class_id INTEGER,
  assigned_teacher_id INTEGER,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, online_class_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teacher_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES teacher_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS online_class_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  online_class_id INTEGER NOT NULL,
  session_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  meet_link TEXT,
  note TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (online_class_id, session_date),
  FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS online_class_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT,
  checked_in_at DATETIME,
  marked_by INTEGER,
  marked_by_role TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, student_id),
  FOREIGN KEY (session_id) REFERENCES online_class_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

UPDATE documents
SET r2_key = COALESCE(r2_key, file_url)
WHERE r2_key IS NULL AND file_url IS NOT NULL AND file_url != '';

UPDATE exam_schedules
SET exam_category_id = (
  SELECT ec.id
  FROM exam_categories ec
  WHERE LOWER(TRIM(ec.name)) = LOWER(TRIM(exam_schedules.exam_type))
  ORDER BY ec.id
  LIMIT 1
)
WHERE exam_category_id IS NULL
  AND exam_type IS NOT NULL
  AND TRIM(exam_type) != '';

UPDATE exam_schedules
SET exam_type_id = (
  SELECT et.id
  FROM exam_types et
  WHERE LOWER(TRIM(et.code)) = LOWER(TRIM(exam_schedules.exam_type))
     OR LOWER(TRIM(et.name)) = LOWER(TRIM(exam_schedules.exam_type))
  ORDER BY et.id
  LIMIT 1
)
WHERE exam_type_id IS NULL
  AND exam_type IS NOT NULL
  AND TRIM(exam_type) != '';

UPDATE exam_schedules
SET class_seed_name = COALESCE(class_seed_name, exam_name),
    class_seed_description = COALESCE(class_seed_description, notes),
    class_seed_schedule_rule = COALESCE(class_seed_schedule_rule, 'weekly'),
    class_seed_schedule_time = COALESCE(
      class_seed_schedule_time,
      printf(
        '%s-%s',
        strftime('%H:%M', exam_date),
        strftime('%H:%M', datetime(exam_date, printf('+%d minutes', COALESCE(duration_minutes, 120))))
      )
    ),
    class_seed_timezone = COALESCE(class_seed_timezone, 'Asia/Ho_Chi_Minh'),
    class_seed_start_date = COALESCE(class_seed_start_date, date(exam_date)),
    class_seed_teacher_name = COALESCE(class_seed_teacher_name, NULL),
    class_seed_max_students = COALESCE(class_seed_max_students, 50)
WHERE class_seed_name IS NULL
   OR class_seed_schedule_rule IS NULL
   OR class_seed_schedule_time IS NULL
   OR class_seed_start_date IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_online_classes_source_exam_schedule_id
  ON online_classes(source_exam_schedule_id)
  WHERE source_exam_schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_classes_exam_category_id
  ON online_classes(exam_category_id);

CREATE INDEX IF NOT EXISTS idx_online_classes_exam_type_id
  ON online_classes(exam_type_id);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_category_id
  ON exam_schedules(exam_category_id);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_type_id
  ON exam_schedules(exam_type_id);

CREATE INDEX IF NOT EXISTS idx_document_permissions_online_class_id
  ON document_permissions(online_class_id);

CREATE INDEX IF NOT EXISTS idx_documents_exam_category_id
  ON documents(exam_category_id);

CREATE INDEX IF NOT EXISTS idx_documents_exam_type_id
  ON documents(exam_type_id);

CREATE INDEX IF NOT EXISTS idx_assignments_exam_category_id
  ON assignments(exam_category_id);

CREATE INDEX IF NOT EXISTS idx_assignments_exam_type_id
  ON assignments(exam_type_id);

CREATE INDEX IF NOT EXISTS idx_practice_exam_assignments_online_class_id
  ON practice_exam_assignments(online_class_id);

CREATE INDEX IF NOT EXISTS idx_practice_exam_assignments_student_id
  ON practice_exam_assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_teacher_conversations_student_class
  ON teacher_conversations(student_id, online_class_id);

CREATE INDEX IF NOT EXISTS idx_teacher_messages_conversation_id
  ON teacher_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_online_class_sessions_class_date
  ON online_class_sessions(online_class_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_online_class_attendance_session_id
  ON online_class_attendance(session_id, student_id);

CREATE INDEX IF NOT EXISTS idx_notifications_class_scope
  ON notifications(online_class_id, audience_scope, created_at DESC);
