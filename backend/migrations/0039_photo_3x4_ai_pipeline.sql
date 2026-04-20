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

ALTER TABLE image_processing_logs ADD COLUMN source_image_id TEXT;
ALTER TABLE image_processing_logs ADD COLUMN candidate_image_id TEXT;
ALTER TABLE image_processing_logs ADD COLUMN final_image_id TEXT;
ALTER TABLE image_processing_logs ADD COLUMN pipeline_stage TEXT DEFAULT 'uploaded';
ALTER TABLE image_processing_logs ADD COLUMN progress_percent INTEGER DEFAULT 0;
ALTER TABLE image_processing_logs ADD COLUMN pipeline_version TEXT DEFAULT 'v1';
ALTER TABLE image_processing_logs ADD COLUMN warnings_json TEXT;
ALTER TABLE image_processing_logs ADD COLUMN validation_result_json TEXT;
ALTER TABLE image_processing_logs ADD COLUMN generation_mode TEXT;
ALTER TABLE image_processing_logs ADD COLUMN used_as_primary INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_image_logs_stage ON image_processing_logs(pipeline_stage);
