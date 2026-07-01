// @ts-nocheck
import { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarClock,
  ExternalLink,
  MapPin,
  Video,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { useStudentExams } from '../student-hooks';
import {
  StudentCardSkeleton,
  StudentEmptyState,
  StudentFilterBar,
  StudentInfoCard,
  StudentModal,
  StudentPageShell,
  StudentPill,
  StudentRefreshButton,
  StudentSection,
} from '../student-shared';
import { openStudyPlatform } from '../student-nav';
import { formatShortDate, formatShortTime, getRelativeExamLabel } from '../student-utils';

function getStatusTone(status: string) {
  switch (status) {
    case 'pending':       return 'amber';
    case 'approved':
    case 'registered':   return 'emerald';
    case 'completed':    return 'blue';
    case 'cancelled':    return 'red';
    default:             return 'slate';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':      return 'Chờ duyệt';
    case 'approved':
    case 'registered':  return 'Đã duyệt';
    case 'completed':   return 'Hoàn thành';
    case 'cancelled':   return 'Đã hủy';
    default:            return 'Mở đăng ký';
  }
}

function formatExamTimeSummary(examDate: string, durationMinutes: number | null) {
  const time = formatShortTime(examDate);
  if (durationMinutes == null) return `${time} · Chưa có thời lượng`;
  return `${time} · ${durationMinutes} phút`;
}

const ACTIVE_REGISTRATION_CONFLICT_MESSAGE =
  'Bạn đã có đăng ký cùng nhóm đang hoạt động. Mỗi học viên chỉ được giữ tối đa 1 lịch tiếng Anh (VSTEP/VEPT) và 1 lịch tin học (PTIT...).';

function getSafeHttpUrl(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return null;
  try {
    const parsed = new URL(normalized);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function getZoomUrl(exam: any): string | null {
  // Ưu tiên link Zoom đã lưu
  if (exam.zoomLink) return exam.zoomLink;
  // Nếu có zoom_meeting_id trong raw, tạo link từ meeting ID + passcode
  const raw = exam.raw || {};
  const mid = raw.zoom_meeting_id || raw.zoom_meeting_id_backup;
  if (mid) {
    const pwd = raw.zoom_passcode || raw.zoom_passcode_backup;
    const cleanMid = String(mid).replace(/\s/g, '');
    return pwd
      ? `https://zoom.us/j/${cleanMid}?pwd=${encodeURIComponent(String(pwd))}`
      : `https://zoom.us/j/${cleanMid}`;
  }
  return null;
}

function hasZoomData(exam: any): boolean {
  if (exam.zoomLink || exam.zoomLinkBackup) return true;
  const raw = exam.raw || {};
  return Boolean(raw.zoom_meeting_id || raw.zoom_meeting_id_backup);
}

function resolveRegisterErrorMessage(err: any) {
  const code    = err?.code || '';
  const message = String(err?.message || '').trim();
  if (code === 'STUDENT_ALREADY_HAS_EXAM_AT_SAME_TIME') {
    return message || 'Bạn đã có một kỳ thi khác trùng thời gian.';
  }
  if (code === 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION' || err?.status === 400) {
    return message || ACTIVE_REGISTRATION_CONFLICT_MESSAGE;
  }
  return message || 'Không thể đăng ký lịch thi';
}

// ─── Exam Card ────────────────────────────────────────────────────────────────

function ExamCard({
  exam,
  compact,
  loading,
  onOpen,
  onRegister,
  onCancel,
}: {
  exam: any;
  compact: boolean;
  loading: boolean;
  onOpen: () => void;
  onRegister: () => void;
  onCancel: () => void;
}) {
  const examDate       = new Date(exam.examDate);
  const isRegistered   = ['pending', 'approved', 'registered'].includes(exam.status);
  const isApproved     = ['approved', 'registered'].includes(exam.status);
  const isPast         = examDate.getTime() < new Date().setHours(0, 0, 0, 0);
  const hasConflict    = Boolean(!isRegistered && !isPast && exam.hasTimeConflict);
  const mapUrl         = getSafeHttpUrl(exam.googleMapUrl);
  const statusTone     = getStatusTone(exam.status);

  const accentColor: Record<string, string> = {
    amber:   'before:bg-[var(--vt-champagne)]',
    emerald: 'before:bg-[var(--vt-emerald)]',
    blue:    'before:bg-[var(--vt-emerald)]',
    red:     'before:bg-red-400',
    slate:   'before:bg-[var(--vt-line)]',
  };

  return (
    <div className={[
      'relative flex min-h-full flex-col overflow-hidden rounded-[1.65rem] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.86)] shadow-[var(--vt-shadow-card)]',
      'transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--vt-champagne-soft)] hover:bg-white/92 hover:shadow-[var(--vt-shadow-soft)]',
      'before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[4px] before:rounded-r-full',
      accentColor[statusTone] ?? accentColor.slate,
    ].join(' ')}>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StudentPill tone={statusTone}>{getStatusLabel(exam.status)}</StudentPill>
            <StudentPill tone={exam.mode === 'online' ? 'blue' : 'slate'}>
              {exam.mode === 'online' ? 'Online' : 'Offline'}
            </StudentPill>
          </div>
          <h3 className="truncate text-[15px] font-black leading-snug tracking-[-0.02em] text-[var(--vt-ink)] sm:text-base">
            {exam.title}
          </h3>
          {exam.subtitle ? (
            <p className="mt-1 truncate text-xs font-semibold text-[var(--vt-muted)]">{exam.subtitle}</p>
          ) : null}
        </div>
        <div className="min-w-[76px] shrink-0 rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-paper)] px-3 py-2 text-right shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--vt-champagne)]">Lịch thi</p>
          <p className="mt-0.5 text-xs font-black leading-tight text-[var(--vt-ink)]">{formatShortDate(exam.examDate)}</p>
        </div>
      </div>

      <div className={[
        'px-4 pb-4 sm:px-5',
        compact ? 'space-y-2' : 'grid grid-cols-1 gap-2 sm:grid-cols-2',
      ].join(' ')}>
        <div className="rounded-2xl border border-[var(--vt-line)] bg-white/65 px-3 py-3 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--vt-muted)]">Thời gian</p>
          <p className="mt-1 text-[13px] font-black leading-tight text-[var(--vt-ink)]">
            {formatExamTimeSummary(exam.examDate, exam.durationMinutes)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[var(--vt-muted)]">{getRelativeExamLabel(exam.examDate)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--vt-line)] bg-white/65 px-3 py-3 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--vt-muted)]">Địa điểm</p>
          <p className="mt-1 truncate text-[13px] font-black leading-tight text-[var(--vt-ink)]">{exam.location}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-[var(--vt-muted)]">{exam.examType || 'Thi tại trung tâm'}</p>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-black text-[var(--vt-emerald)] hover:text-[var(--vt-ink)]"
            >
              <MapPin size={11} />
              Google Maps
            </a>
          ) : null}
        </div>
      </div>

      {hasConflict ? (
        <div className="mx-4 mb-4 rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] px-3 py-2 text-[12px] font-semibold text-[var(--vt-ink)] sm:mx-5">
          {exam.conflictMessage || ACTIVE_REGISTRATION_CONFLICT_MESSAGE}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--vt-line)] bg-white/45 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--vt-line)] bg-white/80 px-3 py-1.5 text-xs font-black text-[var(--vt-muted)] shadow-sm transition-all hover:border-[var(--vt-champagne)] hover:text-[var(--vt-ink)]"
        >
          Xem chi tiết
        </button>

        {!isPast ? (
          isRegistered ? (
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Hủy đăng ký'}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || hasConflict}
              onClick={onRegister}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--vt-emerald)] bg-[var(--vt-emerald)] px-3 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[var(--vt-ink)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : hasConflict ? 'Đã có lớp khác' : 'Đăng ký'}
            </button>
          )
        ) : null}

        {isApproved ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {hasZoomData(exam) ? (
              <a
                href={getZoomUrl(exam)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm transition-all hover:bg-blue-100"
              >
                <Video size={11} />
                Mở Zoom
              </a>
            ) : null}
            <button
              type="button"
              onClick={openStudyPlatform}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--vt-ink)] bg-[var(--vt-ink)] px-3 py-1.5 text-xs font-black text-white shadow-sm transition-all hover:bg-[var(--vt-ink-soft)]"
            >
              <ExternalLink size={11} />
              Học tập
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Registered Row (compact list) ───────────────────────────────────────────

