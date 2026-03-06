-- Insert sample class schedules for existing class "TUU TEST"
-- Assuming class ID is 8 (based on earlier API test showing class 8)

-- Delete any existing schedules for class 8 first
DELETE FROM class_schedules WHERE class_id = 8;

-- Create schedules for Monday (1), Wednesday (3), Friday (5) from 18:30 to 20:30
INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, room, notes)
VALUES 
  (8, 1, '18:30', '20:30', 'Phòng học 01', 'Học Thứ 2'),
  (8, 3, '18:30', '20:30', 'Phòng học 01', 'Học Thứ 4'),
  (8, 5, '18:30', '20:30', 'Phòng học 01', 'Học Thứ 6');
