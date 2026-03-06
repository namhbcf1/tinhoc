import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, PlayCircle, Clock, Award, RotateCcw,
  CheckCircle, AlertCircle, XCircle, RefreshCw
} from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

// ─── Level badge colors ────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  B1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B2: 'bg-blue-100 text-blue-700 border-blue-200',
  C1: 'bg-violet-100 text-violet-700 border-violet-200',
};
const getLevelColor = (level = '') =>
  LEVEL_COLORS[level.toUpperCase()] || 'bg-slate-100 text-slate-600 border-slate-200';

// ─── Mobile Exam Card ─────────────────────────────────────────────────────────
const MobileExamCard = ({ exam, onStart }) => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm active:scale-[0.98] transition-all duration-150">
    <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
    <div className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-1.5">
            {exam.title}
          </h3>
          <div className="flex flex-wrap gap-1">
            {exam.level && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getLevelColor(exam.level)}`}>
                {exam.level}
              </span>
            )}
            {exam.code && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {exam.code}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock size={12} className="text-blue-400" />
          {exam.duration} phút
        </span>
        <span className="flex items-center gap-1">
          <Award size={12} className="text-orange-400" />
          4 kỹ năng
        </span>
      </div>

      <button
        onClick={() => onStart(exam.id)}
        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:opacity-80 shadow-sm shadow-blue-200"
      >
        <PlayCircle size={17} />
        Vào thi
      </button>
    </div>
  </div>
);

// ─── History item ─────────────────────────────────────────────────────────────
const HistoryItem = ({ attempt }) => {
  const date = attempt.submitted_at || attempt.created_at;
  const dateStr = date
    ? new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : '—';
  const score = attempt.total_score ?? attempt.score;
  const scoreNum = score != null ? Number(score) : null;
  const scoreCls =
    scoreNum == null ? 'text-slate-400' :
    scoreNum >= 8 ? 'text-emerald-600' :
    scoreNum >= 5 ? 'text-amber-600' : 'text-red-600';

  const StatusIcon = attempt.status === 'submitted' ? CheckCircle :
    attempt.status === 'in_progress' ? AlertCircle : XCircle;
  const iconCls = attempt.status === 'submitted' ? 'text-emerald-500' :
    attempt.status === 'in_progress' ? 'text-amber-500' : 'text-slate-400';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <StatusIcon size={16} className={iconCls} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {attempt.exam_title || attempt.title || 'Bài thi VSTEP'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
      </div>
      {attempt.level && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getLevelColor(attempt.level)}`}>
          {attempt.level}
        </span>
      )}
      <span className={`text-base font-black flex-shrink-0 ${scoreCls}`}>
        {scoreNum != null ? scoreNum.toFixed(1) : '—'}
      </span>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MobileExamModule() {
  const [exams, setExams] = useState([]);
  const [confirmState, setConfirmState] = useState({ open: false, examId: null });
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
    fetchHistory();
  }, []);

  // Pull-to-refresh callback
  const handleRefresh = async () => {
    await Promise.all([fetchExams(), fetchHistory()]);
  };

  const fetchExams = async () => {
    try {
      const res = await api.getPublishedExams();
      setExams(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.getMyExamHistory(5);
      setHistory(res?.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Opens confirm dialog — replaces window.confirm()
  const handleStart = (examId) => {
    setConfirmState({ open: true, examId });
  };

  const confirmStart = async () => {
    const { examId } = confirmState;
    try {
      const res = await api.request('/vstep/attempts', {
        method: 'POST',
        body: JSON.stringify({ exam_id: examId }),
        tokenType: 'student',
      });
      if (res?.success) navigate(`/student/vstep/take/${res.data.attempt_id}`);
    } catch (err) {
      // Replace alert() with toast
      toast.error(err.message || 'Không thể bắt đầu bài thi.');
    }
  };

  const refresh = () => {
    setLoadingExams(true);
    setLoadingHistory(true);
    fetchExams();
    fetchHistory();
  };

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh}>
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-5 pt-6 pb-8">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
              <GraduationCap size={24} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">VSTEP</p>
              <h1 className="text-white font-black text-xl tracking-tight">Học tập</h1>
            </div>
          </div>
          <button
            onClick={refresh}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center active:scale-90 transition-transform"
          >
            <RefreshCw size={16} className={`text-white ${(loadingExams || loadingHistory) ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          {[
            { label: 'Đề thi mở', value: loadingExams ? '...' : exams.length },
            { label: 'Lần thi', value: loadingHistory ? '...' : history.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
              <p className="text-white font-black text-xl leading-none">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Section 1: Published exams */}
        <section>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Danh sách đề thi
          </p>
          {loadingExams ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                  <div className="flex gap-3 mb-3">
                    <div className="w-11 h-11 bg-slate-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-9 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
              <GraduationCap size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Chưa có đề thi nào được mở.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(exam => (
                <MobileExamCard key={exam.id} exam={exam} onStart={handleStart} />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: History */}
        <section>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Lịch sử thi gần đây
          </p>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loadingHistory ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-slate-100 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                    </div>
                    <div className="h-5 w-10 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <RotateCcw size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Chưa có lịch sử thi.</p>
              </div>
            ) : (
              <div className="px-4 divide-y divide-slate-100">
                {history.map((attempt, i) => (
                  <HistoryItem key={attempt.attempt_id || attempt.id || i} attempt={attempt} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    </PullToRefreshWrapper>
  );
}
