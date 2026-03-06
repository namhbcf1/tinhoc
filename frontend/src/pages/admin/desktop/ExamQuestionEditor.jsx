import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronRight, Plus, Edit, Trash2, RefreshCw, AlertCircle,
  Mic, Award, Clock, HelpCircle, CheckCircle, Upload, Download, ArrowLeft,
} from 'lucide-react';
import api from '../../../services/api';
import QuestionFormModal from './exam-components/QuestionFormModal';
import ExcelImportModal from './exam-components/ExcelImportModal';

// ── helpers ──────────────────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS = {
  MULTIPLE_CHOICE: 'Trắc nghiệm',
  ESSAY: 'Tự luận',
  RECORDING: 'Ghi âm',
  FILL_IN_BLANK: 'Điền khuyết',
};

function parseOptions(optionsJson) {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((opt, i) => ({
      id: String(opt.id || i + 1),
      content: String(opt.content || opt),
      isCorrect: Boolean(opt.isCorrect),
    }));
  } catch {
    return [];
  }
}

function getCorrectAnswerLabel(options, correctAnswer) {
  const idx = options.findIndex(o => o.isCorrect);
  if (idx >= 0) return String.fromCharCode(65 + idx);
  if (correctAnswer) {
    const letter = correctAnswer.trim().toUpperCase();
    if (/^[A-D]$/.test(letter)) return letter;
    const i = options.findIndex(o => o.id === correctAnswer || o.content === correctAnswer);
    if (i >= 0) return String.fromCharCode(65 + i);
    return correctAnswer;
  }
  return null;
}

// ── main component ────────────────────────────────────────────────────────────

