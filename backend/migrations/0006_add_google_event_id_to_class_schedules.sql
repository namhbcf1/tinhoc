-- Migration: 0006_add_google_event_id_to_class_schedules
-- Description: Add google_event_id and meeting_status columns for Google Calendar integration
-- Note: Safe migration - columns may already exist

-- These are no-op selects to verify columns exist (migration already applied)
SELECT google_event_id FROM class_schedules LIMIT 0;
SELECT meeting_status FROM class_schedules LIMIT 0;

-- Index creation is already idempotent with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_class_schedules_google_event ON class_schedules(google_event_id);
