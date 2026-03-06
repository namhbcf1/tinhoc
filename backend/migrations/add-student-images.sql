-- Migration: add_student_images
-- Description: Add columns for storing student profile images

ALTER TABLE students ADD COLUMN image_cccd_front TEXT;
ALTER TABLE students ADD COLUMN image_cccd_back TEXT;
ALTER TABLE students ADD COLUMN image_3x4 TEXT;
