/**
 * DetailedAnswersModal — full per-question breakdown modal for VStepExamResult
 */
import MCQAnswerList from './MCQAnswerList';
import WritingSpeakingAnswerList from './WritingSpeakingAnswerList';

const DetailedAnswersModal = ({ result, onClose }) => {
  const isMCQOnly = (result.layoutMode || 'LANGUAGE') === 'MCQ_ONLY';
  const allAnswers = result.answers || [];
  const listeningAnswers = allAnswers.filter(a => a.skillType === 'LISTENING');
  const readingAnswers   = allAnswers.filter(a => a.skillType === 'READING');
  const writingAnswers   = allAnswers.filter(a => a.skillType === 'WRITING');
  const speakingAnswers  = allAnswers.filter(a => a.skillType === 'SPEAKING');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold">Xem Đáp Án Chi Tiết</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-500 transition-colors text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isMCQOnly ? (
            <MCQAnswerList
              answers={allAnswers}
              skillName={`Tất cả câu hỏi (${allAnswers.length} câu)`}
              borderColor="border-blue-500"
            />
          ) : (
            <>
              {listeningAnswers.length > 0 && (
                <MCQAnswerList
                  answers={listeningAnswers}
                  skillName={`Listening (${listeningAnswers.length} câu)`}
                  borderColor="border-blue-500"
                />
              )}
              {readingAnswers.length > 0 && (
                <MCQAnswerList
                  answers={readingAnswers}
                  skillName={`Reading (${readingAnswers.length} câu)`}
                  borderColor="border-green-500"
                />
              )}
              {writingAnswers.length > 0 && (
                <WritingSpeakingAnswerList
                  skillName="Writing"
                  answers={writingAnswers}
                  score={result.writingScore || 0}
                  gradingStatus={result.gradingStatus}
                  borderColor="border-purple-500"
                />
              )}
              {speakingAnswers.length > 0 && (
                <WritingSpeakingAnswerList
                  skillName="Speaking"
                  answers={speakingAnswers}
                  score={result.speakingScore || 0}
                  gradingStatus={result.gradingStatus}
                  borderColor="border-orange-500"
                />
              )}
            </>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 flex justify-end border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedAnswersModal;
