-- Ensure each student has at most one ACTIVE exam registration at a time.
-- Active statuses are the ones that reserve a slot: pending/approved/registered.
-- This migration also cleans up existing duplicates by cancelling the lower-priority ones.

-- 1) Cancel duplicate active registrations, keep the "best" one per student:
--    Priority: approved/registered > pending, then newest created_at.
WITH ranked AS (
  SELECT
    id,
    student_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY student_id
      ORDER BY
        CASE
          WHEN status IN ('approved','registered') THEN 1
          WHEN status = 'pending' THEN 2
          ELSE 3
        END ASC,
        datetime(created_at) DESC,
        id DESC
    ) AS rn
  FROM exam_registrations
  WHERE status IN ('pending','approved','registered')
)
UPDATE exam_registrations
SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Enforce at DB-level: one active registration per student.
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_registrations_one_active_per_student
ON exam_registrations(student_id)
WHERE status IN ('pending','approved','registered');