function RegisteredRow({ exam }: { exam: any }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--vt-line)] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-[var(--vt-ink)]">{exam.title}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--vt-muted)]">{formatShortDate(exam.examDate)} · {exam.location}</p>
      </div>
      <StudentPill tone={getStatusTone(exam.status)}>{getStatusLabel(exam.status)}</StudentPill>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StudentExamsView({
  studentData,
  compact = false,
}: {
  studentData: any;
  compact?: boolean;
}) {
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const { toasts, removeToast, success, error: showError } = useToast();
  const {
    sections,
    filters,
    activeFilter,
    setActiveFilter,
    loading,
    error,
    actionLoading,
    refetch,
    registerExam,
    cancelExam,
  } = useStudentExams(studentData);

  const stats = useMemo(() => [
    { label: 'Sắp thi',      value: sections.upcoming.length },
    { label: 'Đã đăng ký',   value: sections.registered.length },
  ], [sections]);

  const handleRegister = async (examId: number | string) => {
    const targetExam = [...sections.upcoming, ...sections.registered, ...sections.past].find(
      (e) => String(e.id) === String(examId)
    );
    if (targetExam?.hasTimeConflict) {
      showError(targetExam.conflictMessage || ACTIVE_REGISTRATION_CONFLICT_MESSAGE);
      return;
    }
    try {
      await registerExam(examId);
      success('Đăng ký thi thành công. Vui lòng chờ xác nhận.');
      setSelectedExam(null);
    } catch (err: any) {
      showError(resolveRegisterErrorMessage(err), 5000);
    }
  };

  const handleCancel = async (examId: number | string) => {
    try {
      await cancelExam(examId);
      success('Đã hủy đăng ký kỳ thi.');
      setSelectedExam(null);
    } catch (err: any) {
      showError(err?.message || 'Không thể hủy đăng ký');
    }
  };

  return (
    <>
      <StudentPageShell
        compact={compact}
        icon={<CalendarClock size={compact ? 18 : 20} />}
        title="Lịch thi"
        subtitle="Theo dõi kỳ thi sắp đến, trạng thái đăng ký và mở Học tập khi được duyệt."
        stats={stats}
        action={
          <StudentRefreshButton onClick={refetch} loading={loading} />
        }
      >
        {/* Filter */}
        <StudentSection title="Bộ lọc">
          <StudentFilterBar filters={filters} activeFilter={activeFilter} onChange={setActiveFilter} />
        </StudentSection>

        {/* Upcoming exams */}
        <StudentSection
          title="Sắp thi"
          description="Các kỳ thi cần ưu tiên trong giai đoạn hiện tại"
        >
          {loading ? (
            <StudentCardSkeleton count={3} />
          ) : sections.upcoming.length ? (
            <div className={compact ? 'space-y-3' : 'grid gap-3 lg:grid-cols-2'}>
              {sections.upcoming.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  compact={compact}
                  loading={actionLoading === exam.id}
                  onOpen={() => setSelectedExam(exam)}
                  onRegister={() => handleRegister(exam.id)}
                  onCancel={() => handleCancel(exam.id)}
                />
              ))}
            </div>
          ) : (
            <StudentEmptyState
              title="Chưa có kỳ thi sắp tới"
              description={error || 'Chưa có lịch thi mới trong bộ lọc hiện tại.'}
              action={(
                <button
                  type="button"
                  onClick={refetch}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vt-line)] bg-white/85 px-4 py-2 text-xs font-black text-[var(--vt-muted)] shadow-sm transition-all hover:border-[var(--vt-champagne)] hover:text-[var(--vt-ink)]"
                >
                  Kiểm tra lại
                </button>
              )}
            />
          )}
        </StudentSection>

        {/* Registered list */}
        <StudentSection
          title="Chờ xác nhận / đã đăng ký"
          description="Theo dõi trạng thái duyệt"
        >
          {sections.registered.length ? (
            <StudentInfoCard className="overflow-hidden p-0">
              <div className="px-4 sm:px-5">
                {sections.registered.map((exam) => (
                  <RegisteredRow key={exam.id} exam={exam} />
                ))}
              </div>
            </StudentInfoCard>
          ) : (
            <StudentEmptyState
              title="Chưa có đăng ký thi"
              description="Khi bạn đăng ký hoặc chờ duyệt, danh sách sẽ hiện ở đây."
            />
          )}
        </StudentSection>
      </StudentPageShell>

      {/* Detail Modal */}
      <StudentModal
        open={!!selectedExam}
        title={selectedExam?.title || 'Chi tiết lịch thi'}
        onClose={() => setSelectedExam(null)}
        compact={compact}
        footer={selectedExam ? (
          <div className="flex flex-wrap gap-2">
            {!['completed', 'cancelled'].includes(selectedExam.status) ? (
              ['pending', 'approved', 'registered'].includes(selectedExam.status) ? (
                <button
                  type="button"
                  disabled={actionLoading === selectedExam.id}
                  onClick={() => handleCancel(selectedExam.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                >
                  {actionLoading === selectedExam.id ? 'Đang xử lý...' : 'Hủy đăng ký'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading === selectedExam.id || Boolean(selectedExam.hasTimeConflict)}
                  onClick={() => handleRegister(selectedExam.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vt-emerald)] bg-[var(--vt-emerald)] px-4 py-2 text-sm font-black text-white shadow-sm transition-all hover:bg-[var(--vt-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === selectedExam.id
                    ? 'Đang xử lý...'
                    : selectedExam.hasTimeConflict
                      ? 'Đã có lớp khác'
                      : 'Đăng ký thi'}
                </button>
              )
            ) : null}
            {['approved', 'registered'].includes(selectedExam.status) ? (
              <button
                type="button"
                onClick={openStudyPlatform}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--vt-ink)] bg-[var(--vt-ink)] px-4 py-2 text-sm font-black text-white shadow-sm transition-all hover:bg-[var(--vt-ink-soft)]"
              >
                <ExternalLink size={13} />
                Mở Học tập
              </button>
            ) : null}
          </div>
        ) : null}
      >
        {selectedExam ? (
          <div className="space-y-3">
            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5">
              <StudentPill tone={getStatusTone(selectedExam.status)}>{getStatusLabel(selectedExam.status)}</StudentPill>
              <StudentPill tone={selectedExam.mode === 'online' ? 'blue' : 'slate'}>
                {selectedExam.mode === 'online' ? 'Online' : 'Offline'}
              </StudentPill>
            </div>

            {/* Date + time */}
            <StudentInfoCard>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Ngày thi</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-900">{formatShortDate(selectedExam.examDate)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Thời gian</p>
                  <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                    {formatExamTimeSummary(selectedExam.examDate, selectedExam.durationMinutes)}
                  </p>
                </div>
              </div>
            </StudentInfoCard>

            {/* Conflict warning */}
            {selectedExam.hasTimeConflict && !['pending', 'approved', 'registered', 'completed', 'cancelled'].includes(selectedExam.status) ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-extrabold mb-1">Không thể đăng ký lúc này</p>
                <p className="text-xs">{selectedExam.conflictMessage || ACTIVE_REGISTRATION_CONFLICT_MESSAGE}</p>
                {selectedExam.conflictingExamDate ? (
                  <p className="text-xs text-amber-700 mt-1">
                    Đăng ký đang giữ: {formatShortDate(selectedExam.conflictingExamDate)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Location */}
            <StudentInfoCard>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Địa điểm / hình thức</p>
                  <p className="text-sm font-extrabold text-slate-900">{selectedExam.location}</p>
                  {(() => {
                    const mUrl = getSafeHttpUrl(selectedExam.googleMapUrl);
                    if (!mUrl) return null;
                    return (
                      <a
                        href={mUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-all"
                      >
                        <MapPin size={12} />
                        Mở Google Maps
                      </a>
                    );
                  })()}
                </div>
              </div>
            </StudentInfoCard>

            {/* Linked class */}
            {selectedExam.className ? (
              <StudentInfoCard>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <BookOpenCheck size={15} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lớp liên quan</p>
                    <p className="text-sm font-extrabold text-slate-900">{selectedExam.className}</p>
                  </div>
                </div>
              </StudentInfoCard>
            ) : null}

            {/* Note */}
            {selectedExam.note ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="text-xs font-extrabold mb-1">Ghi chú</p>
                <p className="text-sm leading-relaxed">{selectedExam.note}</p>
              </div>
            ) : null}

            {/* Zoom links */}
            {selectedExam.zoomLink && ['approved', 'registered'].includes(selectedExam.status) ? (
              <div className="space-y-2">
                <a
                  href={selectedExam.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-all"
                >
                  <Video size={16} />
                  Mở phòng thi online
                </a>
                {selectedExam.zoomLinkBackup ? (
                  <a
                    href={selectedExam.zoomLinkBackup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700 hover:bg-orange-100 transition-all"
                  >
                    <Video size={16} />
                    Phòng thi dự phòng
                  </a>
                ) : null}
              </div>
            ) : null}

            {/* Study platform CTA */}
            {['approved', 'registered'].includes(selectedExam.status) ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <p className="text-xs font-extrabold mb-1">Luyện tập trước kỳ thi</p>
                <p className="text-xs leading-relaxed text-emerald-700 mb-2">
                  Kỳ thi đã được duyệt. Mở Học tập để ôn luyện trên hệ thống riêng.
                </p>
                <button
                  type="button"
                  onClick={openStudyPlatform}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm"
                >
                  Mở Học tập
                  <ExternalLink size={11} />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </StudentModal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
