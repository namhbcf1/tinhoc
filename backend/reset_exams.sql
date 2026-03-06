-- Script to delete all old exam tests and related data
-- Only delete tables that exist

-- Delete exam questions first (foreign key)
DELETE FROM exam_questions WHERE 1=1;

-- Delete exam sections
DELETE FROM exam_sections WHERE 1=1;

-- Delete exam tests
DELETE FROM exam_tests WHERE 1=1;

SELECT 'All exam data deleted successfully!' AS result;
