-- ========================================
-- EXAM MANAGEMENT SYSTEM SCHEMA
-- Generic exam platform (separate from vstep_* tables)
-- ========================================

-- 1. Exams
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE,
  level TEXT DEFAULT 'B1',
  duration INTEGER NOT NULL DEFAULT 60,       -- total minutes
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  course_id INTEGER,                           -- optional link to a course
  thumbnail_url TEXT,
  questions_per_exam INTEGER DEFAULT 0,        -- for randomized pools
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sections (Listening / Reading / Writing / Speaking)
CREATE TABLE IF NOT EXISTS exam_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('LISTENING','READING','WRITING','SPEAKING')),
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  instructions TEXT,
  FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- 3. Question Groups (passages / audio shared by multiple questions)
CREATE TABLE IF NOT EXISTS exam_question_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  section_id INTEGER NOT NULL,
  title TEXT,
  text_content TEXT,
  audio_url TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  settings_json TEXT,
  FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY(section_id) REFERENCES exam_sections(id) ON DELETE CASCADE
);

-- 4. Questions
CREATE TABLE IF NOT EXISTS exam_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  section_id INTEGER NOT NULL,
  group_id INTEGER,                            -- NULL = standalone
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('MULTIPLE_CHOICE','ESSAY','RECORDING','FILL_IN_BLANK')),
  options_json TEXT,                           -- ["A","B","C","D"]
  correct_answer TEXT,
  points REAL DEFAULT 1,
  settings_json TEXT,                          -- {prep_seconds, speak_seconds, …}
  order_index INTEGER DEFAULT 0,
  explanation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY(section_id) REFERENCES exam_sections(id) ON DELETE CASCADE,
  FOREIGN KEY(group_id) REFERENCES exam_question_groups(id) ON DELETE SET NULL
);

-- 5. Attempts
CREATE TABLE IF NOT EXISTS exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed','abandoned')),
  grading_status TEXT DEFAULT 'pending' CHECK(grading_status IN ('pending','auto_graded','finalized')),
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  submit_time DATETIME,
  score_listening REAL,
  score_reading REAL,
  score_writing REAL,
  score_speaking REAL,
  total_score REAL,
  teacher_feedback TEXT,
  graded_by INTEGER,
  graded_at DATETIME,
  FOREIGN KEY(exam_id) REFERENCES exams(id),
  FOREIGN KEY(student_id) REFERENCES students(id)
);

-- 6. Answers
CREATE TABLE IF NOT EXISTS exam_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer_text TEXT,
  audio_url TEXT,
  score REAL,
  feedback TEXT,
  graded_by INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY(question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
  UNIQUE(attempt_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exam_sections_exam ON exam_sections(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_groups_section ON exam_question_groups(section_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_section ON exam_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_group ON exam_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
