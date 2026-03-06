/**
 * VStepExamResult — Full result page for a student VSTEP attempt
 * Route: /student/vstep/result/:examId/:attemptId
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, Clock, FileText, TrendingUp, Eye, RotateCcw, BookOpen } from 'lucide-react';
import api from '../../../services/api';
import ResultSkillCard from './components/ResultSkillCard';
import MCQAnswerList from './components/MCQAnswerList';
import WritingSpeakingAnswerList from './components/WritingSpeakingAnswerList';
import DetailedAnswersModal from './components/DetailedAnswersModal';
import {
  calculateGrade, getGradeDescription, getScoreColor, getScoreBgColor,
  getGradeColorClass, formatDuration, formatDateVN,
} from './components/ScoreUtils';

// --- Status badge ---
const StatusBadge = ({ gradingStatus }) => {
  if (gradingStatus === 'finalized')
    return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Đã chấm</span>;
  if (gradingStatus === 'pending')
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Chờ chấm</span>;
  return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Đã hoàn thành</span>;
};

// --- Score summary section ---
const ScoreSummary = ({ result }) => {
  const totalScore = result.totalScore || 0;
  const grade = calculateGrade(totalScore);
  const pct = Math.min((totalScore / 10) * 100, 100);
  const isMCQOnly = (result.layoutMode || 'LANGUAGE') === 'MCQ_ONLY';
  const allAnswers = result.answers || [];
  const listeningAnswers = allAnswers.filter(a => a.skillType === 'LISTENING');
  const readingAnswers   = allAnswers.filter(a => a.skillType === 'READING');
  const writingAnswers   = allAnswers.filter(a => a.skillType === 'WRITING');
  const speakingAnswers  = allAnswers.filter(a => a.skillType === 'SPEAKING');
  const isManual = result.gradingStatus === 'pending' || result.gradingStatus === 'finalized';

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Bảng Điểm Tổng Hợp</h2>

      {/* Total score + grade band */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className={`rounded-xl p-6 text-center ${getScoreBgColor(totalScore)}`}>
          <div className={`text-5xl font-bold mb-1 ${getScoreColor(totalScore)}`}>
            {totalScore.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500 mb-3">Điểm tổng (0–10)</div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${totalScore >= 7 ? 'bg-green-500' : totalScore >= 5.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}%</div>
        </div>

        <div className={`rounded-xl p-6 text-center border-2 ${getGradeColorClass(grade)}`}>
          <div className="text-5xl font-bold mb-1">{grade}</div>
          <div className="text-sm text-gray-500 mb-2">Xếp loại VSTEP</div>
          <div className="text-sm font-medium">{getGradeDescription(grade)}</div>
        </div>
      </div>

      {/* Per-skill cards */}
      <div className={`grid gap-3 ${isMCQOnly ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {isMCQOnly ? (
          <>
            <ResultSkillCard skill="Tổng điểm" score={totalScore} correct={allAnswers.filter(a => a.isCorrect).length} total={allAnswers.length} color="blue" />
            <ResultSkillCard skill="Tỷ lệ đúng" score={totalScore} correct={allAnswers.filter(a => a.isCorrect).length} total={allAnswers.length} color="green" />
          </>
        ) : (
          <>
            {listeningAnswers.length > 0 && <ResultSkillCard skill="Listening" score={result.listeningScore || 0} correct={listeningAnswers.filter(a => a.isCorrect).length} total={listeningAnswers.length} color="blue" />}
            {readingAnswers.length > 0   && <ResultSkillCard skill="Reading"   score={result.readingScore || 0}   correct={readingAnswers.filter(a => a.isCorrect).length}   total={readingAnswers.length}   color="green" />}
            {writingAnswers.length > 0   && <ResultSkillCard skill="Writing"   score={result.writingScore || 0}   correct={0} total={0} color="purple"  isManualGrading={isManual} />}
            {speakingAnswers.length > 0  && <ResultSkillCard skill="Speaking"  score={result.speakingScore || 0}  correct={0} total={0} color="orange" isManualGrading={isManual} />}
          </>
        )}
      </div>
    </div>
  );
};

// --- Skill analysis section (inline, collapsible) ---
const SkillAnalysis = ({ result }) => {
  const isMCQOnly = (result.layoutMode || 'LANGUAGE') === 'MCQ_ONLY';
  const allAnswers = result.answers || [];
  const listeningAnswers = allAnswers.filter(a => a.skillType === 'LISTENING');
  const readingAnswers   = allAnswers.filter(a => a.skillType === 'READING');
  const writingAnswers   = allAnswers.filter(a => a.skillType === 'WRITING');
  const speakingAnswers  = allAnswers.filter(a => a.skillType === 'SPEAKING');
  const hasContent = allAnswers.length > 0;
  if (!hasContent) return null;

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        Phân Tích Chi Tiết Theo Kỹ Năng
      </h2>
      {isMCQOnly ? (
        <MCQAnswerList answers={allAnswers} skillName="Tất cả câu hỏi" borderColor="border-blue-500" />
      ) : (
        <>
          {listeningAnswers.length > 0 && <MCQAnswerList answers={listeningAnswers} skillName="Listening" borderColor="border-blue-500" />}
          {readingAnswers.length > 0   && <MCQAnswerList answers={readingAnswers}   skillName="Reading"   borderColor="border-green-500" />}
          {writingAnswers.length > 0   && <WritingSpeakingAnswerList skillName="Writing"  answers={writingAnswers}  score={result.writingScore || 0}  gradingStatus={result.gradingStatus} borderColor="border-purple-500" />}
          {speakingAnswers.length > 0  && <WritingSpeakingAnswerList skillName="Speaking" answers={speakingAnswers} score={result.speakingScore || 0} gradingStatus={result.gradingStatus} borderColor="border-orange-500" />}
        </>
      )}
    </div>
  );
};

// --- Main page ---
const VStepExamResult = () => {
  const navigate = useNavigate();
  const { examId, attemptId } = useParams();
  const [result, setResult]     = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!examId || !attemptId) { setError('Thiếu thông tin bài thi'); setLoading(false); return; }
    api.request(`/vstep/attempts/${attemptId}/result`)
      .then(res => { if (res.success) setResult(res.data); else setError(res.message || 'Không thể tải kết quả'); })
      .catch(err => setError(err.message || 'Không thể tải kết quả'))
      .finally(() => setLoading(false));
  }, [examId, attemptId]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <div className="text-gray-500">Đang tải kết quả...</div>
      </div>
    </div>
  );

  if (error || !result) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-sm p-6">
        <div className="text-red-600 font-semibold text-lg mb-2">Không tìm thấy kết quả</div>
        <div className="text-gray-500 mb-4 text-sm">{error || 'Kết quả bài thi không tồn tại.'}</div>
        <button onClick={() => navigate('/dashboard/learning')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm">
          Về danh sách thi
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{result.studentName || 'Học viên'}</h1>
                <p className="text-gray-500 text-sm">{result.examTitle || 'Bài thi VSTEP'}</p>
              </div>
            </div>
            <StatusBadge gradingStatus={result.gradingStatus} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Ngày thi: {formatDateVN(result.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Thời gian: {formatDuration(result.startTime, result.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>Tổng số câu: {result.answers?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Score summary */}
        <ScoreSummary result={result} />

        {/* Per-skill analysis */}
        <SkillAnalysis result={result} />

        {/* Action buttons */}
        <div className="bg-white rounded-xl shadow p-5 flex flex-wrap justify-center gap-3">
          <button onClick={() => navigate('/dashboard/learning')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm">
            <BookOpen className="w-4 h-4" /> Về danh sách thi
          </button>
          <button onClick={() => navigate('/dashboard/vstep/history')} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-5 py-2.5 rounded-lg transition-colors text-sm">
            <Clock className="w-4 h-4" /> Lịch sử thi
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm">
            <Eye className="w-4 h-4" /> Xem đáp án chi tiết
          </button>
        </div>
      </div>

      {showModal && <DetailedAnswersModal result={result} onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default VStepExamResult;
