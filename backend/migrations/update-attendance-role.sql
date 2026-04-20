-- Migration: Update attendance table to support teacher marking
-- Description: Remove FK to admins(id) for marked_by and add marked_by_role

-- 1. Create new table without marked_by FK and with marked_by_role
CREATE TABLE IF NOT EXISTS attendance_new (
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
    FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(registration_id, class_id, attendance_date)
);

-- 2. Copy data
INSERT INTO attendance_new (id, registration_id, class_id, attendance_date, status, notes, marked_by, created_at, updated_at)
SELECT id, registration_id, class_id, attendance_date, status, notes, marked_by, created_at, updated_at FROM attendance;

-- 3. Drop old table
DROP TABLE attendance;

-- 4. Rename new table
ALTER TABLE attendance_new RENAME TO attendance;

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_attendance_registration ON attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
