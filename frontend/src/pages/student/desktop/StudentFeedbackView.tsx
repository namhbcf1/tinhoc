// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { MessageSquareQuote, Pencil, RefreshCw, Send, Star } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import {
  StudentCardSkeleton,
  StudentEmptyState,
  StudentInfoCard,
  StudentPageShell,
  StudentPill,
  StudentSection,
} from '../../../features/student/student-shared';
import { useStudentFeedbacks } from '../../../features/student/student-hooks';
import api from '../../../services/api';

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function renderStars(rating: number, size = 14) {
  return Array.from({ length: 5 }).map((_, index) => (
    <Star
      key={`${rating}-${index}`}
      size={size}
      className={index < rating ? 'fill-[var(--vt-champagne)] text-[var(--vt-champagne)]' : 'text-[var(--vt-line)]'}
    />
  ));
}

const STATUS_CONFIG: Record<string, { label: string; tone: 'blue' | 'emerald' | 'amber' }> = {
  submitted: { label: 'Đã gửi chờ review', tone: 'blue' },
  approved: { label: 'Đã duyệt', tone: 'emerald' },
  rejected: { label: 'Cần chỉnh sửa', tone: 'amber' },
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Tốt',
  mixed: 'Trung tính',
  negative: 'Cần cải thiện',
};

