/**
 * MCQAnswerList — renders per-question correct/wrong breakdown with explanations
 * Used by VStepExamResult for Listening and Reading sections
 */
import { CheckCircle, XCircle } from 'lucide-react';

const MCQAnswerList = ({ answers, skillName, borderColor = 'border-blue-500' }) => {
  const correct = answers.filter(a => a.isCorrect).length;
  const pct = answers.length > 0 ? ((correct / answers.length) * 100).toFixed(1) : 0;

  return (
    <div className="mb-6 pb-6 border-b border-gray-200 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-bold text-gray-800 border-l-4 pl-3 ${borderColor}`}>
          {skillName}
        </h3>
        <span className="text-sm text-gray-500">
          <span className="font-semibold text-green-600">{correct}</span>/{answers.length} câu đúng ({pct}%)
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {answers.map((answer, idx) => (
          <div
            key={answer.questionId || idx}
            className={`border rounded-lg p-3 ${answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {answer.isCorrect
                ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
              <span className="font-semibold text-sm">Câu {idx + 1}</span>
            </div>
            {answer.questionText && (
              <p className="text-sm text-gray-700 mb-2">{answer.questionText}</p>
            )}
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-gray-500">Đáp án của bạn: </span>
                <span className={`font-semibold ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {answer.answerText || '(Chưa trả lời)'}
                </span>
              </div>
              {!answer.isCorrect && answer.correctAnswer && (
                <div>
                  <span className="text-gray-500">Đáp án đúng: </span>
                  <span className="font-semibold text-green-700">{answer.correctAnswer}</span>
                </div>
              )}
              {answer.explanation && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="font-medium text-blue-800">Giải thích: </span>
                  <span className="text-blue-700">{answer.explanation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MCQAnswerList;
