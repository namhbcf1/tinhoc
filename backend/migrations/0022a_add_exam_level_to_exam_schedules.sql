-- Migration: Add exam_level column to exam_schedules table
-- Purpose: Store schedule-specific training level (A2, B1, B2, C1) for admin exam setup

ALTER TABLE exam_schedules ADD COLUMN exam_level TEXT;

CREATE INDEX IF NOT EXISTS idx_exam_schedules_level ON exam_schedules(exam_level);
