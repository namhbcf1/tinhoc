-- Add optional Google Maps URL per exam schedule
ALTER TABLE exam_schedules
ADD COLUMN google_map_url TEXT;
