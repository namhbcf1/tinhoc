BEGIN TRANSACTION;

ALTER TABLE attendance RENAME TO attendance_old;

CREATE TABLE attendance (
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

INSERT INTO attendance (
    id,
    registration_id,
    class_id,
    attendance_date,
    status,
    notes,
    marked_by,
    marked_by_role,
    created_at,
    updated_at
)
SELECT
    id,
    registration_id,
    class_id,
    attendance_date,
    status,
    notes,
    marked_by,
    COALESCE(marked_by_role, 'admin'),
    created_at,
    updated_at
FROM attendance_old;

DROP TABLE attendance_old;

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
    ON attendance(class_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_registration_date
    ON attendance(registration_id, attendance_date);

COMMIT;
