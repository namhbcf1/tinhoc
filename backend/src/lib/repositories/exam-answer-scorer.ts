// ========================================
// EXAM ANSWER SCORER (private helper)
// Pure scoring logic used by saveAnswer — no DB access.
// ========================================

interface ScoreResult {
  isCorrect: boolean;
  pointsEarned: number;
}

/**
 * Computes { isCorrect, pointsEarned } for a given question and user answer.
 * @param question - Row from exam_questions
 * @param answerData - User-supplied answer value
 */
export function scoreAnswer(question: any, answerData: any): ScoreResult {
  if (question.type === 'mcq') {
    const correctAnswer = String(question.answer_key).trim();
    const userAnswer = String(answerData || '').trim();
    const isCorrect = userAnswer === correctAnswer;
    return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
  }

  if (question.type === 'multi_select') {
    try {
      const correctAnswers = typeof question.answer_key === 'string' && question.answer_key.startsWith('[')
        ? JSON.parse(question.answer_key).map((a: any) => String(a).trim()).sort()
        : String(question.answer_key).split(',').map((a: string) => a.trim()).sort();
      const userAnswers = Array.isArray(answerData)
        ? answerData.map((a: any) => String(a).trim()).sort()
        : (typeof answerData === 'string' && answerData.startsWith('['))
        ? JSON.parse(answerData).map((a: any) => String(a).trim()).sort()
        : String(answerData || '').split(',').map((a: string) => a.trim()).sort();
      const isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers);
      return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
    } catch { return { isCorrect: false, pointsEarned: 0 }; }
  }

  if (question.type === 'fill_blank') {
    const correctAnswer = String(question.answer_key).toLowerCase().trim();
    const userAnswer = String(answerData || '').toLowerCase().trim();
    const isCorrect = userAnswer === correctAnswer;
    return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
  }

  if (question.type === 'matching') {
    try {
      const correctPairs = typeof question.answer_key === 'string' && question.answer_key.startsWith('[')
        ? JSON.parse(question.answer_key) : [];
      const userPairs = typeof answerData === 'string' && answerData.startsWith('[')
        ? JSON.parse(answerData)
        : Array.isArray(answerData) ? answerData : [];
      if (correctPairs.length !== userPairs.length) return { isCorrect: false, pointsEarned: 0 };
      const correctSet = new Set(correctPairs.map((p: any) => String(p).toLowerCase()));
      const userSet = new Set(userPairs.map((p: any) => String(p).toLowerCase()));
      const correctCount = Array.from(correctSet).filter(p => userSet.has(p as string)).length;
      // Partial credit: points based on correct matches
      const pointsEarned = correctPairs.length > 0
        ? Math.round((correctCount / correctPairs.length) * question.points) : 0;
      return { isCorrect: correctCount === correctPairs.length, pointsEarned };
    } catch { return { isCorrect: false, pointsEarned: 0 }; }
  }

  if (question.type === 'ordering') {
    try {
      const correctOrder = typeof question.answer_key === 'string' && question.answer_key.startsWith('[')
        ? JSON.parse(question.answer_key) : [];
      const userOrder = typeof answerData === 'string' && answerData.startsWith('[')
        ? JSON.parse(answerData)
        : Array.isArray(answerData) ? answerData : [];
      if (correctOrder.length !== userOrder.length) return { isCorrect: false, pointsEarned: 0 };
      const isCorrect = JSON.stringify(correctOrder) === JSON.stringify(userOrder);
      return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
    } catch { return { isCorrect: false, pointsEarned: 0 }; }
  }

  if (question.type === 'drag_drop') {
    try {
      const correctMapping = typeof question.answer_key === 'string' && question.answer_key.startsWith('{')
        ? JSON.parse(question.answer_key) : {};
      const userMapping = typeof answerData === 'string' && answerData.startsWith('{')
        ? JSON.parse(answerData)
        : typeof answerData === 'object' ? answerData : {};
      const correctKeys = Object.keys(correctMapping);
      const correctCount = correctKeys.filter(key => {
        const correct = String(correctMapping[key]).toLowerCase().trim();
        const user = String(userMapping[key] || '').toLowerCase().trim();
        return correct === user;
      }).length;
      // Partial credit
      const pointsEarned = correctKeys.length > 0
        ? Math.round((correctCount / correctKeys.length) * question.points) : 0;
      return { isCorrect: correctCount === correctKeys.length, pointsEarned };
    } catch { return { isCorrect: false, pointsEarned: 0 }; }
  }

  if (question.type === 'speaking' || question.type === 'essay') {
    // Requires manual grading — flag for review, don't auto-score
    return { isCorrect: false, pointsEarned: 0 };
  }

  if (question.type === 'reading_passage_group') {
    // Score each sub-question with partial credit
    try {
      const correctAnswers = question.question_data?.correctAnswers || {};
      const userAnswers = typeof answerData === 'string' && answerData.startsWith('{')
        ? JSON.parse(answerData)
        : typeof answerData === 'object' ? answerData : {};
      let correctCount = 0;
      let totalSubQuestions = 0;
      Object.keys(correctAnswers).forEach(key => {
        totalSubQuestions++;
        const correct = String(correctAnswers[key]).toLowerCase().trim();
        const user = String(userAnswers[key] || '').toLowerCase().trim();
        if (correct === user) correctCount++;
      });
      const pointsEarned = totalSubQuestions > 0
        ? Math.round((correctCount / totalSubQuestions) * question.points) : 0;
      return { isCorrect: correctCount === totalSubQuestions, pointsEarned };
    } catch { return { isCorrect: false, pointsEarned: 0 }; }
  }

  return { isCorrect: false, pointsEarned: 0 };
}
