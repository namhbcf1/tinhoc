// ========================================
// EXAM TEST DETAIL REPOSITORY
// Handles: getExamTestWithDetails (with full section + question tree)
// Depends on: getExamTestById (imported from exam-test-repository)
// ========================================

import { getExamTestById } from './exam-test-repository.js';

// Fisher-Yates shuffle helper (local to this module)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getExamTestWithDetails(db: D1Database, testId: number | string, randomize: boolean = false): Promise<any | null> {
  const test = await getExamTestById(db, testId);
  if (!test) return null;

  const sections = await db.prepare(`
    SELECT * FROM exam_sections
    WHERE test_id = ?
    ORDER BY order_index ASC
  `).bind(testId).all<any>();

  const sectionsList = sections.results || [];
  if (sectionsList.length === 0) {
    return { ...test, sections: [] };
  }

  // Optimize: Only query if we have sections
  let allQuestions: D1Result<any> = { results: [], success: true, meta: {} as any };
  if (sectionsList.length > 0) {
    const sectionIds = sectionsList.map((s: any) => s.id);
    const placeholders = sectionIds.map(() => '?').join(',');

    allQuestions = await db.prepare(`
      SELECT * FROM exam_questions
      WHERE section_id IN (${placeholders})
      ORDER BY section_id ASC, COALESCE(parent_id, id) ASC, order_index ASC
    `).bind(...sectionIds).all<any>();
  }

  // Build tree structure: separate passage groups and their children
  const questionsBySection: Record<string, any[]> = {};
  const passageGroupsMap: Record<string, any[]> = {}; // Map of passage group ID to its children

  (allQuestions.results || []).forEach((q: any) => {
    // Parse JSON fields
    let options = null;
    let questionData = null;
    try {
      options = q.options_json ? JSON.parse(q.options_json) : null;
      questionData = q.question_data ? JSON.parse(q.question_data) : null;
    } catch (e) {
      // Keep as null if parse fails
    }

    const questionWithParsed = { ...q, options, questionData };

    if (q.parent_id) {
      // This is a child question of a passage group
      if (!passageGroupsMap[q.parent_id]) {
        passageGroupsMap[q.parent_id] = [];
      }
      passageGroupsMap[q.parent_id].push(questionWithParsed);
    } else {
      // This is either a passage group or standalone question
      if (!questionsBySection[q.section_id]) {
        questionsBySection[q.section_id] = [];
      }
      questionsBySection[q.section_id].push(questionWithParsed);
    }
  });

  const sectionsData = sectionsList.map((section: any) => {
    let questionsList = questionsBySection[section.id] || [];

    if (randomize && test.shuffle_questions) {
      questionsList = shuffleArray(questionsList);
    }

    // Build question nodes: passage groups with children, or standalone questions
    const questionNodes = questionsList.map((q: any) => {
      if (q.type === 'reading_passage_group') {
        // This is a passage group - attach its children
        const children = passageGroupsMap[q.id] || [];
        if (randomize && test.shuffle_questions) {
          return { ...q, children: shuffleArray(children) };
        }
        return { ...q, children };
      } else {
        return q;
      }
    });

    // Apply shuffle_options if needed
    if (randomize && test.shuffle_options) {
      questionNodes.forEach((q: any) => {
        if (q.options && Array.isArray(q.options)) {
          q.options = shuffleArray(q.options);
        }
        // Also shuffle options for children of passage groups
        if (q.children) {
          q.children.forEach((child: any) => {
            if (child.options && Array.isArray(child.options)) {
              child.options = shuffleArray(child.options);
            }
          });
        }
      });
    }

    return { ...section, questions: questionNodes };
  });

  return { ...test, sections: sectionsData };
}
