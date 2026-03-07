// ========================================
// EXAM QUESTION REPOSITORY
// Handles: createQuestion, updateQuestion, deleteQuestion
// ========================================

interface QuestionData {
  type: string;
  question_text: string;
  question_data?: any;
  options_json?: any;
  answer_key: any;
  points?: number;
  difficulty?: string;
  explanation?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  order_index: number;
  parent_id?: number | string | null;
}

export async function createQuestion(db: D1Database, sectionId: number | string, data: QuestionData): Promise<any> {
  const {
    type, question_text, question_data, options_json, answer_key,
    points, difficulty, explanation, audio_url, image_url, order_index, parent_id
  } = data;

  // Validate question type
  const validTypes = ['mcq', 'multi_select', 'fill_blank', 'matching', 'ordering', 'drag_drop', 'essay', 'speaking', 'reading_passage_group'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid question type: ${type}`);
  }

  // Validate parent_id: if provided, must reference an existing question
  if (parent_id !== null && parent_id !== undefined) {
    const parentCheck = await db.prepare('SELECT id, type FROM exam_questions WHERE id = ?').bind(parent_id).first<any>();
    if (!parentCheck) {
      throw new Error(`Parent question with id ${parent_id} not found`);
    }
    if (parentCheck.type !== 'reading_passage_group') {
      throw new Error(`Parent question must be of type 'reading_passage_group'`);
    }
  }

  // Validate and format answer_key based on type
  let formattedAnswerKey = answer_key;
  if (type === 'multi_select' && Array.isArray(answer_key)) {
    formattedAnswerKey = JSON.stringify(answer_key);
  } else if (type === 'matching' && typeof answer_key === 'object') {
    formattedAnswerKey = JSON.stringify(answer_key);
  } else if (type === 'ordering' && Array.isArray(answer_key)) {
    formattedAnswerKey = JSON.stringify(answer_key);
  } else if (type === 'drag_drop' && typeof answer_key === 'object') {
    formattedAnswerKey = JSON.stringify(answer_key);
  } else if (type === 'reading_passage_group' && typeof answer_key === 'object') {
    formattedAnswerKey = JSON.stringify(answer_key);
  }

  const result = await db.prepare(`
    INSERT INTO exam_questions (
      section_id, type, question_text, question_data, options_json, answer_key,
      points, difficulty, explanation, audio_url, image_url, order_index, parent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    sectionId, type, question_text,
    question_data ? (typeof question_data === 'string' ? question_data : JSON.stringify(question_data)) : null,
    options_json ? (typeof options_json === 'string' ? options_json : JSON.stringify(options_json)) : null,
    formattedAnswerKey, points || 1, difficulty || 'medium',
    explanation, audio_url, image_url, order_index,
    parent_id !== undefined ? parent_id : null
  ).run();

  return result;
}

export async function updateQuestion(db: D1Database, questionId: number | string, data: Record<string, any>): Promise<any> {
  const updates: string[] = [];
  const params: any[] = [];

  Object.keys(data).forEach(key => {
    if (key !== 'id' && data[key] !== undefined) {
      if (key === 'question_data' || key === 'options_json') {
        updates.push(`${key} = ?`);
        params.push(JSON.stringify(data[key]));
      } else {
        updates.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
  });

  if (updates.length === 0) return { meta: { changes: 0 } };

  updates.push('version = version + 1');
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(questionId);

  const result = await db.prepare(`
    UPDATE exam_questions SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run();

  return result;
}

export async function deleteQuestion(db: D1Database, questionId: number | string): Promise<any> {
  const result = await db.prepare(`
    DELETE FROM exam_questions WHERE id = ?
  `).bind(questionId).run();
  return result;
}
