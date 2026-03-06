-- Add missing columns to students table
ALTER TABLE students ADD COLUMN dan_toc TEXT DEFAULT 'Kinh';
ALTER TABLE students ADD COLUMN quoc_tich TEXT DEFAULT 'Việt Nam';
ALTER TABLE students ADD COLUMN ho_khau TEXT;
