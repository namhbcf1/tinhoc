// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  PauseCircle,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { useToast } from '../../../components/ui/ToastContainer';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { formatDateVN } from '../../../utils/dateUtils';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import {
  MobileAdminBottomSheet,
  MobileAdminHeroCard,
  MobileAdminPrimaryButton,
  MobileAdminSearchField,
  MobileAdminSecondaryButton,
  MobileAdminSectionCard,
  MobileAdminStatCard,
  mobileAdminContentPadding,
} from '../shared/mobileAdminUi';

const STATUS_CONFIG = {
  active: { label: 'Đang diễn ra', tone: 'emerald' },
  paused: { label: 'Tạm dừng', tone: 'amber' },
  completed: { label: 'Đã kết thúc', tone: 'blue' },
  cancelled: { label: 'Đã hủy', tone: 'rose' },
};

const ENROLLMENT_STATUS = {
  pending: { label: 'Chờ duyệt', tone: 'amber' },
  approved: { label: 'Đã duyệt', tone: 'emerald' },
  active: { label: 'Đang học', tone: 'emerald' },
  cancelled: { label: 'Đã hủy', tone: 'rose' },
  rejected: { label: 'Đã từ chối', tone: 'rose' },
};

const FEEDBACK_STATUS = {
  submitted: { label: 'Chờ review', tone: 'blue' },
  approved: { label: 'Đã duyệt', tone: 'emerald' },
  rejected: { label: 'Cần chỉnh sửa', tone: 'amber' },
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function ToneBadge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function formatScheduleDays(scheduleRule) {
  if (!scheduleRule) return 'Chưa thiết lập';
  if (scheduleRule === 'DAILY') return 'Hàng ngày';
  const [, days] = scheduleRule.split(':');
  if (!days) return scheduleRule;
  return days.split(',').map((d) => DAY_LABELS[Number(d)] || d).join(', ');
}

function parseScheduleDays(scheduleRule) {
  if (!scheduleRule || scheduleRule === 'DAILY') return [1, 3, 5];
  const [, days] = scheduleRule.split(':');
  return days ? days.split(',').map(Number).filter((d) => !Number.isNaN(d)) : [];
}

function toDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.includes('T')) return value.slice(0, 10);
  return String(value).slice(0, 10);
}

const emptyForm = {
  class_name: '',
  description: '',
  schedule_time: '19:00-21:00',
  timezone: 'Asia/Ho_Chi_Minh',
  start_date: '',
  end_date: '',
  max_students: 50,
  scheduleDays: [1, 3, 5],
};

