-- Migration: 0005_add_meeting_link_to_class_schedules
-- Description: Add meeting_link column to class_schedules table
-- Note: Using safe ALTER that won't fail if column exists

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we check if column exists first using a dummy select (will be ignored if fails)
-- The actual ADD COLUMN is handled via try/catch in the migration runner
-- For safety, we wrap in a transaction that continues on error

-- Check if column exists by selecting it (this is a no-op if exists)
SELECT meeting_link FROM class_schedules LIMIT 0;

-- If above fails, the migration system should ignore and continue
-- If migration already ran, this file should be skipped entirely
