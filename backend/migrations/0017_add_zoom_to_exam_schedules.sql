-- Add Zoom meeting fields to exam_schedules
ALTER TABLE exam_schedules ADD COLUMN zoom_link TEXT;
ALTER TABLE exam_schedules ADD COLUMN zoom_meeting_id TEXT;
ALTER TABLE exam_schedules ADD COLUMN zoom_passcode TEXT;
