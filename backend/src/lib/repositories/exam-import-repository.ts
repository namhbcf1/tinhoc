// ========================================
// EXAM IMPORT REPOSITORY
// Handles: importTestFromJSON
// Depends on: getExamTypeByCode, createExamTest, createSection, createQuestion, updateExamTest
// ========================================

import { getExamTypeByCode } from './exam-type-repository.js';
import { createExamTest, updateExamTest } from './exam-test-repository.js';
import { createSection } from './exam-section-repository.js';
import { createQuestion } from './exam-question-repository.js';

interface ImportJsonData {
  examType: string;
  level: string;
  title: string;
  description?: string;
  duration: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  sections: Array<{
    name: string;
    description?: string;
    timeLimit?: number;
    instructions?: string;
    isLockedAfterComplete?: boolean;
    scoringRule?: string;
    questions: Array<{
      type: string;
      questionText: string;
      questionData?: any;
      options?: any;
      answerKey: any;
      points?: number;
      difficulty?: string;
      explanation?: string;
      audioUrl?: string;
      imageUrl?: string;
    }>;
  }>;
}

export async function importTestFromJSON(db: D1Database, jsonData: ImportJsonData, adminId: number | string): Promise<{ testId: number; totalQuestions: number }> {
  const { examType, level, title, description, duration, passingScore, shuffleQuestions, shuffleOptions, sections } = jsonData;

  const examTypeRecord = await getExamTypeByCode(db, examType);
  if (!examTypeRecord) {
    throw new Error(`Exam type ${examType} not found`);
  }

  const testResult = await createExamTest(db, {
    exam_type_id: examTypeRecord.id,
    level,
    title,
    description,
    duration_minutes: duration,
    passing_score: passingScore,
    shuffle_questions: shuffleQuestions || false,
    shuffle_options: shuffleOptions || false,
    created_by: adminId
  });

  const testId = testResult.meta.last_row_id;
  let totalQuestions = 0;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const sectionData = sections[sectionIndex];
    const sectionResult = await createSection(db, testId, {
      name: sectionData.name,
      description: sectionData.description,
      time_limit_minutes: sectionData.timeLimit,
      order_index: sectionIndex + 1,
      instructions: sectionData.instructions,
      is_locked_after_complete: sectionData.isLockedAfterComplete || false,
      scoring_rule: sectionData.scoringRule || 'points_based'
    });

    const sectionId = sectionResult.meta.last_row_id;
    const questions = sectionData.questions || [];

    for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
      const questionData = questions[questionIndex];
      await createQuestion(db, sectionId, {
        type: questionData.type,
        question_text: questionData.questionText,
        question_data: questionData.questionData || null,
        options_json: questionData.options || null,
        answer_key: questionData.answerKey,
        points: questionData.points || 1,
        difficulty: questionData.difficulty || 'medium',
        explanation: questionData.explanation || null,
        audio_url: questionData.audioUrl || null,
        image_url: questionData.imageUrl || null,
        order_index: questionIndex + 1
      });
      totalQuestions++;
    }
  }

  await updateExamTest(db, testId, { total_questions: totalQuestions });

  return { testId, totalQuestions };
}