export default function MobileOnlineClassesModule() {
  const { success, error } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedClass, setSelectedClass] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [enrollments, setEnrollments] = useState([]);
  const [pendingList, setPendingList] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [processingId, setProcessingId] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewForm, setReviewForm] = useState({ sentiment: 'positive', teacher_response: '', review_note_internal: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const res = await api.getOnlineClasses(100, 0);
      const data = res?.data?.classes ?? res?.data ?? [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (loadError) {
      error(`Không thể tải lớp online: ${loadError.message}`);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);
  useAdminAutoRefresh(() => loadClasses(), { minIntervalMs: 15000 });

  useEffect(() => {
    if (!selectedClass) return;
    if (detailTab === 'enrollments') loadEnrollments();
    if (detailTab === 'pending') loadPending();
    if (detailTab === 'feedback') loadFeedbacks();
  }, [selectedClass?.id, detailTab]);

  const loadEnrollments = async () => {
    if (!selectedClass) return;
    setDetailLoading(true);
    try {
      const res = await api.getOnlineClassEnrollments(selectedClass.id);
      const data = res?.data?.data ?? res?.data ?? res;
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err) {
      error(`Không thể tải học viên: ${err.message}`);
      setEnrollments([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadPending = async () => {
    if (!selectedClass) return;
    setDetailLoading(true);
    try {
      const res = await api.getPendingEnrollments(selectedClass.id);
      const data = res?.data?.data ?? res?.data ?? res;
      setPendingList(Array.isArray(data) ? data : []);
    } catch (err) {
      error(`Không thể tải yêu cầu chờ duyệt: ${err.message}`);
      setPendingList([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadFeedbacks = async () => {
    if (!selectedClass) return;
    setDetailLoading(true);
    try {
      const res = await api.listClassStudentFeedbacks(selectedClass.id);
      const data = res?.data ?? res;
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (err) {
      error(`Không thể tải phản hồi: ${err.message}`);
      setFeedbacks([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (cls) => {
    setSelectedClass(cls);
    setDetailTab('overview');
    setEnrollments([]);
    setPendingList([]);
    setFeedbacks([]);
  };

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch = !searchTerm
        || String(cls.class_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || cls.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [classes, searchTerm, statusFilter]);

  const openCreate = () => {
    setEditingClass(null);
    setFormData({ ...emptyForm });
    setFormSheetOpen(true);
  };

  const openEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      class_name: cls.class_name || '',
      description: cls.description || '',
      schedule_time: cls.schedule_time || '19:00-21:00',
      timezone: cls.timezone || 'Asia/Ho_Chi_Minh',
      start_date: toDateInput(cls.start_date),
      end_date: toDateInput(cls.end_date),
      max_students: cls.max_students || 50,
      scheduleDays: parseScheduleDays(cls.schedule_rule),
    });
    setFormSheetOpen(true);
  };

  const toggleDay = (day) => {
    setFormData((current) => ({
      ...current,
      scheduleDays: current.scheduleDays.includes(day)
        ? current.scheduleDays.filter((d) => d !== day)
        : [...current.scheduleDays, day].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.class_name.trim() || !formData.start_date) {
      error('Tên lớp và ngày bắt đầu là bắt buộc');
      return;
    }

    const schedule_rule = formData.scheduleDays.length > 0
      ? `WEEKLY:${formData.scheduleDays.join(',')}`
      : 'DAILY';

    const payload = {
      class_name: formData.class_name.trim(),
      description: formData.description,
      schedule_rule,
      schedule_time: formData.schedule_time,
      timezone: formData.timezone,
      start_date: formData.start_date,
      end_date: formData.end_date || '',
      max_students: parseInt(formData.max_students, 10) || 50,
    };

    setSubmitting(true);
    try {
      if (editingClass) {
        await api.request(`/online-classes/${editingClass.id}`, {
          method: 'PUT',
          tokenType: 'admin',
          body: JSON.stringify(payload),
        });
        success('Đã cập nhật lớp online');
      } else {
        await api.request('/online-classes', {
          method: 'POST',
          tokenType: 'admin',
          body: JSON.stringify(payload),
        });
        success('Đã tạo lớp online');
      }
      setFormSheetOpen(false);
      await loadClasses();
    } catch (submitError) {
      error(`Không thể lưu lớp online: ${submitError.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cls) => {
    if (!window.confirm(`Xóa lớp online "${cls.class_name}"? Link Google Meet sẽ bị vô hiệu hóa.`)) return;
    try {
      await api.request(`/online-classes/${cls.id}`, {
        method: 'DELETE',
        tokenType: 'admin',
      });
      success('Đã xóa lớp online');
      await loadClasses();
    } catch (deleteError) {
      error(`Không thể xóa lớp online: ${deleteError.message}`);
    }
  };

  const regenerateMeetLink = async (classId) => {
    setProcessingId('meet');
    try {
      const res = await api.request(`/online-classes/${classId}/regenerate-meet`, {
        method: 'POST',
        tokenType: 'admin',
      });
      const newLink = res?.data?.meet_link || res?.data?.google_calendar?.meet_link;
      success('Đã tạo link Meet mới');
      await loadClasses();
      if (newLink && selectedClass?.id === classId) {
        setSelectedClass((current) => current ? { ...current, meet_link: newLink } : current);
      }
    } catch (err) {
      error(`Không tạo được link Meet: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const copyText = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    success('Đã copy link Meet');
  };

  const cancelEnrollment = async (enrollment) => {
    if (!selectedClass) return;
    if (!window.confirm(`Hủy đăng ký của "${enrollment.ho_ten_full || enrollment.full_name}" khỏi lớp?`)) return;
    const studentId = enrollment.student_id || enrollment.id;
    setProcessingId(`cancel-${studentId}`);
    try {
      await api.removeStudentFromOnlineClass(selectedClass.id, studentId);
      success('Đã xóa học viên khỏi lớp');
      await loadEnrollments();
    } catch (err) {
      error(`Không thể xóa học viên: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const approveEnrollment = async (enrollment) => {
    if (!selectedClass) return;
    setProcessingId(`approve-${enrollment.enrollment_id}`);
    try {
      await api.approveEnrollment(selectedClass.id, enrollment.enrollment_id);
      success(`Đã duyệt ${enrollment.ho_ten_full || 'học viên'}`);
      await loadPending();
      await loadClasses();
    } catch (err) {
      error(`Không thể duyệt: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectEnrollment = async (enrollment) => {
    if (!selectedClass) return;
    const reason = window.prompt(`Lý do từ chối ${enrollment.ho_ten_full || 'học viên'}?`);
    if (reason === null) return;
    setProcessingId(`reject-${enrollment.enrollment_id}`);
    try {
      await api.rejectEnrollment(selectedClass.id, enrollment.enrollment_id, reason || null);
      success(`Đã từ chối ${enrollment.ho_ten_full || 'học viên'}`);
      await loadPending();
      await loadClasses();
    } catch (err) {
      error(`Không thể từ chối: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openReview = (feedback) => {
    setReviewing(feedback);
    setReviewForm({
      sentiment: feedback.sentiment || 'positive',
      teacher_response: feedback.teacher_response || '',
      review_note_internal: feedback.review_note_internal || '',
    });
  };

  const submitReview = async (status) => {
    if (!reviewing) return;
    const { sentiment, teacher_response, review_note_internal } = reviewForm;
    if (status === 'approved' && (sentiment === 'mixed' || sentiment === 'negative') && !teacher_response.trim()) {
      error('Feedback trung tính / chưa tốt bắt buộc có phản hồi chính thức');
      return;
    }
    if (status === 'rejected' && !review_note_internal.trim()) {
      error('Vui lòng ghi lý do để học viên chỉnh sửa');
      return;
    }

    setReviewSubmitting(true);
    try {
      await api.reviewStudentFeedback(reviewing.id, {
        status,
        sentiment: status === 'approved' ? sentiment : undefined,
        teacher_response: status === 'approved' ? teacher_response.trim() : undefined,
        review_note_internal: status === 'rejected' ? review_note_internal.trim() : undefined,
      });
      success(status === 'approved' ? 'Đã duyệt công khai phản hồi' : 'Đã từ chối phản hồi');
      setReviewing(null);
      await loadFeedbacks();
    } catch (err) {
      error(`Không thể cập nhật phản hồi: ${err.message}`);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const current = selectedClass?.enrollment_count || 0;
  const maxStudents = selectedClass?.max_students || 0;
  const percent = maxStudents > 0 ? Math.round((current / maxStudents) * 100) : 0;

  return (
    <PullToRefreshWrapper onRefresh={loadClasses}>
      <div className="min-h-screen bg-slate-50">
        <MobileAdminHeroCard
          eyebrow="Lớp học online"
          icon={Video}
          tone="violet"
          title="Quản lý lớp online"
          description="Danh sách lớp trực tuyến, lịch học, link Meet, học viên và yêu cầu chờ duyệt."
          actions={(
            <>
              <MobileAdminSecondaryButton onClick={loadClasses}>
                <RefreshCw size={16} />
                Làm mới
              </MobileAdminSecondaryButton>
              <MobileAdminPrimaryButton onClick={openCreate}>
                <Plus size={16} />
                Tạo lớp
              </MobileAdminPrimaryButton>
            </>
          )}
          stats={(
            <div className="grid grid-cols-2 gap-2">
              <MobileAdminStatCard label="Tổng lớp" value={classes.length} tone="blue" />
              <MobileAdminStatCard label="Đang hoạt động" value={classes.filter((c) => c.status === 'active').length} tone="emerald" />
              <MobileAdminStatCard label="Học viên" value={classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)} tone="violet" />
              <MobileAdminStatCard label="Có Meet link" value={classes.filter((c) => c.meet_link).length} tone="rose" />
            </div>
          )}
          search={(
            <div className="flex gap-2">
              <MobileAdminSearchField
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm('')}
                placeholder="Tìm theo tên lớp..."
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 shrink-0 rounded-[16px] border border-[rgba(14,165,233,0.18)] bg-white px-2 text-[11px] font-bold text-[var(--admin-ink)]"
              >
                <option value="">Tất cả</option>
                <option value="active">Đang diễn ra</option>
                <option value="paused">Tạm dừng</option>
                <option value="completed">Kết thúc</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          )}
        />

        <div className="p-3 pt-3" style={{ paddingBottom: mobileAdminContentPadding(20) }}>
          {loading ? (
            <AdminLoadingState
              title="Đang tải lớp online"
              hint="Các lớp trực tuyến đang được đồng bộ từ hệ thống."
              variant="mobile-list"
              accent="blue"
            />
          ) : filteredClasses.length > 0 ? (
            <div className="space-y-2">
              {filteredClasses.map((cls) => {
                const status = STATUS_CONFIG[cls.status] || STATUS_CONFIG.active;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => openDetail(cls)}
                    className="w-full rounded-[22px] border border-slate-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                        <Video size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-black text-slate-900">{cls.class_name || 'Lớp online'}</p>
                          {cls.pending_count > 0 ? (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                              {cls.pending_count}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                          <ToneBadge tone="slate">{formatScheduleDays(cls.schedule_rule)}</ToneBadge>
                          <ToneBadge tone="blue">
                            <Users size={11} /> {cls.enrollment_count || 0}/{cls.max_students || '∞'}
                          </ToneBadge>
                        </div>
                        {cls.meet_link ? (
                          <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold text-violet-600">
                            <Video size={11} /> {cls.meet_link}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEdit(cls); }}
                        className="flex items-center justify-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 active:bg-blue-100"
                      >
                        <Edit2 size={12} /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(cls); }}
                        className="flex items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 active:bg-rose-100"
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-60">
              <Video size={64} className="mb-2.5 text-slate-300" />
              <p className="font-medium text-slate-500">Không tìm thấy lớp online nào</p>
            </div>
          )}
        </div>

        <MobileAdminBottomSheet
          isOpen={Boolean(selectedClass)}
          onClose={() => setSelectedClass(null)}
          title={selectedClass?.class_name || 'Chi tiết lớp online'}
          height="92dvh"
        >
          {selectedClass ? (
            <div className="space-y-2 pb-2">
              <div className="rounded-[18px] bg-gradient-to-r from-violet-600 to-purple-600 p-3 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-80">Sĩ số lớp</span>
                  <span className="text-base font-bold">{current} / {maxStudents > 0 ? maxStudents : '∞'}</span>
                </div>
                {maxStudents > 0 ? (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/30">
                    <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {selectedClass.start_date ? formatDateVN(selectedClass.start_date) : 'Chưa có ngày'}
                    {selectedClass.end_date ? ` - ${formatDateVN(selectedClass.end_date)}` : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {selectedClass.schedule_time || '--:--'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto rounded-[16px] border border-slate-200 bg-white p-1.5">
                {[
                  { id: 'overview', label: 'Thông tin', icon: BookOpen },
                  { id: 'enrollments', label: 'Học viên', icon: Users, count: enrollments.length },
                  { id: 'pending', label: 'Chờ duyệt', icon: UserCheck, count: pendingList.length },
                  { id: 'feedback', label: 'Phản hồi', icon: MessageSquareQuote, count: feedbacks.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${detailTab === tab.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {tab.count > 0 ? <span className={`rounded-full px-1.5 text-[10px] ${detailTab === tab.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span> : null}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="space-y-2 py-8">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : null}

              {detailTab === 'overview' && !detailLoading ? (
                <MobileAdminSectionCard title="Thông tin chung">
                  <div className="space-y-2.5">
                    <Row label="Mô tả" value={selectedClass.description || 'Chưa có mô tả'} />
                    <Row label="Lịch học" value={`${formatScheduleDays(selectedClass.schedule_rule)} • ${selectedClass.schedule_time || '--:--'}`} />
                    <Row label="Múi giờ" value={selectedClass.timezone || 'Asia/Ho_Chi_Minh'} />
                    <Row label="Trạng thái" value={STATUS_CONFIG[selectedClass.status]?.label || selectedClass.status} />
                  </div>
                </MobileAdminSectionCard>
              ) : null}

              {detailTab === 'overview' && !detailLoading ? (
                <MobileAdminSectionCard
                  title="Google Meet"
                  actions={selectedClass.meet_link ? (
                    <div className="flex gap-1.5">
                      <MobileAdminSecondaryButton onClick={() => copyText(selectedClass.meet_link)}>
                        <Copy size={13} /> Copy
                      </MobileAdminSecondaryButton>
                      <MobileAdminSecondaryButton onClick={() => window.open(selectedClass.meet_link, '_blank')}>
                        <ExternalLink size={13} /> Mở
                      </MobileAdminSecondaryButton>
                    </div>
                  ) : null}
                >
                  {selectedClass.meet_link ? (
                    <p className="break-all rounded-xl bg-slate-50 p-2.5 text-xs font-semibold text-slate-600">{selectedClass.meet_link}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Lớp này chưa có link Meet. Hãy tạo ngay để học viên tham gia.</p>
                      <MobileAdminPrimaryButton
                        onClick={() => regenerateMeetLink(selectedClass.id)}
                        disabled={processingId === 'meet'}
                        className="w-full"
                      >
                        {processingId === 'meet' ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                        Tạo link Meet
                      </MobileAdminPrimaryButton>
                    </div>
                  )}
                </MobileAdminSectionCard>
              ) : null}

              {detailTab === 'enrollments' && !detailLoading ? (
                <MobileAdminSectionCard title="Học viên đã ghi danh" description={`${enrollments.length} học viên`}>
                  {enrollments.length === 0 ? (
                    <EmptyNote text="Chưa có học viên nào trong lớp" />
                  ) : (
                    <div className="space-y-2.5">
                      {enrollments.map((enrollment) => (
                        <div key={enrollment.enrollment_id || enrollment.id} className="rounded-2xl border border-slate-200 bg-white p-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{enrollment.ho_ten_full || enrollment.full_name || 'Học viên'}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{enrollment.sdt || enrollment.email || enrollment.cccd || '—'}</p>
                              {enrollment.enrolled_at ? <p className="mt-0.5 text-[11px] text-slate-400">Đăng ký: {formatDateVN(enrollment.enrolled_at, true)}</p> : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <ToneBadge tone={ENROLLMENT_STATUS[enrollment.enrollment_status]?.tone || 'slate'}>
                                {ENROLLMENT_STATUS[enrollment.enrollment_status]?.label || enrollment.enrollment_status || 'Đang học'}
                              </ToneBadge>
                              <button
                                type="button"
                                onClick={() => cancelEnrollment(enrollment)}
                                disabled={processingId === `cancel-${enrollment.student_id || enrollment.id}`}
                                className="rounded-xl border border-rose-100 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 disabled:opacity-50"
                              >
                                {processingId === `cancel-${enrollment.student_id || enrollment.id}` ? 'Đang xử lý...' : 'Hủy đăng ký'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </MobileAdminSectionCard>
              ) : null}

              {detailTab === 'pending' && !detailLoading ? (
                <MobileAdminSectionCard title="Yêu cầu chờ duyệt" description={`${pendingList.length} học viên đang chờ`}>
                  {pendingList.length === 0 ? (
                    <EmptyNote text="Tất cả yêu cầu đã được xử lý" />
                  ) : (
                    <div className="space-y-2.5">
                      {pendingList.map((enrollment) => (
                        <div key={enrollment.enrollment_id} className="rounded-2xl border border-slate-200 bg-white p-2.5">
                          <p className="text-sm font-bold text-slate-900">{enrollment.ho_ten_full || 'Học viên'}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{enrollment.sdt || enrollment.email || enrollment.cccd || '—'}</p>
                          {enrollment.enrolled_at ? <p className="mt-0.5 text-[11px] text-slate-400">Đăng ký lúc: {formatDateVN(enrollment.enrolled_at, true)}</p> : null}
                          {enrollment.rejection_reason ? <p className="mt-1 text-[11px] text-amber-600">Lý do: {enrollment.rejection_reason}</p> : null}
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => approveEnrollment(enrollment)}
                              disabled={processingId === `approve-${enrollment.enrollment_id}`}
                              className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {processingId === `approve-${enrollment.enrollment_id}` ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectEnrollment(enrollment)}
                              disabled={processingId === `reject-${enrollment.enrollment_id}`}
                              className="flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50"
                            >
                              {processingId === `reject-${enrollment.enrollment_id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                              Từ chối
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </MobileAdminSectionCard>
              ) : null}

              {detailTab === 'feedback' && !detailLoading ? (
                <MobileAdminSectionCard title="Phản hồi học viên" description="Review và duyệt công khai feedback thật của học viên.">
                  {feedbacks.length === 0 ? (
                    <EmptyNote text="Chưa có phản hồi nào từ học viên" />
                  ) : (
                    <div className="space-y-2.5">
                      {feedbacks.map((feedback) => (
                        <button
                          key={feedback.id}
                          type="button"
                          onClick={() => openReview(feedback)}
                          className="w-full rounded-2xl border border-slate-200 bg-white p-2.5 text-left transition active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">{feedback.student_name || 'Học viên'}</p>
                              <div className="mt-1 flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} size={12} className={i < Number(feedback.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                                ))}
                              </div>
                              <p className="mt-1 truncate text-xs font-semibold text-slate-700">{feedback.title}</p>
                            </div>
                            <ToneBadge tone={FEEDBACK_STATUS[feedback.status]?.tone || 'slate'}>
                              {FEEDBACK_STATUS[feedback.status]?.label || feedback.status}
                            </ToneBadge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </MobileAdminSectionCard>
              ) : null}
            </div>
          ) : null}
        </MobileAdminBottomSheet>

        <MobileAdminBottomSheet
          isOpen={formSheetOpen}
          onClose={() => setFormSheetOpen(false)}
          title={editingClass ? 'Cập nhật lớp online' : 'Tạo lớp online mới'}
          height="92dvh"
        >
          <div className="space-y-2 pb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Tên lớp học *</label>
              <input
                type="text"
                value={formData.class_name}
                onChange={(e) => setFormData((c) => ({ ...c, class_name: e.target.value }))}
                placeholder="VD: Lớp Tin học văn phòng K24"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((c) => ({ ...c, description: e.target.value }))}
                placeholder="Mô tả nội dung khóa học..."
                className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[16px] text-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Lịch trong tuần</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`h-10 w-10 rounded-xl text-sm font-bold transition ${formData.scheduleDays.includes(day) ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Giờ học (HH:MM-HH:MM)</label>
                <input
                  type="text"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData((c) => ({ ...c, schedule_time: e.target.value }))}
                  placeholder="19:00-21:00"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Sĩ số tối đa</label>
                <input
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData((c) => ({ ...c, max_students: e.target.value }))}
                  min="1"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Ngày bắt đầu *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((c) => ({ ...c, start_date: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Ngày kết thúc</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((c) => ({ ...c, end_date: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
                />
              </div>
            </div>
            <MobileAdminPrimaryButton onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {editingClass ? 'Lưu thay đổi' : 'Tạo lớp online'}
            </MobileAdminPrimaryButton>
          </div>
        </MobileAdminBottomSheet>

        <MobileAdminBottomSheet
          isOpen={Boolean(reviewing)}
          onClose={() => setReviewing(null)}
          title="Review phản hồi học viên"
          height="auto"
        >
          {reviewing ? (
            <div className="space-y-2 pb-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-900">{reviewing.student_name || 'Học viên'}</p>
                  <span className="text-[11px] text-slate-400">{reviewing.class_name}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < Number(reviewing.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
                  ))}
                  <span className="text-xs font-bold text-slate-500">{reviewing.rating}/5</span>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">{reviewing.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{reviewing.content}</p>
              </div>
              {reviewing.teacher_response ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-2.5">
                  <p className="text-xs font-bold text-blue-700">Phản hồi đang công khai</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{reviewing.teacher_response}</p>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Phân loại công khai</label>
                <select
                  value={reviewForm.sentiment}
                  onChange={(e) => setReviewForm((c) => ({ ...c, sentiment: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[16px] text-slate-900"
                >
                  <option value="positive">Tốt</option>
                  <option value="mixed">Trung tính</option>
                  <option value="negative">Cần cải thiện</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Phản hồi chính thức</label>
                <textarea
                  value={reviewForm.teacher_response}
                  onChange={(e) => setReviewForm((c) => ({ ...c, teacher_response: e.target.value }))}
                  placeholder="Bắt buộc khi phân loại là trung tính hoặc cần cải thiện."
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[16px] text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Ghi chú nội bộ khi từ chối</label>
                <textarea
                  value={reviewForm.review_note_internal}
                  onChange={(e) => setReviewForm((c) => ({ ...c, review_note_internal: e.target.value }))}
                  placeholder="Mô tả nội dung học viên cần chỉnh sửa."
                  className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[16px] text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => submitReview('rejected')}
                  disabled={reviewSubmitting}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 disabled:opacity-50"
                >
                  <XCircle size={15} /> Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => submitReview('approved')}
                  disabled={reviewSubmitting}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {reviewSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Duyệt công khai
                </button>
              </div>
            </div>
          ) : null}
        </MobileAdminBottomSheet>
      </div>
    </PullToRefreshWrapper>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-right text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function EmptyNote({ text }) {
  return (
    <div className="rounded-2xl bg-slate-50 py-8 text-center text-xs font-medium text-slate-400">{text}</div>
  );
}