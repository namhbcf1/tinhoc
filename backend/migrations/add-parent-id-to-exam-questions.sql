-- Migration: Add parent_id column to exam_questions for Passage Groups
-- Description: Support hierarchical question structure (passage groups with child questions)

-- Add parent_id column to exam_questions table
ALTER TABLE exam_questions ADD COLUMN parent_id INTEGER NULL;

-- Create index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_exam_questions_parent ON exam_questions(parent_id);

-- Add foreign key constraint (self-referencing)
-- Note: SQLite doesn't support adding FK constraints via ALTER TABLE, 
-- but the relationship is enforced at application level

