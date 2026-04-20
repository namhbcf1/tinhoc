import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, MessageSquareQuote, RefreshCw, ShieldAlert, Star } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/Dialog';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import api from '../../../services/api';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Chờ review',
  approved: 'Đã duyệt',
  rejected: 'Cần chỉnh sửa',
};

const STATUS_CLASSES: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-amber-50 text-amber-700 border-amber-200',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Tốt',
  mixed: 'Trung tính',
  negative: 'Cần cải thiện',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN');
  } catch {
    return value;
  }
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`${rating}-${index}`}
          size={14}
          className={index < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  );
}

export default function StudentFeedbackManagement({ classId }: { classId: number }) {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [sentiment, setSentiment] = useState('positive');
  const [teacherResponse, setTeacherResponse] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const counts = useMemo(() => ({
    submitted: feedbacks.filter((item) => item.status === 'submitted').length,
    approved: feedbacks.filter((item) => item.status === 'approved').length,
    rejected: feedbacks.filter((item) => item.status === 'rejected').length,
  }), [feedbacks]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await (api as any).listClassStudentFeedbacks(classId);
      setFeedbacks(Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []);
    } catch {
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [classId]);

  const openReview = (feedback: any) => {
    setActiveItem(feedback);
    setSentiment(feedback.sentiment || 'positive');
    setTeacherResponse(feedback.teacher_response || '');
    setReviewNote(feedback.review_note_internal || '');
    setMessage(null);
  };

  const closeReview = () => {
    setActiveItem(null);
    setTeacherResponse('');
    setReviewNote('');
    setSentiment('positive');
    setMessage(null);
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!activeItem) return;
    setMessage(null);

    if (status === 'approved' && (sentiment === 'mixed' || sentiment === 'negative') && !teacherResponse.trim()) {
      setMessage({ type: 'error', text: 'Feedback trung tính hoặc chưa tốt bắt buộc có phản hồi chính thức.' });
      return;
    }
    if (status === 'rejected' && !reviewNote.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng ghi lý do để học viên chỉnh sửa lại phản hồi.' });
      return;
    }

    setSubmitting(true);
    try {
      await (api as any).reviewStudentFeedback(activeItem.id, {
        status,
        sentiment: status === 'approved' ? sentiment : undefined,
        teacher_response: status === 'approved' ? teacherResponse.trim() : undefined,
        review_note_internal: status === 'rejected' ? reviewNote.trim() : undefined,
      });
      await load();
      closeReview();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Không thể cập nhật trạng thái phản hồi.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          Tổng phản hồi: {feedbacks.length}
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
          Chờ review: {counts.submitted}
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          Đã duyệt: {counts.approved}
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
          Cần sửa: {counts.rejected}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => void load()}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => <div key={item} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : !feedbacks.length ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <MessageSquareQuote size={28} className="text-slate-300" />
            <div>
              <div className="font-bold text-slate-700">Chưa có phản hồi nào từ học viên</div>
              <div className="mt-1 text-sm text-slate-400">Tab này hiển thị các feedback thật do học viên đã đăng nhập gửi lên.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Học viên</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Đánh giá</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Phân loại</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">Cập nhật</th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{item.student_name}</div>
                    <div className="text-xs text-slate-400">{item.student_cccd || '—'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <RatingStars rating={Number(item.rating || 0)} />
                      <div className="max-w-[240px] truncate font-semibold text-slate-700">{item.title}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${STATUS_CLASSES[item.status] || STATUS_CLASSES.submitted}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-xs font-semibold text-slate-500">
                    {item.sentiment ? SENTIMENT_LABELS[item.sentiment] : '—'}
                  </td>
                  <td className="px-4 py-4 text-center text-xs text-slate-400">{formatDate(item.updated_at)}</td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openReview(item)}>
                      <Eye size={14} className="mr-2" />
                      Xem
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(activeItem)} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="bg-slate-900 text-white">
            <DialogTitle className="text-white">Review feedback học viên</DialogTitle>
          </DialogHeader>

          {activeItem ? (
            <div className="space-y-5 p-6">
              {message ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {message.text}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{activeItem.student_name}</span>
                      <span className="text-xs text-slate-400">{activeItem.class_name}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <RatingStars rating={Number(activeItem.rating || 0)} />
                      <span className="text-xs font-bold text-slate-500">{activeItem.rating}/5</span>
                    </div>
                    <div className="mt-3 text-base font-bold text-slate-900">{activeItem.title}</div>
                    <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{activeItem.content}</div>
                  </div>

                  {activeItem.teacher_response ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="text-sm font-bold text-blue-700">Phản hồi đang công khai</div>
                      <div className="mt-1 whitespace-pre-line text-sm text-slate-700">{activeItem.teacher_response}</div>
                    </div>
                  ) : null}

                  {activeItem.review_note_internal ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-sm font-bold text-amber-700">Ghi chú chỉnh sửa gần nhất</div>
                      <div className="mt-1 whitespace-pre-line text-sm text-slate-700">{activeItem.review_note_internal}</div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Phân loại công khai</div>
                    <Select className="mt-2" value={sentiment} onChange={(event) => setSentiment(event.target.value)}>
                      <option value="positive">Tốt</option>
                      <option value="mixed">Trung tính</option>
                      <option value="negative">Cần cải thiện</option>
                    </Select>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Phản hồi chính thức</div>
                    <Textarea
                      rows={6}
                      className="mt-2"
                      value={teacherResponse}
                      onChange={(event) => setTeacherResponse(event.target.value)}
                      placeholder="Bắt buộc khi phân loại là trung tính hoặc cần cải thiện."
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú nội bộ khi từ chối</div>
                    <Textarea
                      rows={5}
                      className="mt-2"
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Mô tả rõ nội dung học viên cần chỉnh sửa trước khi gửi lại."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeReview}>Đóng</Button>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              disabled={submitting}
              onClick={() => void handleReview('rejected')}
            >
              <ShieldAlert size={14} className="mr-2" />
              Từ chối
            </Button>
            <Button disabled={submitting} onClick={() => void handleReview('approved')}>
              <CheckCircle2 size={14} className="mr-2" />
              Duyệt công khai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
