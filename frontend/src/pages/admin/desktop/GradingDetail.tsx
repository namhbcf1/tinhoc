import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import api from '../../../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('vi-VN');
}

function SkillBadge({ label, value, color }) {
  return (
    <div className={`flex-1 bg-${color}-50 border border-${color}-100 rounded-xl px-4 py-3`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-800">{value.toFixed(1)}</div>
    </div>
  );
}

// ── SectionBlock sub-component ────────────────────────────────────────────────

function SectionBlock({ title, description, questions, localScores, onChangeScore, onSubmitScore, savingId, mode }) {
  if (!questions.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {questions.map((q, index) => {
          const local = localScores[q.questionId] || { score: '', feedback: '' };
          const isSaving = savingId === q.questionId;
          const isSpeakingRecording =
            title === 'Speaking' && q.questionType === 'RECORDING' && q.answerText?.startsWith('http');

          return (
            <div key={q.id} className="border border-gray-100 rounded-lg p-4 hover:border-blue-100 hover:bg-blue-50/40 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">{q.questionType}</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">Tối đa {q.maxPoints} điểm</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 whitespace-pre-line mb-2">{q.questionText}</div>

                  {q.answerText && !isSpeakingRecording && (
                    <div className="mt-2 text-sm">
                      <div className="text-gray-500 mb-1">Câu trả lời của học viên:</div>
                      <div className="bg-white rounded border border-gray-200 px-3 py-2 text-gray-800 whitespace-pre-line">{q.answerText}</div>
                    </div>
                  )}
                  {isSpeakingRecording && (
                    <div className="mt-2 text-sm">
                      <div className="text-gray-500 mb-1">Ghi âm của học viên:</div>
                      <audio controls className="w-full"><source src={q.answerText} /></audio>
                    </div>
                  )}
                  {(title === 'Listening' || title === 'Reading') && (
                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                      <span>Đáp án hệ thống: <span className="font-semibold text-gray-700">{q.correctAnswer || 'N/A'}</span></span>
                      <span>Điểm: <span className="font-semibold text-gray-700">{q.score != null ? q.score : 0} / {q.maxPoints}</span></span>
                    </div>
                  )}
                </div>

                {mode === 'editable' && (
                  <div className="w-64 border-l border-gray-100 pl-4 shrink-0">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Điểm (0 - {q.maxPoints})</label>
                    <input
                      type="number" step="0.1" min={0} max={q.maxPoints}
                      value={local.score}
                      onChange={e => onChangeScore(q.questionId, 'score', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="block text-xs font-semibold text-gray-600 mt-3 mb-1">Nhận xét cho học viên</label>
                    <textarea
                      rows={3} value={local.feedback}
                      onChange={e => onChangeScore(q.questionId, 'feedback', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button
                      onClick={() => onSubmitScore(q)} disabled={isSaving}
                      className="mt-3 inline-flex items-center justify-center w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu điểm'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function GradingDetail({ attemptId: propAttemptId, onBack }) {
  // Support both prop-based and URL-param-based
  const [searchParams] = useSearchParams?.() || [new URLSearchParams()];
  const attemptId = propAttemptId || searchParams?.get?.('attemptId');

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [localScores, setLocalScores] = useState({});

  useEffect(() => {
    const fetchDetail = async () => {
      if (!attemptId) return;
      try {
        setIsLoading(true);
        const res = await api.getAttemptDetail(attemptId);
        setData(res);
        const initial = {};
        (res.answers || []).forEach(a => {
          initial[a.questionId] = { score: a.score != null ? String(a.score) : '', feedback: a.feedback || '' };
        });
        setLocalScores(initial);
      } catch (e) {
        setError(e.message || 'Không thể tải dữ liệu bài thi');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [attemptId]);

  const handleChangeScore = (questionId, field, value) => {
    setLocalScores(prev => ({
      ...prev,
      [questionId]: {
        score: field === 'score' ? value : prev[questionId]?.score || '',
        feedback: field === 'feedback' ? value : prev[questionId]?.feedback || '',
      },
    }));
  };

  const handleSubmitScore = async (question) => {
    if (!attemptId) return;
    const local = localScores[question.questionId] || { score: '', feedback: '' };
    const parsedScore = parseFloat(local.score);
    if (isNaN(parsedScore)) { alert('Điểm không hợp lệ'); return; }
    try {
      setSavingId(question.questionId);
      await api.submitGrade(String(data?.attemptId ?? attemptId), String(question.questionId), parsedScore, local.feedback || undefined);
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, answers: prev.answers.map(a => a.questionId === question.questionId ? { ...a, score: parsedScore, feedback: local.feedback } : a) };
      });
    } catch (e) {
      alert(e.message || 'Không thể lưu điểm');
    } finally {
      setSavingId(null);
    }
  };

  const groupedBySkill = (skill) =>
    (data?.answers || []).filter(a => (a.skillType || '').toUpperCase() === skill.toUpperCase());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Đang tải dữ liệu bài thi...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] px-4">
        <XCircle className="w-10 h-10 text-red-500 mb-3" />
        <div className="text-gray-700 mb-4">{error || 'Không tìm thấy dữ liệu bài thi'}</div>
        {onBack && (
          <button onClick={onBack} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
          </button>
        )}
      </div>
    );
  }

  const scores = data.scores || { listening: 0, reading: 0, writing: 0, speaking: 0, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              {onBack && (
                <>
                  <button onClick={onBack} className="text-blue-600 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Danh sách chấm bài
                  </button>
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
              <span>Chấm bài #{data.attemptId}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-1">{data.examTitle}</h1>
            <p className="text-gray-600 text-sm">
              Học viên: <span className="font-semibold">{data.student?.name}</span>
              {data.student?.phone && <> · SĐT: <span className="font-semibold">{data.student.phone}</span></>}
              · Nộp bài: <span className="font-semibold">{formatDateTime(data.submittedAt)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data.gradingStatus === 'finalized' ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">Đã hoàn thành chấm</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">Chờ chấm xong</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Score sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-3">ĐIỂM THEO KỸ NĂNG</div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <SkillBadge label="Listening" value={scores.listening} color="blue" />
                <SkillBadge label="Reading" value={scores.reading} color="indigo" />
              </div>
              <div className="flex gap-2">
                <SkillBadge label="Writing" value={scores.writing} color="emerald" />
                <SkillBadge label="Speaking" value={scores.speaking} color="orange" />
              </div>
              <div className="mt-2 border-t pt-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">Điểm trung bình</div>
                <div className="mt-1 text-3xl font-extrabold text-gray-900">{scores.total.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="lg:col-span-3 space-y-6">
          <SectionBlock title="Listening" description="Câu hỏi trắc nghiệm đã được hệ thống tự chấm." questions={groupedBySkill('LISTENING')} localScores={localScores} onChangeScore={handleChangeScore} onSubmitScore={handleSubmitScore} savingId={savingId} mode="readonly" />
          <SectionBlock title="Reading" description="Câu hỏi trắc nghiệm đã được hệ thống tự chấm." questions={groupedBySkill('READING')} localScores={localScores} onChangeScore={handleChangeScore} onSubmitScore={handleSubmitScore} savingId={savingId} mode="readonly" />
          <SectionBlock title="Writing" description="Nhập điểm và nhận xét cho từng bài viết." questions={groupedBySkill('WRITING')} localScores={localScores} onChangeScore={handleChangeScore} onSubmitScore={handleSubmitScore} savingId={savingId} mode="editable" />
          <SectionBlock title="Speaking" description="Nghe lại file ghi âm và chấm điểm." questions={groupedBySkill('SPEAKING')} localScores={localScores} onChangeScore={handleChangeScore} onSubmitScore={handleSubmitScore} savingId={savingId} mode="editable" />
        </div>
      </div>
    </div>
  );
}
