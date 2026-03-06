-- Migration: Fix registrations status CHECK constraint
-- Issue: Current constraint only allows ('pending', 'confirmed', 'paid', 'cancelled')
-- Fix: Update to allow ('pending', 'approved', 'studying', 'completed', 'certified', 'cancelled')

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the table with the correct constraint

-- Step 1: Create new table with correct constraint
CREATE TABLE IF NOT EXISTS registrations_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    so_phach TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'studying', 'completed', 'certified', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(student_id, class_id)
);

-- Step 2: Copy data from old table (map old status values to new ones)
INSERT INTO registrations_new (id, student_id, class_id, so_phach, status, created_at, updated_at)
SELECT 
    id, 
    student_id, 
    class_id, 
    so_phach, 
    CASE 
        WHEN status = 'confirmed' THEN 'approved'
        WHEN status = 'paid' THEN 'studying'
        ELSE status
    END as status,
    created_at, 
    updated_at
FROM registrations;

-- Step 3: Drop old table
DROP TABLE registrations;

-- Step 4: Rename new table to registrations
ALTER TABLE registrations_new RENAME TO registrations;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_class ON registrations(class_id);
