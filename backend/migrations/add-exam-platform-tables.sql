-- Migration: Add Exam Platform Tables
-- Description: Complete schema for multi-certificate exam platform (VSTEP, TOPIK, JLPT, MOS, IC3)

-- ========================================
-- 1. EXAM_TYPES - Loại chứng chỉ
-- ========================================
CREATE TABLE IF NOT EXISTS exam_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    language TEXT,
    icon_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_types_code ON exam_types(code);

-- ========================================
-- 2. EXAM_TESTS - Bài thi cụ thể
-- ========================================
CREATE TABLE IF NOT EXISTS exam_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_type_id INTEGER NOT NULL,
    level TEXT,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    total_questions INTEGER DEFAULT 0,
    passing_score INTEGER,
    is_active BOOLEAN DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT 0,
    shuffle_options BOOLEAN DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_type_id) REFERENCES exam_types(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_exam_tests_type ON exam_tests(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_exam_tests_active ON exam_tests(is_active);
CREATE INDEX IF NOT EXISTS idx_exam_tests_level ON exam_tests(level);

-- ========================================
-- 3. EXAM_SECTIONS - Phần thi
-- ========================================
CREATE TABLE IF NOT EXISTS exam_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    order_index INTEGER NOT NULL,
    question_count INTEGER DEFAULT 0,
    instructions TEXT,
    is_locked_after_complete BOOLEAN DEFAULT 0,
    scoring_rule TEXT DEFAULT 'points_based',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES exam_tests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_sections_test ON exam_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_exam_sections_order ON exam_sections(test_id, order_index);

-- ========================================
-- 4. EXAM_QUESTIONS - Câu hỏi
-- ========================================
CREATE TABLE IF NOT EXISTS exam_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('mcq', 'multi_select', 'fill_blank', 'matching', 'ordering', 'drag_drop', 'essay', 'speaking', 'reading_passage_group')),
    question_text TEXT NOT NULL,
    question_data TEXT,
    options_json TEXT,
    answer_key TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
    explanation TEXT,
    audio_url TEXT,
    image_url TEXT,
    order_index INTEGER NOT NULL,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES exam_sections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_section ON exam_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_order ON exam_questions(section_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exam_questions_type ON exam_questions(type);

-- ========================================
-- 5. EXAM_ATTEMPTS - Lần thi của học viên
-- ========================================
CREATE TABLE IF NOT EXISTS exam_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    test_version INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    submitted_at DATETIME,
    expires_at DATETIME,
    score INTEGER,
    max_score INTEGER,
    section_scores TEXT,
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted', 'expired', 'abandoned')),
    time_spent_seconds INTEGER DEFAULT 0,
    last_heartbeat DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES exam_tests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_test ON exam_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_test_status ON exam_attempts(student_id, test_id, status);

-- ========================================
-- 6. EXAM_ATTEMPT_ANSWERS - Câu trả lời chi tiết
-- ========================================
CREATE TABLE IF NOT EXISTS exam_attempt_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    question_version INTEGER NOT NULL,
    answer_data TEXT NOT NULL,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_attempt_answers_attempt ON exam_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_answers_question ON exam_attempt_answers(question_id);

-- ========================================
-- 7. EXAM_ATTEMPT_SECTIONS - Track section completion
-- ========================================
CREATE TABLE IF NOT EXISTS exam_attempt_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,
    is_locked BOOLEAN DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES exam_sections(id) ON DELETE CASCADE,
    UNIQUE(attempt_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_attempt_sections_attempt ON exam_attempt_sections(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_sections_section ON exam_attempt_sections(section_id);








