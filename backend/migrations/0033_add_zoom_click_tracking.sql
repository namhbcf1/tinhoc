-- Migration 0033: Thêm cột zoom_join_source vào online_class_attendance
-- Mục đích: Phân biệt học viên tự check-in qua click Zoom ('zoom_click')
--           với điểm danh thủ công do giáo viên/admin ghi ('manual')
-- Cùng D1 database nên chạy 1 lần là đủ cho cả vantrangedu lẫn vantrangexam

ALTER TABLE online_class_attendance ADD COLUMN zoom_join_source TEXT DEFAULT 'manual';

-- Values:
--   'manual'     — Giáo viên/admin điểm danh thủ công qua UI admin
--   'zoom_click' — Học viên bấm nút "Vào lớp học" trên VanTrangExam
--   'webhook'    — (dự phòng cho Zoom Webhook integration sau này)
