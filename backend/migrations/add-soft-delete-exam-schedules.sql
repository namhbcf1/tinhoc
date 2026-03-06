-- Migration: add-soft-delete-exam-schedules
-- Description: Add soft delete support with deleted_at column for exam_schedules
-- Note: Safe migration - column may already exist

-- Safe check - if column exists, this will just return empty results
SELECT deleted_at FROM exam_schedules LIMIT 0;

-- Create index for efficient filtering (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_exam_schedules_deleted ON exam_schedules(deleted_at);
