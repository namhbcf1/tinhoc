-- Migration: Add Exam Platform Control System
-- Description: Add approval workflow, registration system, and monitoring

-- ========================================
-- 1. UPDATE exam_tests TABLE
-- ========================================
ALTER TABLE exam_tests ADD COLUMN status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending_review', 'approved', 'rejected'));
ALTER TABLE exam_tests ADD COLUMN reviewed_by INTEGER;
ALTER TABLE exam_tests ADD COLUMN reviewed_at DATETIME;
ALTER TABLE exam_tests ADD COLUMN rejection_reason TEXT;
ALTER TABLE exam_tests ADD COLUMN requires_registration BOOLEAN DEFAULT 0;
ALTER TABLE exam_tests ADD COLUMN max_attempts_per_student INTEGER;
ALTER TABLE exam_tests ADD COLUMN registration_deadline DATETIME;
ALTER TABLE exam_tests ADD COLUMN exam_schedule_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_exam_tests_status ON exam_tests(status);
CREATE INDEX IF NOT EXISTS idx_exam_tests_reviewed_by ON exam_tests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_exam_tests_exam_schedule_id ON exam_tests(exam_schedule_id);

-- Update existing tests to approved status
UPDATE exam_tests SET status = 'approved' WHERE status IS NULL;

-- ========================================
-- 2. EXAM_TEST_REVIEWS - Lịch sử review
-- ========================================
CREATE TABLE IF NOT EXISTS exam_test_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('submit', 'approve', 'reject', 'request_changes')),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_id) REFERENCES exam_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_exam_test_reviews_test ON exam_test_reviews(test_id);
CREATE INDEX IF NOT EXISTS idx_exam_test_reviews_reviewer ON exam_test_reviews(reviewer_id);

-- ========================================
-- 3. EXAM_TEST_REGISTRATIONS - Đăng ký thi
-- ========================================
CREATE TABLE IF NOT EXISTS exam_test_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by INTEGER,
    rejection_reason TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES exam_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES admins(id),
    UNIQUE(student_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_test_registrations_student ON exam_test_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_test_registrations_test ON exam_test_registrations(test_id);
CREATE INDEX IF NOT EXISTS idx_exam_test_registrations_status ON exam_test_registrations(status);

-- ========================================
-- 4. EXAM_ACTIVITY_LOGS - Monitoring
-- ========================================
CREATE TABLE IF NOT EXISTS exam_activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER,
    student_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES exam_tests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_activity_logs_attempt ON exam_activity_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_activity_logs_student ON exam_activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_activity_logs_test ON exam_activity_logs(test_id);
CREATE INDEX IF NOT EXISTS idx_exam_activity_logs_action ON exam_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_exam_activity_logs_created ON exam_activity_logs(created_at);

-- ========================================
-- 5. UPDATE exam_schedules TABLE
-- ========================================
ALTER TABLE exam_schedules ADD COLUMN exam_test_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_test_id ON exam_schedules(exam_test_id);








