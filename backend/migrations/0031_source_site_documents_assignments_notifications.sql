-- Migration 0031: Add source_site to documents, assignments, notifications
-- Purpose: Isolate data between vantrangedu ('edu') and vantrangexam ('exam')
--          on shared D1 database tables that were previously unprotected.
-- Deploy order: Run this on vantrangedu FIRST, then run 018 on vantrangexam.

-- ============================================================
-- 1. ADD COLUMNS (existing rows auto-get DEFAULT 'edu')
-- ============================================================

ALTER TABLE documents
  ADD COLUMN source_site TEXT NOT NULL DEFAULT 'edu';

ALTER TABLE assignments
  ADD COLUMN source_site TEXT NOT NULL DEFAULT 'edu';

ALTER TABLE notifications
  ADD COLUMN source_site TEXT NOT NULL DEFAULT 'edu';

-- ============================================================
-- 2. RECLASSIFY rows that belong to vantrangexam
--    (documents shared to exam_schedule online classes)
-- ============================================================

UPDATE documents
SET source_site = 'exam'
WHERE id IN (
  SELECT DISTINCT d.id
  FROM documents d
  JOIN document_shares ds ON ds.document_id = d.id
  JOIN online_classes oc ON oc.id = ds.target_id
  WHERE COALESCE(oc.source_kind, 'exam_schedule') = 'exam_schedule'
);

-- assignments whose class is an exam_schedule class belong to vantrangexam
UPDATE assignments
SET source_site = 'exam'
WHERE class_id IN (
  SELECT id FROM online_classes
  WHERE COALESCE(source_kind, 'exam_schedule') = 'exam_schedule'
);

-- notifications whose online_class is an exam_schedule class belong to vantrangexam
UPDATE notifications
SET source_site = 'exam'
WHERE online_class_id IN (
  SELECT id FROM online_classes
  WHERE COALESCE(source_kind, 'exam_schedule') = 'exam_schedule'
);

-- ============================================================
-- 3. INDEXES for query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_documents_source_site
  ON documents(source_site);

CREATE INDEX IF NOT EXISTS idx_assignments_source_site
  ON assignments(source_site);

CREATE INDEX IF NOT EXISTS idx_notifications_source_site
  ON notifications(source_site);
