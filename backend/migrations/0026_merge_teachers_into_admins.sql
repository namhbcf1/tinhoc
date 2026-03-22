-- Migration: Gộp teachers vào admins
-- Teacher sẽ trở thành admin có role='teacher'
-- Bảng teachers giữ lại tạm thời cho backward compat

-- 1. Thêm cột teacher-specific vào bảng admins
ALTER TABLE admins ADD COLUMN teacher_code TEXT UNIQUE;
ALTER TABLE admins ADD COLUMN department TEXT;
ALTER TABLE admins ADD COLUMN position TEXT;
ALTER TABLE admins ADD COLUMN ho TEXT;
ALTER TABLE admins ADD COLUMN ten_dem TEXT;
ALTER TABLE admins ADD COLUMN ten TEXT;
ALTER TABLE admins ADD COLUMN ho_ten_full TEXT;
ALTER TABLE admins ADD COLUMN sdt TEXT;
ALTER TABLE admins ADD COLUMN status TEXT DEFAULT 'active';

-- 2. Migrate teacher data sang admins (role='teacher')
INSERT INTO admins (username, password_hash, full_name, role, email, phone,
  teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status)
SELECT
  teacher_code,
  password_hash,
  ho_ten_full,
  'teacher',
  email,
  sdt,
  teacher_code,
  department,
  position,
  ho,
  ten_dem,
  ten,
  ho_ten_full,
  sdt,
  status
FROM teachers
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE admins.username = teachers.teacher_code);

-- 3. Thêm admin_id vào class_teachers để reference admins
ALTER TABLE class_teachers ADD COLUMN admin_id INTEGER;

-- 4. Cập nhật class_teachers.admin_id từ teacher_id mapping
UPDATE class_teachers SET admin_id = (
  SELECT a.id FROM admins a
  INNER JOIN teachers t ON t.teacher_code = a.teacher_code
  WHERE t.id = class_teachers.teacher_id
);

-- 5. Index cho admin teacher lookup
CREATE INDEX IF NOT EXISTS idx_admins_teacher_code ON admins(teacher_code);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
CREATE INDEX IF NOT EXISTS idx_class_teachers_admin_id ON class_teachers(admin_id);
