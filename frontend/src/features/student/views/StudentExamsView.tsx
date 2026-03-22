import { useMemo, useState } from 'react';
import { BookOpenCheck, CalendarClock, ExternalLink, MapPin, RefreshCw, Video } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { useStudentExams } from '../student-hooks';
import {
  StudentEmptyState,
  StudentFilterBar,
  StudentInfoCard,
  StudentModal,
  StudentPageShell,
  StudentPill,
  StudentSection,
} from '../student-shared';
import { openStudyPlatform } from '../student-nav';
import { formatShortDate, formatShortTime, getRelativeExamLabel } from '../student-utils';

function getStatusTone(status: string) {
  switch (status) {
    case 'pending':
      return 'amber';
    case 'approved':
    case 'registered':
      return 'emerald';
    case 'completed':
      return 'blue';
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Chờ duyệt';
    case 'approved':
    case 'registered':
      return 'Đã duyệt';
    case 'completed':
      return 'Đã hoàn thành';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return 'Có thể đăng ký';
  }
}

function formatExamTimeSummary(examDate: string, durationMinutes: number | null) {
  if (durationMinutes == null) {
    return `${formatShortTime(examDate)} · Chưa khai báo thời lượng`;
  }

  return `${formatShortTime(examDate)} · ${durationMinutes} phút`;
}

const ACTIVE_REGISTRATION_CONFLICT_MESSAGE =
  'Bạn đã có đăng ký cùng nhóm đang hoạt động. Mỗi học viên chỉ được giữ tối đa 1 lịch tiếng Anh (VSTEP/VEPT) và 1 lịch tin học (PTIT...).';

