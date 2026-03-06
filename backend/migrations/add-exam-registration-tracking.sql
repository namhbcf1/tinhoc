-- Migration: Add tracking columns to exam_registrations
-- Note: Safe migration - table structure already exists, this is a no-op verification

-- Safe check - verify the table has expected columns
SELECT id, exam_id, student_id, status, created_at, created_by, approved_at, approved_by 
FROM exam_registrations LIMIT 0;
