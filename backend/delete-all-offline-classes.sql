-- Xóa tất cả lớp học offline (classes)
-- CẢNH BÁO: Script này sẽ xóa TẤT CẢ records trong bảng classes
-- Điều này sẽ CASCADE xóa registrations liên quan (do FOREIGN KEY)
-- NHƯNG sẽ GIỮ NGUYÊN bảng students (học sinh)

-- Kiểm tra số lượng lớp học trước khi xóa
SELECT COUNT(*) as total_classes_before FROM classes;
SELECT COUNT(*) as total_registrations_before FROM registrations;
SELECT COUNT(*) as total_students_before FROM students;

-- Xóa tất cả lớp học offline
DELETE FROM classes;

-- Kiểm tra kết quả sau khi xóa
SELECT COUNT(*) as total_classes_after FROM classes;
SELECT COUNT(*) as total_registrations_after FROM registrations;
SELECT COUNT(*) as total_students_after FROM students;

-- Xác nhận: students vẫn còn nguyên
SELECT 'Students preserved: ' || COUNT(*) as students_status FROM students;
