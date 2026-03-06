-- Seed Sample Exam Tests
-- Creates 5 tests for each exam type (IC3, JLPT, MOS, TOPIK, VSTEP)
-- Total: 25 tests

-- Get exam type IDs
-- Note: This assumes exam types already exist from seed-exam-types.sql

-- IC3 Tests (5 tests)
INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'IC3'),
    'Basic',
    'IC3 - Bài thi số 1: Computer Fundamentals',
    'Bài thi cơ bản về kiến thức máy tính, phần cứng và phần mềm',
    60,
    70,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'IC3 - Bài thi số 1: Computer Fundamentals');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'IC3'),
    'Intermediate',
    'IC3 - Bài thi số 2: Key Applications',
    'Bài thi về các ứng dụng văn phòng cơ bản: Word, Excel, PowerPoint',
    90,
    75,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'IC3 - Bài thi số 2: Key Applications');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'IC3'),
    'Advanced',
    'IC3 - Bài thi số 3: Living Online',
    'Bài thi về Internet, email, và các công cụ trực tuyến',
    75,
    80,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'IC3 - Bài thi số 3: Living Online');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'IC3'),
    'Basic',
    'IC3 - Bài thi số 4: Computer Essentials',
    'Bài thi tổng hợp về cơ bản máy tính và hệ điều hành',
    60,
    70,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'IC3 - Bài thi số 4: Computer Essentials');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'IC3'),
    'Intermediate',
    'IC3 - Bài thi số 5: Digital Literacy',
    'Bài thi về kỹ năng số và công nghệ thông tin',
    90,
    75,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'IC3 - Bài thi số 5: Digital Literacy');

-- JLPT Tests (5 tests)
INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'JLPT'),
    'N5',
    'JLPT - Bài thi số 1: N5 Level',
    'Bài thi trình độ N5 - Cơ bản nhất của kỳ thi năng lực tiếng Nhật',
    105,
    80,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'JLPT - Bài thi số 1: N5 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'JLPT'),
    'N4',
    'JLPT - Bài thi số 2: N4 Level',
    'Bài thi trình độ N4 - Sơ cấp của kỳ thi năng lực tiếng Nhật',
    125,
    90,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'JLPT - Bài thi số 2: N4 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'JLPT'),
    'N3',
    'JLPT - Bài thi số 3: N3 Level',
    'Bài thi trình độ N3 - Trung cấp của kỳ thi năng lực tiếng Nhật',
    140,
    95,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'JLPT - Bài thi số 3: N3 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'JLPT'),
    'N2',
    'JLPT - Bài thi số 4: N2 Level',
    'Bài thi trình độ N2 - Trung thượng cấp của kỳ thi năng lực tiếng Nhật',
    155,
    90,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'JLPT - Bài thi số 4: N2 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'JLPT'),
    'N1',
    'JLPT - Bài thi số 5: N1 Level',
    'Bài thi trình độ N1 - Cao cấp nhất của kỳ thi năng lực tiếng Nhật',
    170,
    100,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'JLPT - Bài thi số 5: N1 Level');

-- MOS Tests (5 tests)
INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'MOS'),
    'Expert',
    'MOS - Bài thi số 1: Word Expert',
    'Bài thi Microsoft Word ở mức độ chuyên gia',
    50,
    700,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'MOS - Bài thi số 1: Word Expert');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'MOS'),
    'Expert',
    'MOS - Bài thi số 2: Excel Expert',
    'Bài thi Microsoft Excel ở mức độ chuyên gia',
    50,
    700,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'MOS - Bài thi số 2: Excel Expert');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'MOS'),
    'Associate',
    'MOS - Bài thi số 3: PowerPoint Associate',
    'Bài thi Microsoft PowerPoint ở mức độ cơ bản',
    50,
    700,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'MOS - Bài thi số 3: PowerPoint Associate');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'MOS'),
    'Associate',
    'MOS - Bài thi số 4: Outlook Associate',
    'Bài thi Microsoft Outlook ở mức độ cơ bản',
    50,
    700,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'MOS - Bài thi số 4: Outlook Associate');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'MOS'),
    'Expert',
    'MOS - Bài thi số 5: Access Expert',
    'Bài thi Microsoft Access ở mức độ chuyên gia',
    50,
    700,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'MOS - Bài thi số 5: Access Expert');

-- TOPIK Tests (5 tests)
INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'TOPIK'),
    'Level 1',
    'TOPIK - Bài thi số 1: Level 1',
    'Bài thi TOPIK cấp độ 1 - Sơ cấp',
    100,
    80,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'TOPIK - Bài thi số 1: Level 1');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'TOPIK'),
    'Level 2',
    'TOPIK - Bài thi số 2: Level 2',
    'Bài thi TOPIK cấp độ 2 - Sơ cấp nâng cao',
    100,
    80,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'TOPIK - Bài thi số 2: Level 2');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'TOPIK'),
    'Level 3',
    'TOPIK - Bài thi số 3: Level 3',
    'Bài thi TOPIK cấp độ 3 - Trung cấp',
    180,
    50,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'TOPIK - Bài thi số 3: Level 3');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'TOPIK'),
    'Level 4',
    'TOPIK - Bài thi số 4: Level 4',
    'Bài thi TOPIK cấp độ 4 - Trung cấp nâng cao',
    180,
    50,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'TOPIK - Bài thi số 4: Level 4');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'TOPIK'),
    'Level 5-6',
    'TOPIK - Bài thi số 5: Level 5-6',
    'Bài thi TOPIK cấp độ 5-6 - Cao cấp',
    180,
    50,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'TOPIK - Bài thi số 5: Level 5-6');

-- VSTEP Tests (5 tests)
INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'VSTEP'),
    'B1',
    'VSTEP - Bài thi số 1: B1 Level',
    'Bài thi VSTEP trình độ B1 - Trung cấp',
    180,
    4.0,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'VSTEP - Bài thi số 1: B1 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'VSTEP'),
    'B2',
    'VSTEP - Bài thi số 2: B2 Level',
    'Bài thi VSTEP trình độ B2 - Trung thượng cấp',
    195,
    6.0,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'VSTEP - Bài thi số 2: B2 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'VSTEP'),
    'C1',
    'VSTEP - Bài thi số 3: C1 Level',
    'Bài thi VSTEP trình độ C1 - Cao cấp',
    195,
    6.5,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'VSTEP - Bài thi số 3: C1 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'VSTEP'),
    'A2-B1',
    'VSTEP - Bài thi số 4: A2-B1 Level',
    'Bài thi VSTEP trình độ A2-B1 - Sơ trung cấp',
    180,
    4.0,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'VSTEP - Bài thi số 4: A2-B1 Level');

INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, is_active, shuffle_questions, shuffle_options, created_by, status)
SELECT 
    (SELECT id FROM exam_types WHERE code = 'VSTEP'),
    'C1-C2',
    'VSTEP - Bài thi số 5: C1-C2 Level',
    'Bài thi VSTEP trình độ C1-C2 - Cao cấp',
    195,
    8.0,
    1,
    1,
    1,
    1,
    'approved'
WHERE NOT EXISTS (SELECT 1 FROM exam_tests WHERE title = 'VSTEP - Bài thi số 5: C1-C2 Level');








