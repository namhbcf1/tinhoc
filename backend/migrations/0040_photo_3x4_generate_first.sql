ALTER TABLE image_processing_logs ADD COLUMN selection_status TEXT DEFAULT 'processing';
ALTER TABLE image_processing_logs ADD COLUMN selected_variant_id INTEGER;
ALTER TABLE image_processing_logs ADD COLUMN recommended_variant_id INTEGER;
ALTER TABLE image_processing_logs ADD COLUMN selection_completed_at DATETIME;

CREATE TABLE IF NOT EXISTS photo_3x4_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  processing_log_id INTEGER NOT NULL,
  variant_slot INTEGER NOT NULL,
  image_id TEXT NOT NULL,
  generation_mode TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  recommended INTEGER NOT NULL DEFAULT 0,
  warnings_json TEXT,
  validation_result_json TEXT,
  prompt_profile TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (processing_log_id) REFERENCES image_processing_logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_image_logs_selection_status ON image_processing_logs(selection_status);
CREATE INDEX IF NOT EXISTS idx_photo_3x4_variants_log ON photo_3x4_variants(processing_log_id);
CREATE INDEX IF NOT EXISTS idx_photo_3x4_variants_slot ON photo_3x4_variants(processing_log_id, variant_slot);
CREATE INDEX IF NOT EXISTS idx_photo_3x4_variants_recommended ON photo_3x4_variants(processing_log_id, recommended);
