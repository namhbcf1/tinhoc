-- Xóa tất cả lớp học offline (class_schedules)
-- CẢNH BÁO: Script này sẽ xóa TẤT CẢ records trong bảng class_schedules

DELETE FROM class_schedules;

-- Kiểm tra kết quả
SELECT COUNT(*) as remaining_schedules FROM class_schedules;