export default function StudentFeedbackView({ compact = false }: { compact?: boolean }) {
  const { feedbacks, availableClasses, loading, error, refetch } = useStudentFeedbacks();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formClassId, setFormClassId] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const submittedCount = feedbacks.filter((item) => item.status === 'submitted').length;
  const approvedCount = feedbacks.filter((item) => item.status === 'approved').length;
  const rejectedCount = feedbacks.filter((item) => item.status === 'rejected').length;

  useEffect(() => {
    if (!editingId && !formClassId && availableClasses[0]?.online_class_id) {
      setFormClassId(String(availableClasses[0].online_class_id));
    }
  }, [availableClasses, editingId, formClassId]);

  const editingFeedback = useMemo(
    () => feedbacks.find((item) => item.id === editingId) || null,
    [editingId, feedbacks],
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setRating(5);
    setFormClassId(availableClasses[0]?.online_class_id ? String(availableClasses[0].online_class_id) : '');
  };

  const startEdit = (feedback: any) => {
    setEditingId(feedback.id);
    setFormClassId(String(feedback.online_class_id));
    setRating(Number(feedback.rating || 5));
    setTitle(feedback.title || '');
    setContent(feedback.content || '');
    setSubmitMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setSubmitMessage(null);
    if (!editingId && !formClassId) {
      setSubmitMessage({ type: 'error', text: 'Vui lòng chọn lớp học để gửi phản hồi.' });
      return;
    }
    if (!title.trim()) {
      setSubmitMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề phản hồi.' });
      return;
    }
    if (!content.trim()) {
      setSubmitMessage({ type: 'error', text: 'Vui lòng nhập nội dung phản hồi.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        online_class_id: Number(formClassId),
        rating,
        title: title.trim(),
        content: content.trim(),
      };

      if (editingId) {
        await (api as any).updateStudentFeedback(editingId, payload);
        setSubmitMessage({ type: 'success', text: 'Đã cập nhật phản hồi và gửi lại để review.' });
      } else {
        await (api as any).submitStudentFeedback(payload);
        setSubmitMessage({ type: 'success', text: 'Đã gửi phản hồi của bạn tới giáo viên để review.' });
      }

      await refetch();
      resetForm();
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err?.message || 'Không thể gửi phản hồi lúc này.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentPageShell
      icon={<MessageSquareQuote size={18} />}
      title="FEEDBACK LỚP HỌC"
      subtitle="Gửi phản hồi thật về chất lượng lớp học. Giáo viên sẽ review và phản hồi công khai đúng thực tế."
      compact={compact}
      stickyHeader={!compact}
      stats={[
        { label: 'Đã duyệt', value: approvedCount },
        { label: 'Chờ review', value: submittedCount },
        { label: 'Cần sửa', value: rejectedCount },
      ]}
      action={(
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-[var(--vt-line)] bg-white/80 text-[var(--vt-muted)] hover:border-[var(--vt-champagne)] hover:text-[var(--vt-ink)]"
          onClick={() => { setSubmitMessage(null); void refetch(); }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      )}
    >
      {loading ? <StudentCardSkeleton count={2} /> : null}

      {!loading && error ? (
        <StudentEmptyState
          title="Không thể tải dữ liệu phản hồi"
          description={error}
          action={<Button variant="outline" onClick={() => void refetch()}>Tải lại</Button>}
        />
      ) : null}

      {!loading && !error ? (
        <>
          <StudentSection
            title={editingId ? 'Cập nhật phản hồi' : 'Gửi phản hồi mới'}
            description="Chỉ áp dụng cho lớp bạn đã học hoặc đang học"
          >
            <StudentInfoCard className="space-y-5">
              {submitMessage ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  submitMessage.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  {submitMessage.text}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]">Lớp học</label>
                  <Select
                    value={formClassId}
                    onChange={(event) => setFormClassId(event.target.value)}
                    disabled={Boolean(editingId) || availableClasses.length === 0}
                    className="h-11 rounded-2xl border-[var(--vt-line)] bg-white/85 text-[var(--vt-ink)] shadow-sm"
                  >
                    {editingId ? (
                      <option value={formClassId}>{editingFeedback?.class_name || 'Lớp đã chọn'}</option>
                    ) : (
                      <>
                        {!availableClasses.length ? <option value="">Chưa có lớp đủ điều kiện</option> : null}
                        {availableClasses.map((item) => (
                          <option key={item.online_class_id} value={item.online_class_id}>
                            {item.class_name}
                          </option>
                        ))}
                      </>
                    )}
                  </Select>
                </div>

                <div className="space-y-2 lg:min-w-[310px]">
                  <label className="text-[12px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]">Mức đánh giá</label>
                  <div className="flex items-center gap-2 rounded-2xl border border-[var(--vt-line)] bg-white/70 p-2 shadow-sm">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const current = index + 1;
                      const active = current <= rating;
                      return (
                        <button
                          key={current}
                          type="button"
                          onClick={() => setRating(current)}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                            active ? 'bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne)]' : 'text-[var(--vt-line)] hover:bg-[var(--vt-paper)]'
                          }`}
                        >
                          <Star size={18} className={active ? 'fill-[var(--vt-champagne)] text-[var(--vt-champagne)]' : ''} />
                        </button>
                      );
                    })}
                    <span className="ml-1 rounded-full bg-[var(--vt-ink)] px-2.5 py-1 text-xs font-black text-white">{rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]">Tiêu đề</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ví dụ: Lớp có lộ trình rõ ràng và hỗ trợ tốt"
                  className="h-11 rounded-2xl border-[var(--vt-line)] bg-white/85 text-[var(--vt-ink)] shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]">Nội dung phản hồi</label>
                <Textarea
                  rows={6}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Nêu rõ điểm tốt, điểm cần cải thiện, mức độ hỗ trợ của giáo viên và trải nghiệm học thực tế."
                  className="rounded-2xl border-[var(--vt-line)] bg-white/85 text-[var(--vt-ink)] shadow-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={submitting || (!editingId && !availableClasses.length)}
                  className="rounded-full bg-[var(--vt-ink)] px-5 font-black text-white shadow-[var(--vt-shadow-card)] hover:bg-[var(--vt-ink-soft)]"
                >
                  {submitting ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
                  {editingId ? 'Cập nhật & gửi lại' : 'Gửi phản hồi'}
                </Button>
                {editingId ? (
                  <Button variant="outline" onClick={resetForm} className="rounded-full border-[var(--vt-line)] bg-white/80 text-[var(--vt-muted)] hover:text-[var(--vt-ink)]">
                    Hủy chỉnh sửa
                  </Button>
                ) : null}
              </div>
            </StudentInfoCard>
          </StudentSection>

          <StudentSection
            title="Lịch sử phản hồi"
            description="Các phản hồi bạn đã gửi cho từng lớp"
          >
            {!feedbacks.length ? (
              <StudentEmptyState
                title={availableClasses.length ? 'Bạn chưa gửi phản hồi nào' : 'Chưa có lớp đủ điều kiện để phản hồi'}
                description={availableClasses.length
                  ? 'Hãy gửi phản hồi khách quan sau khi hoàn thành hoặc tham gia lớp học.'
                  : 'Khi bạn được ghi nhận vào một lớp học hợp lệ, form phản hồi sẽ xuất hiện tại đây.'}
              />
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => {
                  const status = STATUS_CONFIG[feedback.status] || STATUS_CONFIG.submitted;
                  return (
                    <StudentInfoCard key={feedback.id} className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black tracking-[-0.02em] text-[var(--vt-ink)]">{feedback.class_name}</h3>
                            <StudentPill tone={status.tone}>{status.label}</StudentPill>
                            {feedback.sentiment ? (
                              <StudentPill tone={feedback.sentiment === 'positive' ? 'emerald' : feedback.sentiment === 'mixed' ? 'amber' : 'red'}>
                                {SENTIMENT_LABELS[feedback.sentiment]}
                              </StudentPill>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-black text-[var(--vt-ink)]">{feedback.title}</p>
                          <div className="mt-2 flex items-center gap-1">{renderStars(Number(feedback.rating), 15)}</div>
                        </div>

                        {(feedback.status === 'submitted' || feedback.status === 'rejected') ? (
                          <Button variant="outline" size="sm" className="rounded-full border-[var(--vt-line)] bg-white/80 text-[var(--vt-muted)] hover:text-[var(--vt-ink)]" onClick={() => startEdit(feedback)}>
                            <Pencil size={14} className="mr-2" />
                            Sửa
                          </Button>
                        ) : null}
                      </div>

                      <p className="whitespace-pre-line rounded-2xl border border-[var(--vt-line)] bg-white/60 px-4 py-3 text-sm leading-relaxed text-[var(--vt-muted)]">{feedback.content}</p>

                      {feedback.review_note_internal ? (
                        <div className="rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] px-4 py-3 text-sm text-[var(--vt-ink)]">
                          <div className="font-black">Lý do cần chỉnh sửa</div>
                          <div className="mt-1 whitespace-pre-line text-[var(--vt-muted)]">{feedback.review_note_internal}</div>
                        </div>
                      ) : null}

                      {feedback.teacher_response ? (
                        <div className="rounded-2xl border border-[var(--vt-line)] bg-white/65 px-4 py-3 text-sm text-[var(--vt-muted)]">
                          <div className="font-black text-[var(--vt-emerald)]">Phản hồi từ giáo viên / trung tâm</div>
                          <div className="mt-1 whitespace-pre-line">{feedback.teacher_response}</div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--vt-muted)]">
                        <span>Gửi: {formatDate(feedback.created_at)}</span>
                        <span>Cập nhật: {formatDate(feedback.updated_at)}</span>
                        {feedback.reviewed_at ? <span>Review: {formatDate(feedback.reviewed_at)}</span> : null}
                      </div>
                    </StudentInfoCard>
                  );
                })}
              </div>
            )}
          </StudentSection>
        </>
      ) : null}
    </StudentPageShell>
  );
}
