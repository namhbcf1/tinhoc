-- Drop the unique index that restricted students to 1 active exam registration.
-- App logic now enforces a maximum of 2 active registrations per student.
DROP INDEX IF EXISTS idx_exam_registrations_one_active_per_student;