function resolveRegisterErrorMessage(registerError: any) {
  const code = registerError?.code || '';
  const message = String(registerError?.message || '').trim();

  if (code === 'STUDENT_ALREADY_HAS_EXAM_AT_SAME_TIME') {
    return message || 'Bạn đã có một kỳ thi khác trùng thời gian. Vui lòng hủy đăng ký cũ trước khi đăng ký kỳ thi này.';
  }

  if (code === 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION') {
    return message || ACTIVE_REGISTRATION_CONFLICT_MESSAGE;
  }

  if (registerError?.status === 400) {
    return message || ACTIVE_REGISTRATION_CONFLICT_MESSAGE;
  }

  return message || 'Không thể đăng ký lịch thi';
}

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
  const examDate = new Date(exam.examDate);
  const isRegistered = ['pending', 'approved', 'registered'].includes(exam.status);
  const isApproved = ['approved', 'registered'].includes(exam.status);
  const isPast = examDate.getTime() < new Date().setHours(0, 0, 0, 0);
  const hasRegistrationConflict = Boolean(!isRegistered && !isPast && exam.hasTimeConflict);

  return (
    <StudentInfoCard className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <StudentPill tone={getStatusTone(exam.status)}>{getStatusLabel(exam.status)}</StudentPill>
            <StudentPill tone={exam.mode === 'online' ? 'blue' : 'slate'}>
              {exam.mode === 'online' ? 'Online' : 'Offline'}
            </StudentPill>
          </div>
          <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">{exam.title}</h3>
          {exam.subtitle ? <p className="mt-1 text-sm text-slate-500">{exam.subtitle}</p> : null}
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Lịch thi</p>
          <p className="mt-1 text-sm font-black text-emerald-900">{formatShortDate(exam.examDate)}</p>
        </div>
      </div>

      <div className={compact ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Thời gian</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {formatExamTimeSummary(exam.examDate, exam.durationMinutes)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{getRelativeExamLabel(exam.examDate)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Địa điểm</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{exam.location}</p>
          <p className="mt-1 text-xs text-slate-500">{exam.examType || 'Thi của trung tâm'}</p>
        </div>
      </div>

      {hasRegistrationConflict ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {exam.conflictMessage || ACTIVE_REGISTRATION_CONFLICT_MESSAGE}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2">
        <Button className="rounded-2xl" onClick={onOpen}>Xem chi tiết</Button>
        {!isPast ? (
          isRegistered ? (
            <Button variant="outline" className="rounded-2xl" disabled={loading} onClick={onCancel}>
              {loading ? 'Đang xử lý...' : 'Hủy đăng ký'}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={loading || hasRegistrationConflict}
              onClick={onRegister}
            >
              {loading ? 'Đang xử lý...' : hasRegistrationConflict ? 'Đã có lớp khác' : 'Đăng ký'}
            </Button>
          )
        ) : null}
        {isApproved ? (
          <Button variant="ghost" className="rounded-2xl text-emerald-700" onClick={openStudyPlatform}>
            Mở Học tập
          </Button>
        ) : null}
      </div>
    </StudentInfoCard>
  );
}

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
    { label: 'Sắp thi', value: sections.upcoming.length },
    { label: 'Đã đăng ký', value: sections.registered.length },
    { label: 'Học tập', value: 'Mở tab mới' },
  ], [sections]);

  const handleRegister = async (examId: number | string) => {
    const targetExam = [...sections.upcoming, ...sections.registered, ...sections.past].find(
      (exam) => String(exam.id) === String(examId)
    );

    if (targetExam?.hasTimeConflict) {
      showError(targetExam.conflictMessage || ACTIVE_REGISTRATION_CONFLICT_MESSAGE);
      return;
    }

    try {
      await registerExam(examId);
      success('Đăng ký thi thành công. Vui lòng chờ xác nhận.');
      setSelectedExam(null);
    } catch (registerError: any) {
      showError(resolveRegisterErrorMessage(registerError), 5000);
    }
  };

  const handleCancel = async (examId: number | string) => {
    try {
      await cancelExam(examId);
      success('Đã hủy đăng ký kỳ thi.');
      setSelectedExam(null);
    } catch (cancelError: any) {
      showError(cancelError?.message || 'Không thể hủy đăng ký');
    }
  };

  return (
    <>
      <StudentPageShell
        compact={compact}
        icon={<CalendarClock size={compact ? 22 : 26} />}
        title="Lịch thi"
        subtitle="Tập trung vào các kỳ thi của trung tâm: biết rõ kỳ thi nào sắp đến, trạng thái đăng ký và chỉ mở Học tập khi kỳ thi đã được duyệt."
        stats={stats}
        action={(
          <div className={compact ? 'w-full' : ''}>
            <Button
              variant="outline"
              className="w-full rounded-2xl border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={refetch}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
          </div>
        )}
      >
        <StudentSection
          title="Bộ lọc nhanh"
          description="Giữ trọng tâm ở kỳ thi sắp đến và nhóm đã đăng ký; không trộn với nền tảng luyện thi riêng."
        >
          <StudentFilterBar filters={filters} activeFilter={activeFilter} onChange={setActiveFilter} />
        </StudentSection>

        <StudentSection
          title="Sắp thi"
          description="Những kỳ thi cần ưu tiên trong giai đoạn hiện tại."
        >
          {loading ? (
            <div className={compact ? 'space-y-3' : 'grid gap-4 lg:grid-cols-2'}>
              {[1, 2, 3].map((item) => (
                <StudentInfoCard key={item} className="h-56 animate-pulse bg-slate-50" />
              ))}
            </div>
          ) : sections.upcoming.length ? (
            <div className={compact ? 'space-y-3' : 'grid gap-4 lg:grid-cols-2'}>
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
              description={error || 'Bạn chưa có lịch thi mới trong bộ lọc hiện tại. Khi có kỳ thi được mở, chúng sẽ xuất hiện tại đây.'}
              action={<Button className="rounded-2xl" onClick={refetch}>Kiểm tra lại</Button>}
            />
          )}
        </StudentSection>

        <div className="space-y-4">
          <StudentSection
            title="Chờ xác nhận / đã đăng ký"
            description="Các kỳ thi bạn đã thao tác, để theo dõi duyệt và chủ động luyện thêm khi đã đủ điều kiện."
          >
            {sections.registered.length ? (
              <div className="space-y-3">
                {sections.registered.map((exam) => (
                  <StudentInfoCard key={exam.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black tracking-tight text-slate-900">{exam.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{formatShortDate(exam.examDate)} · {exam.location}</p>
                      </div>
                      <StudentPill tone={getStatusTone(exam.status)}>{getStatusLabel(exam.status)}</StudentPill>
                    </div>
                  </StudentInfoCard>
                ))}
              </div>
            ) : (
              <StudentEmptyState
                title="Chưa có đăng ký thi"
                description="Khi bạn đăng ký hoặc chờ duyệt, các kỳ thi sẽ hiện ở đây để theo dõi."
              />
            )}
          </StudentSection>
        </div>
      </StudentPageShell>

      <StudentModal
        open={!!selectedExam}
        title={selectedExam?.title || 'Chi tiết lịch thi'}
        onClose={() => setSelectedExam(null)}
        compact={compact}
        footer={selectedExam ? (
          <div className={compact ? 'space-y-2' : 'flex flex-wrap gap-2'}>
            {!['completed', 'cancelled'].includes(selectedExam.status) ? (
              ['pending', 'approved', 'registered'].includes(selectedExam.status) ? (
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  disabled={actionLoading === selectedExam.id}
                  onClick={() => handleCancel(selectedExam.id)}
                >
                  {actionLoading === selectedExam.id ? 'Đang xử lý...' : 'Hủy đăng ký'}
                </Button>
              ) : (
                <Button
                  className="rounded-2xl"
                  disabled={actionLoading === selectedExam.id || Boolean(selectedExam.hasTimeConflict)}
                  onClick={() => handleRegister(selectedExam.id)}
                >
                  {actionLoading === selectedExam.id
                    ? 'Đang xử lý...'
                    : selectedExam.hasTimeConflict
                      ? 'Đã có lớp khác'
                      : 'Đăng ký thi'}
                </Button>
              )
            ) : null}
            {['approved', 'registered'].includes(selectedExam.status) ? (
              <Button variant="ghost" className="rounded-2xl text-emerald-700" onClick={openStudyPlatform}>
                Mở Học tập
              </Button>
            ) : null}
          </div>
        ) : null}
      >
        {selectedExam ? (
          <div className="space-y-4">
            <StudentInfoCard>
              <div className="flex flex-wrap gap-2">
                <StudentPill tone={getStatusTone(selectedExam.status)}>{getStatusLabel(selectedExam.status)}</StudentPill>
                <StudentPill tone={selectedExam.mode === 'online' ? 'blue' : 'slate'}>
                  {selectedExam.mode === 'online' ? 'Online' : 'Offline'}
                </StudentPill>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Ngày thi</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatShortDate(selectedExam.examDate)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Thời gian</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {formatExamTimeSummary(selectedExam.examDate, selectedExam.durationMinutes)}
                  </p>
                </div>
              </div>
            </StudentInfoCard>

            {selectedExam.hasTimeConflict && !['pending', 'approved', 'registered', 'completed', 'cancelled'].includes(selectedExam.status) ? (
              <StudentInfoCard className="border border-amber-200 bg-amber-50">
                <div className="space-y-1 text-sm text-amber-900">
                  <p className="font-black">Không thể đăng ký kỳ thi này lúc này</p>
                  <p>{selectedExam.conflictMessage || ACTIVE_REGISTRATION_CONFLICT_MESSAGE}</p>
                  {selectedExam.conflictingExamDate ? (
                    <p className="text-amber-800">
                      Đăng ký đang giữ: {formatShortDate(selectedExam.conflictingExamDate)}
                    </p>
                  ) : null}
                </div>
              </StudentInfoCard>
            ) : null}

            <StudentInfoCard>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <div>
                    <p className="font-black text-slate-900">Địa điểm / hình thức</p>
                    <p className="mt-1">{selectedExam.location}</p>
                  </div>
                </div>
                {selectedExam.className ? (
                  <div className="flex items-start gap-3">
                    <BookOpenCheck size={16} className="mt-0.5 text-slate-400" />
                    <div>
                      <p className="font-black text-slate-900">Lớp liên quan</p>
                      <p className="mt-1">{selectedExam.className}</p>
                    </div>
                  </div>
                ) : null}
                {selectedExam.note ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <p className="font-black">Ghi chú</p>
                    <p className="mt-2 text-sm leading-6">{selectedExam.note}</p>
                  </div>
                ) : null}
                {selectedExam.zoomLink && ['approved', 'registered'].includes(selectedExam.status) ? (
                  <div className="flex flex-col gap-2">
                    <a
                      href={selectedExam.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-700"
                    >
                      <Video size={16} />
                      Mở phòng thi online
                    </a>
                    {selectedExam.zoomLinkBackup ? (
                      <a
                        href={selectedExam.zoomLinkBackup}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 font-bold text-orange-700"
                      >
                        <Video size={16} />
                        Phòng thi dự phòng
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {['approved', 'registered'].includes(selectedExam.status) ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <p className="font-black">Luyện tập trước kỳ thi</p>
                    <p className="mt-2 text-sm leading-6">
                      Kỳ thi này đã được duyệt. Bạn có thể mở Học tập để ôn luyện trên hệ thống riêng.
                    </p>
                    <Button className="mt-3 rounded-2xl" onClick={openStudyPlatform}>
                      Mở Học tập <ExternalLink size={14} />
                    </Button>
                  </div>
                ) : null}
              </div>
            </StudentInfoCard>
          </div>
        ) : null}
      </StudentModal>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
