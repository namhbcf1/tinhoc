// ========================================
// EXAM ANSWER REPOSITORY
// Handles: saveAnswer, calculateScore, getAttemptResult
// Depends on: getExamTestWithDetails, scoreAnswer (scorer helper)
// ========================================

import { getExamTestWithDetails } from './exam-test-detail-repository.js';
import { scoreAnswer } from './exam-answer-scorer.js';

export async function saveAnswer(db, attemptId, questionId, answerData) {
  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ?
  `).bind(attemptId).first();

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status !== 'in_progress') throw new Error('Attempt not in progress');

  const question = await db.prepare(`
    SELECT * FROM exam_questions WHERE id = ?
  `).bind(questionId).first();

  if (!question) throw new Error('Question not found');

  const answerJson = JSON.stringify(answerData);
  const { isCorrect, pointsEarned } = scoreAnswer(question, answerData);

  const result = await db.prepare(`
    INSERT INTO exam_attempt_answers (
      attempt_id, question_id, question_version, answer_data, is_correct, points_earned
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET
      answer_data = excluded.answer_data,
      is_correct = excluded.is_correct,
      points_earned = excluded.points_earned,
      updated_at = CURRENT_TIMESTAMP
  `).bind(attemptId, questionId, question.version, answerJson, isCorrect ? 1 : 0, pointsEarned).run();

  return result;
}

export async function calculateScore(db, attemptId) {
  const answers = await db.prepare(`
    SELECT a.*, q.points, q.section_id, s.scoring_rule
    FROM exam_attempt_answers a
    JOIN exam_questions q ON a.question_id = q.id
    JOIN exam_sections s ON q.section_id = s.id
    WHERE a.attempt_id = ?
  `).bind(attemptId).all();

  const sectionScores = {};
  let totalScore = 0;
  let maxScore = 0;

  (answers.results || []).forEach(answer => {
    const sectionId = answer.section_id;
    if (!sectionScores[sectionId]) {
      sectionScores[sectionId] = { score: 0, maxScore: 0 };
    }
    sectionScores[sectionId].score += answer.points_earned;
    sectionScores[sectionId].maxScore += answer.points;
    totalScore += answer.points_earned;
    maxScore += answer.points;
  });

  Object.keys(sectionScores).forEach(sectionId => {
    const section = sectionScores[sectionId];
    section.percentage = section.maxScore > 0 ? (section.score / section.maxScore) * 100 : 0;
  });

  return { totalScore, maxScore, sectionScores };
}

export async function getAttemptResult(db, attemptId) {
  const attempt = await db.prepare(`
    SELECT * FROM exam_attempts WHERE id = ?
  `).bind(attemptId).first();

  if (!attempt) return null;

  const test = await getExamTestWithDetails(db, attempt.test_id, false);
  const answers = await db.prepare(`
    SELECT a.*, q.*, s.name as section_name
    FROM exam_attempt_answers a
    JOIN exam_questions q ON a.question_id = q.id
    JOIN exam_sections s ON q.section_id = s.id
    WHERE a.attempt_id = ?
    ORDER BY s.order_index, q.order_index
  `).bind(attemptId).all();

  const answersList = (answers.results || []).map(a => ({
    questionId: a.question_id,
    questionText: a.question_text,
    questionType: a.type,
    sectionName: a.section_name,
    answerData: a.answer_data ? JSON.parse(a.answer_data) : null,
    correctAnswer: a.answer_key,
    isCorrect: a.is_correct === 1,
    pointsEarned: a.points_earned,
    points: a.points,
    explanation: a.explanation
  }));

  return {
    attempt,
    test,
    answers: answersList,
    sectionScores: attempt.section_scores ? JSON.parse(attempt.section_scores) : {}
  };
}
