-- Migration: 0036_student_reviews
-- Description: Student evaluation/review reports (per student × per class)

CREATE TABLE IF NOT EXISTS student_reviews (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id        INTEGER NOT NULL,
  online_class_id   INTEGER NOT NULL,
  period_label      TEXT,              -- "Sau 5 buổi học + 2 tuần BTVN"
  report_title      TEXT,              -- "Báo cáo B2 VSTEP"
  overall_summary   TEXT,
  recommendations   TEXT,
  homework_tracking TEXT DEFAULT '[]', -- JSON: [{date, status}]
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK(status IN ('draft', 'published')),
  created_by        INTEGER NOT NULL,
  updated_by        INTEGER,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, online_class_id),
  FOREIGN KEY (student_id)      REFERENCES students(id)       ON DELETE CASCADE,
  FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_review_skills (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id    INTEGER NOT NULL,
  skill        TEXT NOT NULL CHECK(skill IN ('reading','listening','speaking','writing')),
  score_raw    TEXT,
  score_num    REAL,
  skill_status TEXT CHECK(skill_status IN ('good','needs_work','weak') OR skill_status IS NULL),
  comments     TEXT,
  sort_order   INTEGER DEFAULT 0,
  UNIQUE(review_id, skill),
  FOREIGN KEY (review_id) REFERENCES student_reviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_review_test_scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id     INTEGER NOT NULL,
  skill_label   TEXT NOT NULL,
  max_score     REAL,
  student_score REAL,
  score_notes   TEXT,
  sort_order    INTEGER DEFAULT 0,
  FOREIGN KEY (review_id) REFERENCES student_reviews(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_reviews_student ON student_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_student_reviews_class   ON student_reviews(online_class_id);
CREATE INDEX IF NOT EXISTS idx_student_reviews_status  ON student_reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_skills_review    ON student_review_skills(review_id);
CREATE INDEX IF NOT EXISTS idx_review_scores_review    ON student_review_test_scores(review_id);
