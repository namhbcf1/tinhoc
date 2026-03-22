CREATE INDEX IF NOT EXISTS idx_online_class_enrollments_class_status
  ON online_class_enrollments(online_class_id, status);

CREATE INDEX IF NOT EXISTS idx_online_class_enrollments_student_status
  ON online_class_enrollments(student_id, status);

CREATE INDEX IF NOT EXISTS idx_teacher_messages_conversation_sender_read
  ON teacher_messages(conversation_id, sender_type, read_at);

CREATE INDEX IF NOT EXISTS idx_vstep_exam_attempts_status_grading_submit
  ON vstep_exam_attempts(status, grading_status, submit_time);

CREATE INDEX IF NOT EXISTS idx_vstep_sections_exam_type
  ON vstep_sections(exam_id, type);

CREATE INDEX IF NOT EXISTS idx_vstep_questions_section_id
  ON vstep_questions(section_id);

CREATE INDEX IF NOT EXISTS idx_vstep_answers_attempt_question_score
  ON vstep_answers(attempt_id, question_id, score);
