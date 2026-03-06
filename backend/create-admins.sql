-- ========================================
-- SCRIPT SQL TẠO 5 TÀI KHOẢN ADMIN
-- Password cho tất cả: admin12345
-- ========================================

-- Hash của password "admin12345" (bcrypt, rounds=10)
INSERT INTO admins (username, password_hash, full_name, role) VALUES
('admin1', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 1', 'admin'),
('admin2', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 2', 'admin'),
('admin3', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 3', 'admin'),
('admin4', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 4', 'admin'),
('admin5', '$2a$10$.ccnLw7eQ38V9q2ngWjJgOYTc4SEoeh4IYfM75Jwo7ed8j5kRMdBW', 'Quản Trị Viên 5', 'admin');
