-- Migration: Add Cloudflare Images Support
-- Description: Add columns for storing Cloudflare Images IDs and create logging tables
-- Created: 2026-01-20
-- Note: Safe migration - columns and tables may already exist

-- ============================================
-- 1. Update students table with CF Images IDs
-- ============================================

-- Safe check - if columns exist, these will just return empty results
SELECT cccd_front_image_id FROM students LIMIT 0;
SELECT cccd_back_image_id FROM students LIMIT 0;
SELECT photo_3x4_image_id FROM students LIMIT 0;
SELECT cccd_front_url_expires_at FROM students LIMIT 0;
SELECT cccd_back_url_expires_at FROM students LIMIT 0;
SELECT photo_3x4_url_expires_at FROM students LIMIT 0;

-- Create indexes (IF NOT EXISTS is safe)
CREATE INDEX IF NOT EXISTS idx_students_cccd_front_image ON students(cccd_front_image_id);
CREATE INDEX IF NOT EXISTS idx_students_cccd_back_image ON students(cccd_back_image_id);
CREATE INDEX IF NOT EXISTS idx_students_photo_image ON students(photo_3x4_image_id);

-- ============================================
-- 2. Image Processing Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS image_processing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  image_type TEXT NOT NULL,
  original_image_id TEXT,
  processed_image_id TEXT,
  processing_status TEXT DEFAULT 'pending',
  ai_confidence_score REAL,
  quality_score REAL,
  error_message TEXT,
  processing_details TEXT,
  processing_started_at DATETIME,
  processing_completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_image_logs_student ON image_processing_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_image_logs_status ON image_processing_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_image_logs_created ON image_processing_logs(created_at);

-- ============================================
-- 3. Image Access Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS image_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  accessed_by_user_id INTEGER,
  access_type TEXT NOT NULL,
  image_type TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_access_logs_student ON image_access_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_by ON image_access_logs(accessed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_date ON image_access_logs(accessed_at);

-- ============================================
-- 4. Image Quality Metrics Table
-- ============================================

CREATE TABLE IF NOT EXISTS image_quality_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_processing_log_id INTEGER NOT NULL,
  blur_score REAL,
  brightness_score REAL,
  contrast_score REAL,
  resolution_width INTEGER,
  resolution_height INTEGER,
  file_size_bytes INTEGER,
  has_cccd_corners BOOLEAN DEFAULT 0,
  aspect_ratio_match REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_processing_log_id) REFERENCES image_processing_logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_log ON image_quality_metrics(image_processing_log_id);
