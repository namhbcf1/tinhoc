-- Migration: Add 'rejected' status to exam_registrations
-- Note: Safe migration - table structure already exists, this is a no-op verification

-- Safe check - verify the table has expected columns including status
SELECT id, exam_id, student_id, status, created_at, created_by, approved_at, approved_by 
FROM exam_registrations LIMIT 0;

-- Indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_exam_registrations_exam ON exam_registrations(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_registrations_student ON exam_registrations(student_id);
