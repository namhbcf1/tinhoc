-- ========================================
-- TẠO TÀI KHOẢN ADMIN NHANH
-- Password: admin12345
-- ========================================

-- Kiểm tra xem đã có admin chưa
SELECT COUNT(*) as admin_count FROM admins;

-- Nếu chưa có admin, tạo admin đầu tiên
INSERT INTO admins (username, password_hash, full_name, role) VALUES
('admin1', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 1', 'admin')
ON CONFLICT(username) DO NOTHING;

-- Kiểm tra lại
SELECT id, username, full_name, role, created_at FROM admins;
