-- Add backup Zoom link field to exam_schedules
ALTER TABLE exam_schedules ADD COLUMN zoom_link_backup TEXT;
