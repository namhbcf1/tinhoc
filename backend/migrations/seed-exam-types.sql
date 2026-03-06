-- Seed Exam Types
-- Run this after creating exam_types table

INSERT OR IGNORE INTO exam_types (code, name, description, language, icon_url) 
VALUES ('vstep', 'VSTEP', 'Vietnamese Standardized Test of English Proficiency', 'English', NULL);

INSERT OR IGNORE INTO exam_types (code, name, description, language, icon_url) 
VALUES ('topik', 'TOPIK', 'Test of Proficiency in Korean', 'Korean', NULL);

INSERT OR IGNORE INTO exam_types (code, name, description, language, icon_url) 
VALUES ('jlpt', 'JLPT', 'Japanese Language Proficiency Test', 'Japanese', NULL);

INSERT OR IGNORE INTO exam_types (code, name, description, language, icon_url) 
VALUES ('mos', 'MOS', 'Microsoft Office Specialist', NULL, NULL);

INSERT OR IGNORE INTO exam_types (code, name, description, language, icon_url) 
VALUES ('ic3', 'IC3', 'Internet and Computing Core Certification', NULL, NULL);








