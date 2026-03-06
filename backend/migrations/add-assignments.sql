-- ========================================
-- Assignments Feature - D1 Migration
-- ========================================

-- Bài tập do giáo viên/admin tạo
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  class_id INTEGER NOT NULL,
  due_date TEXT, -- ISO format, NULL = không hạn
  max_file_size INTEGER DEFAULT 10485760, -- 10MB
  allowed_types TEXT DEFAULT 'image/*,video/*,application/pdf',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  max_attempts INTEGER DEFAULT 1, -- Số lần nộp tối đa
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES online_classes(id) ON DELETE CASCADE
);

-- Bài nộp của học viên
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  attempt INTEGER DEFAULT 1, -- Lần nộp thứ mấy
  r2_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','graded','rejected')),
  grade TEXT, -- Điểm (text để linh hoạt: A, B, 8/10, etc.)
  feedback TEXT,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  graded_at TEXT,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Index cho query nhanh
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON assignment_submissions(student_id);

-- Unique constraint: 1 student + 1 assignment + 1 attempt = 1 submission
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_submission 
ON assignment_submissions(assignment_id, student_id, attempt);
