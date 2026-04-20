-- Migration: 0037_student_feedbacks
-- Description: Student feedback submissions with admin review and public publication

CREATE TABLE IF NOT EXISTS student_feedbacks (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id           INTEGER NOT NULL,
  online_class_id      INTEGER NOT NULL,
  rating               INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  title                TEXT NOT NULL,
  content              TEXT NOT NULL,
  sentiment            TEXT CHECK(sentiment IN ('positive', 'mixed', 'negative') OR sentiment IS NULL),
  status               TEXT NOT NULL DEFAULT 'submitted'
                       CHECK(status IN ('submitted', 'approved', 'rejected')),
  teacher_response     TEXT,
  review_note_internal TEXT,
  reviewer_admin_id    INTEGER,
  reviewed_at          DATETIME,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, online_class_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (online_class_id) REFERENCES online_classes(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_student_feedbacks_student ON student_feedbacks(student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedbacks_class ON student_feedbacks(online_class_id);
CREATE INDEX IF NOT EXISTS idx_student_feedbacks_status ON student_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_student_feedbacks_sentiment ON student_feedbacks(sentiment);
