-- ========================================
-- CLASS VIDEOS - Lưu metadata video bài giảng
-- ========================================

CREATE TABLE IF NOT EXISTS class_videos (
  id TEXT PRIMARY KEY,              -- UUID hoặc ID do app sinh ra
  class_id TEXT NOT NULL,           -- Tham chiếu logic tới classes.id (giữ kiểu TEXT cho linh hoạt)
  title TEXT,                       -- Tiêu đề hiển thị cho học viên
  r2_key TEXT NOT NULL,             -- Đường dẫn object trong R2 (ví dụ: /videos/class_123/2026-01-15_lesson01.mp4)
  duration INTEGER,                 -- Thời lượng video (giây)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_class_videos_class_id
  ON class_videos(class_id);

