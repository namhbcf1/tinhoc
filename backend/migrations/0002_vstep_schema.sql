-- ========================================
-- VSTEP EXAM SYSTEM SCHEMA (PREMIUM)
-- ========================================

-- 1. Exams Table
-- "Clean Slate": We use vstep_ prefix to isolate from old system
CREATE TABLE IF NOT EXISTS vstep_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE, -- e.g. VSTEP-B1-01
    level TEXT DEFAULT 'B1', -- A1, A2, B1, B2, C1, C2
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    duration INTEGER NOT NULL, -- Total minutes (e.g. 180)
    thumbnail_url TEXT, -- For premium UI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER -- Link to admins(id)
);

-- 2. Sections (Listening, Reading, Writing, Speaking)
CREATE TABLE IF NOT EXISTS vstep_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('LISTENING', 'READING', 'WRITING', 'SPEAKING')),
    title TEXT NOT NULL, -- e.g. "Listening Comprehension"
    order_index INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0, -- Minutes for this section
    instructions TEXT, -- Specific instructions for this section
    FOREIGN KEY(exam_id) REFERENCES vstep_exams(id) ON DELETE CASCADE
);

-- 3. Question Groups (Context)
-- CRITICAL for VSTEP: Handles Reading Passages and Listening Audio shared by multiple questions
CREATE TABLE IF NOT EXISTS vstep_question_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    title TEXT, -- e.g. "Part 1: Social Interaction"
    text_content TEXT, -- Reading passage (HTML supported)
    audio_url TEXT, -- Listening audio R2 link
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    settings_json TEXT, -- Extra settings if needed
    FOREIGN KEY(section_id) REFERENCES vstep_sections(id) ON DELETE CASCADE
);

-- 4. Questions
CREATE TABLE IF NOT EXISTS vstep_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER, -- Can be NULL for standalone questions
    section_id INTEGER NOT NULL, -- Redundant but useful for fast queries
    content TEXT NOT NULL, -- The question text
    type TEXT NOT NULL CHECK(type IN ('MULTIPLE_CHOICE', 'ESSAY', 'RECORDING', 'FILL_IN_BLANK')),
    
    -- JSON Fields for flexibility
    options_json TEXT, -- ["Option A", "Option B", "Option C", "Option D"]
    correct_answer TEXT, -- "A" or "Answer Key"
    
    -- Scoring & Settings
    points REAL DEFAULT 1,
    settings_json TEXT, -- {"prep_seconds": 60, "speak_seconds": 120} for Speaking
    order_index INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY(group_id) REFERENCES vstep_question_groups(id) ON DELETE CASCADE,
    FOREIGN KEY(section_id) REFERENCES vstep_sections(id) ON DELETE CASCADE
);

-- 5. Attempts (Tracking Student Progress)
CREATE TABLE IF NOT EXISTS vstep_exam_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    exam_id INTEGER NOT NULL,
    
    -- Timing
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    submit_time DATETIME,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'abandoned')),
    grading_status TEXT DEFAULT 'pending' CHECK(grading_status IN ('pending', 'auto_graded', 'finalized')),
    
    -- Scores (Separated for Analysis)
    score_listening REAL,
    score_reading REAL,
    score_writing REAL,
    score_speaking REAL,
    total_score REAL,
    
    teacher_feedback TEXT, -- General feedback
    inspector_id INTEGER, -- Teacher who graded
    
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(exam_id) REFERENCES vstep_exams(id)
);

-- 6. Answers (Student Responses)
CREATE TABLE IF NOT EXISTS vstep_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    
    answer_text TEXT, -- "A" for MCQ, Full text for Essay, R2 URL for Recording
    
    score REAL, -- Score for this specific question
    feedback TEXT, -- Specific feedback for this answer
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY(attempt_id) REFERENCES vstep_exam_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY(question_id) REFERENCES vstep_questions(id) ON DELETE CASCADE,
    UNIQUE(attempt_id, question_id) -- One answer per question per attempt
);

-- Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_vstep_sections_exam ON vstep_sections(exam_id);
CREATE INDEX IF NOT EXISTS idx_vstep_groups_section ON vstep_question_groups(section_id);
CREATE INDEX IF NOT EXISTS idx_vstep_questions_group ON vstep_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_vstep_questions_section ON vstep_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_vstep_attempts_student ON vstep_exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_vstep_answers_attempt ON vstep_answers(attempt_id);
