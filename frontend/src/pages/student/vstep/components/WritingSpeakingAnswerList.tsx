/**
 * WritingSpeakingAnswerList — shows answer text + teacher feedback for Writing/Speaking
 * Used by VStepExamResult
 */

const WritingSpeakingAnswerList = ({ skillName, answers, score, gradingStatus, borderColor = 'border-purple-500' }) => {
  const isGraded = gradingStatus === 'finalized';

  return (
    <div className="mb-6 pb-6 border-b border-gray-200 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-lg font-bold text-gray-800 border-l-4 pl-3 ${borderColor}`}>
          {skillName}
        </h3>
        <span className={`text-sm font-semibold ${isGraded ? 'text-green-600' : 'text-yellow-600'}`}>
          {isGraded ? `Điểm: ${score.toFixed(1)}/10` : 'Chờ chấm'}
        </span>
      </div>

      <div className="space-y-4">
        {answers.map((answer, idx) => (
          <div key={answer.questionId || idx} className="border rounded-lg p-4 bg-gray-50">
            <div className="font-semibold text-sm mb-2">
              Câu {idx + 1}{answer.questionText ? `: ${answer.questionText}` : ''}
            </div>

            <div className="text-sm text-gray-700 mb-3">
              <span className="font-medium text-gray-600">Bài làm của bạn:</span>
              <div className="mt-1 p-3 bg-white rounded border border-gray-200 whitespace-pre-wrap leading-relaxed">
                {answer.answerText || '(Chưa có bài làm)'}
              </div>
            </div>

            {/* Audio for Speaking */}
            {answer.audioUrl && (
              <div className="mb-3">
                <span className="text-xs font-medium text-gray-500 block mb-1">Bản ghi âm:</span>
                <audio controls className="w-full h-10">
                  <source src={answer.audioUrl} type="audio/mpeg" />
                  Trình duyệt không hỗ trợ audio.
                </audio>
              </div>
            )}

            {/* Teacher feedback */}
            {answer.feedback && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                <span className="font-medium text-blue-800">Nhận xét của giáo viên:</span>
                <div className="text-blue-700 mt-1 whitespace-pre-wrap">{answer.feedback}</div>
              </div>
            )}

            {answer.score != null && (
              <div className="text-xs text-gray-500 mt-2">
                Điểm câu này: <span className="font-bold text-gray-800">{answer.score}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WritingSpeakingAnswerList;
