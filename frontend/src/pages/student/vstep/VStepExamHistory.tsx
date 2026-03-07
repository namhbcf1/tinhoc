/**
 * VStepExamHistory — History of student VSTEP attempts with scores and grading status
 * Route: /student/vstep/history
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from './components/ScoreUtils';

// --- Status badge ---
const StatusBadge = ({ status, gradingStatus }) => {
  if (status === 'completed' && gradingStatus === 'finalized')
    return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">Đã chấm</span>;
  if (status === 'completed' && gradingStatus === 'pending')
    return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 font-medium">Chờ chấm</span>;
  if (status === 'completed')
    return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">Đã hoàn thành</span>;
  return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 font-medium">Đang thi</span>;
};

// --- Score display ---
const ScoreCell = ({ attempt }) => {
  if (attempt.totalScore == null) return <span className="text-gray-400">—</span>;
  const score = Number(attempt.totalScore);
  const color = score >= 7 ? 'text-green-600' : score >= 5.5 ? 'text-yellow-600' : 'text-red-600';
  return <span className={`font-bold ${color}`}>{score.toFixed(2)}</span>;
};

// --- Empty state ---
const EmptyState = ({ onBack }) => (
  <div className="bg-white rounded-xl shadow p-12 text-center">
    <AlertCircle className="w-14 h-14 text-gray-300 mx-auto mb-4" />
    <p className="text-gray-500 text-lg mb-1">Chưa có lịch sử thi</p>
    <p className="text-gray-400 text-sm mb-5">Bạn chưa hoàn thành bài thi VSTEP nào.</p>
    <button onClick={onBack} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
      Về danh sách thi
    </button>
  </div>
);

// --- Desktop table ---
const HistoryTable = ({ attempts, onViewResult }) => (
  <div className="bg-white rounded-xl shadow overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50">
        <tr>
          {['Đề thi', 'Ngày nộp bài', 'Trạng thái', 'Điểm', 'Thao tác'].map(h => (
            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {attempts.map(attempt => (
          <tr key={attempt.attemptId} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{attempt.examTitle || 'Bài thi VSTEP'}</div>
              {attempt.examCode && <div className="text-xs text-gray-400">{attempt.examCode}</div>}
            </td>
            <td className="px-4 py-3 text-gray-500">
              {formatDateVN(attempt.submittedAt || attempt.endTime)}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={attempt.status} gradingStatus={attempt.gradingStatus} />
            </td>
            <td className="px-4 py-3 text-center">
              <ScoreCell attempt={attempt} />
            </td>
            <td className="px-4 py-3">
              {attempt.status === 'completed' && (
                <button
                  onClick={() => onViewResult(attempt.examId, attempt.attemptId)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs"
                >
                  Xem kết quả <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- Mobile card list ---
const HistoryCards = ({ attempts, onViewResult }) => (
  <div className="space-y-3">
    {attempts.map(attempt => (
      <div key={attempt.attemptId} className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="font-semibold text-gray-800 text-sm flex-1 pr-2">
            {attempt.examTitle || 'Bài thi VSTEP'}
          </div>
          <StatusBadge status={attempt.status} gradingStatus={attempt.gradingStatus} />
        </div>
        <div className="text-xs text-gray-400 mb-2">
          {formatDateVN(attempt.submittedAt || attempt.endTime)}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm">
            Điểm: <ScoreCell attempt={attempt} />
          </div>
          {attempt.status === 'completed' && (
            <button
              onClick={() => onViewResult(attempt.examId, attempt.attemptId)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs"
            >
              Xem kết quả <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
);

// --- Main page ---
const VStepExamHistory = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.request('/vstep/attempts/my-history', { tokenType: 'student' })
      .then(res => {
        if (res.success) setAttempts(res.data?.attempts || res.data || []);
        else setError(res.message || 'Không thể tải lịch sử thi');
      })
      .catch(err => setError(err.message || 'Không thể tải lịch sử thi'))
      .finally(() => setLoading(false));
  }, []);

  const handleViewResult = (examId, attemptId) => {
    navigate(`/dashboard/vstep/result/${examId}/${attemptId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Lịch Sử Thi VSTEP
            </h1>
            <p className="text-gray-500 text-sm mt-1">Tất cả các lần thi của bạn</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/learning')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 bg-white border border-gray-200 rounded-lg px-4 py-2 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Danh sách thi
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Đang tải lịch sử thi...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-red-600 border border-red-100">
            {error}
          </div>
        ) : attempts.length === 0 ? (
          <EmptyState onBack={() => navigate('/dashboard/learning')} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <HistoryTable attempts={attempts} onViewResult={handleViewResult} />
            </div>
            {/* Mobile */}
            <div className="md:hidden">
              <HistoryCards attempts={attempts} onViewResult={handleViewResult} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VStepExamHistory;
