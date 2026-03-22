-- Migration: Add exam_type column to exam_schedules table
-- Purpose: Allow admin to specify exam type (VSTEP, TOPIK, MOS, IC3, etc.) when creating/editing exam schedules
-- This enables filtering exam papers in VStepExamList based on student's registered class type

ALTER TABLE exam_schedules ADD COLUMN exam_type TEXT;

CREATE INDEX IF NOT EXISTS idx_exam_schedules_type ON exam_schedules(exam_type);