export default function ExamQuestionEditor({ examId, examTitle, onBack, toast }) {
  const [exam, setExam] = useState(null);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionSectionId, setQuestionSectionId] = useState(null);
  const [questionGroupId, setQuestionGroupId] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadExam = useCallback(async () => {
    if (!examId) return;
    try {
      setIsLoading(true);
      setError('');
      const [examPayload, sectionList, questionList] = await Promise.all([
        api.getExam(examId),
        api.getExamSections(examId),
        api.getExamQuestions(examId),
      ]);

      setExam({
        id: String(examPayload.id),
        title: examPayload.title || examPayload.examTitle || `Đề thi #${examId}`,
        code: examPayload.code,
        level: examPayload.level,
        status: examPayload.status,
      });
      setSections(sectionList || []);

      const qMap = {};
      for (const q of (questionList || [])) {
        const key = q.groupId ?? 0;
        if (!qMap[key]) qMap[key] = [];
        qMap[key].push(q);
      }
      setQuestions(qMap);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu đề thi');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => { loadExam(); }, [loadExam]);

  const allQuestions = Object.values(questions).flat();

  const stats = {
    totalQuestions: allQuestions.length,
    totalPoints: allQuestions.reduce((s, q) => s + (q.points || 0), 0),
    totalDuration: sections.reduce((s, sec) => s + (sec.duration || 0), 0),
  };

  const openAddQuestion = async () => {
    if (!examId) return;
    try {
      let sectionId;
      if (sections.length === 0) {
        const newSection = await api.createExamSection(examId, { type: 'GENERAL', title: 'Câu hỏi', duration: 0, instructions: '' });
        sectionId = newSection.id;
        const updated = await api.getExamSections(examId);
        setSections(updated || []);
      } else {
        sectionId = sections[0].id;
      }
      setEditingQuestion(null);
      setQuestionSectionId(sectionId);
      setQuestionGroupId(null);
      setQuestionModalOpen(true);
    } catch (err) {
      setError(err.message || 'Không thể tạo section');
    }
  };

  const openEditQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionSectionId(q.sectionId);
    setQuestionGroupId(q.groupId ?? null);
    setQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (data) => {
    if (!examId || questionSectionId == null) return;
    let correctAnswer = '';
    if (data.type === 'MULTIPLE_CHOICE' && data.options) {
      const ci = data.options.findIndex(o => o.isCorrect === true);
      if (ci >= 0) correctAnswer = String.fromCharCode(65 + ci);
    } else if (data.type === 'FILL_IN_BLANK') {
      correctAnswer = data.correctAnswer || '';
    }
    const payload = {
      sectionId: questionSectionId, groupId: questionGroupId,
      content: data.content, type: data.type, points: data.points,
      explanation: data.explanation,
      options: data.type === 'MULTIPLE_CHOICE' ? data.options : undefined,
      correctAnswer,
      orderIndex: editingQuestion?.orderIndex || data.orderIndex,
    };
    if (editingQuestion) {
      await api.updateExamQuestion(examId, editingQuestion.id, payload);
    } else {
      await api.createExamQuestion(examId, payload);
    }
    await loadExam();
  };

  const handleDelete = async () => {
    if (!examId || deleteConfirm.id == null) return;
    try {
      setIsDeleting(true);
      await api.deleteExamQuestion(examId, deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null, name: '' });
      await loadExam();
    } catch (err) {
      toast?.error(err.message || 'Không thể xóa câu hỏi');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center text-gray-600">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" />
          <span>Đang tải dữ liệu đề thi...</span>
        </div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] px-4">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <div className="text-red-600 mb-4">{error || 'Không tìm thấy đề thi'}</div>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex flex-col gap-3">
        <nav className="flex items-center text-sm text-gray-500">
          <button onClick={onBack} className="hover:text-gray-700 flex items-center gap-1 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Quản lý đề thi
          </button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="font-medium text-gray-900 truncate max-w-[300px]">{exam?.title}</span>
        </nav>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{exam?.title}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${exam?.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {exam?.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
              </span>
            </div>
            {exam?.code && <span className="inline-flex items-center text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200 font-mono font-medium text-gray-700">{exam.code}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setImportModalOpen(true)} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              <Upload className="w-4 h-4 mr-1.5" /> Import Excel
            </button>
            <button onClick={openAddQuestion} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm">
              <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && exam && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 text-sm font-medium">Đóng</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Câu hỏi', value: stats.totalQuestions, icon: HelpCircle, color: 'text-emerald-500' },
          { label: 'Tổng điểm', value: stats.totalPoints, icon: Award, color: 'text-amber-500' },
          { label: 'Thời gian', value: `${stats.totalDuration}m`, icon: Clock, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-sm text-gray-600">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Danh sách câu hỏi</h2>
        {allQuestions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-dashed border-gray-300">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 font-medium">Chưa có câu hỏi nào</p>
            <p className="text-gray-400 text-sm mb-6">Bắt đầu bằng cách thêm câu hỏi hoặc import từ file Excel</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={openAddQuestion} className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
              </button>
              <button onClick={() => setImportModalOpen(true)} className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {allQuestions.map((q, qIdx) => {
              const options = parseOptions(q.optionsJson);
              const correctLabel = getCorrectAnswerLabel(options, q.correctAnswer);
              const typeLabel = QUESTION_TYPE_LABELS[q.type] || q.type;
              return (
                <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900 text-sm flex-1">
                      <span className="text-blue-600 font-bold mr-1.5">Câu {qIdx + 1}.</span>
                      {q.content}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{typeLabel}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{q.points}đ</span>
                      <button onClick={() => openEditQuestion(q)} className="p-1 rounded hover:bg-gray-100" title="Sửa câu hỏi">
                        <Edit className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                      <button onClick={() => setDeleteConfirm({ open: true, id: q.id, name: q.content.slice(0, 50) })} className="p-1 rounded hover:bg-red-100" title="Xóa câu hỏi">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {q.type === 'MULTIPLE_CHOICE' && options.length > 0 && (
                    <div className="space-y-1 mt-3">
                      {options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isCorrect = opt.isCorrect || letter === correctLabel;
                        return (
                          <div key={opt.id} className={`flex items-start px-3 py-2 rounded-lg text-sm ${isCorrect ? 'bg-green-50 border border-green-300' : 'bg-gray-50'}`}>
                            <span className={`font-bold mr-2 shrink-0 ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                            <span className={isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}>{opt.content}</span>
                            {isCorrect && <CheckCircle className="w-4 h-4 text-green-600 ml-auto shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type !== 'MULTIPLE_CHOICE' && q.correctAnswer && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                      <span className="font-medium text-green-700">Đáp án mẫu: </span>
                      <span className="text-green-800">{q.correctAnswer}</span>
                    </div>
                  )}

                  {q.type === 'ESSAY' && !q.correctAnswer && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-500 italic">Học viên viết bài luận - giáo viên chấm thủ công</div>
                  )}
                  {q.type === 'RECORDING' && !q.correctAnswer && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-500 italic flex items-center gap-2">
                      <Mic className="w-4 h-4" /> Học viên ghi âm - giáo viên chấm thủ công
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                      <HelpCircle className="w-3.5 h-3.5 text-yellow-600 inline mr-1" />
                      <span className="text-yellow-800">{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteConfirm({ open: false, id: null, name: '' })} />
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative z-10">
            <h3 className="font-bold text-gray-900 mb-2">Xóa câu hỏi</h3>
            <p className="text-gray-600 text-sm mb-6">Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm({ open: false, id: null, name: '' })} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Hủy</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {questionSectionId !== null && (
        <QuestionFormModal
          isOpen={questionModalOpen}
          onClose={() => setQuestionModalOpen(false)}
          onSubmit={async (data) => { await handleSaveQuestion(data); }}
          initialData={editingQuestion ? {
            sectionId: questionSectionId,
            groupId: questionGroupId ?? editingQuestion.groupId ?? null,
            content: editingQuestion.content,
            type: editingQuestion.type,
            points: editingQuestion.points,
            explanation: editingQuestion.explanation || '',
            correctAnswer: editingQuestion.correctAnswer || '',
            options: (() => {
              if (editingQuestion.optionsJson) {
                try {
                  const p = JSON.parse(editingQuestion.optionsJson);
                  if (Array.isArray(p) && p.length > 0) {
                    return p.map(opt => ({ id: opt.id || String(Math.random()), content: typeof opt === 'string' ? opt : (opt.content || ''), isCorrect: opt.isCorrect === true }));
                  }
                } catch (e) {}
              }
              return [];
            })(),
          } : null}
          title={editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
          sectionId={questionSectionId}
          groupId={questionGroupId}
        />
      )}

      <ExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => loadExam()}
        examId={examId}
      />
    </div>
  );
}
