-- Migration: Remove FOREIGN KEY constraints from attendance table
-- Reason: Support online classes using negative IDs convention
-- Date: 2026-01-22

-- SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

-- 1. Create new table without FOREIGN KEY constraints
CREATE TABLE IF NOT EXISTS attendance_no_fk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    attendance_date DATE NOT NULL,
    status TEXT CHECK(status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    marked_by INTEGER,
    marked_by_role TEXT DEFAULT 'admin' CHECK(marked_by_role IN ('admin', 'teacher')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(registration_id, class_id, attendance_date)
);

-- 2. Copy all existing data
INSERT INTO attendance_no_fk (id, registration_id, class_id, attendance_date, status, notes, marked_by, marked_by_role, created_at, updated_at)
SELECT id, registration_id, class_id, attendance_date, status, notes, marked_by, COALESCE(marked_by_role, 'admin'), created_at, updated_at 
FROM attendance;

-- 3. Drop old table
DROP TABLE IF EXISTS attendance;

-- 4. Rename new table
ALTER TABLE attendance_no_fk RENAME TO attendance;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

