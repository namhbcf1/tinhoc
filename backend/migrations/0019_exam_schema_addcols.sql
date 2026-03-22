-- Migration 0019: Add missing columns to existing exam tables
-- D1/SQLite: no IF NOT EXISTS for ALTER TABLE, use separate statements

-- exams: add missing columns
ALTER TABLE exams ADD COLUMN code TEXT;
ALTER TABLE exams ADD COLUMN level TEXT DEFAULT 'B1';
ALTER TABLE exams ADD COLUMN status TEXT DEFAULT 'draft';
ALTER TABLE exams ADD COLUMN thumbnail_url TEXT;
ALTER TABLE exams ADD COLUMN questions_per_exam INTEGER DEFAULT 0;
ALTER TABLE exams ADD COLUMN layout_mode TEXT DEFAULT 'LANGUAGE';
ALTER TABLE exams ADD COLUMN category_id INTEGER;
ALTER TABLE exams ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE exams ADD COLUMN created_by INTEGER;

-- exam_questions: add missing columns
ALTER TABLE exam_questions ADD COLUMN group_id INTEGER;
ALTER TABLE exam_questions ADD COLUMN correct_answer TEXT;
ALTER TABLE exam_questions ADD COLUMN exam_id INTEGER;

-- exam_attempts: add missing columns
ALTER TABLE exam_attempts ADD COLUMN exam_id INTEGER;
ALTER TABLE exam_attempts ADD COLUMN grading_status TEXT DEFAULT 'auto_graded';

-- exam_answers: add missing columns
ALTER TABLE exam_answers ADD COLUMN is_correct INTEGER DEFAULT 0;
ALTER TABLE exam_answers ADD COLUMN score REAL DEFAULT 0;
ALTER TABLE exam_answers ADD COLUMN grader_feedback TEXT;
ALTER TABLE exam_answers ADD COLUMN graded_by INTEGER;
ALTER TABLE exam_answers ADD COLUMN graded_at DATETIME;

-- exam_question_groups: new table
CREATE TABLE IF NOT EXISTS exam_question_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  exam_id INTEGER,
  title TEXT,
  text_content TEXT,
  audio_url TEXT,
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  settings_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_q_groups_section ON exam_question_groups(section_id);
CREATE INDEX IF NOT EXISTS idx_exam_q_groups_exam ON exam_question_groups(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_group ON exam_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
