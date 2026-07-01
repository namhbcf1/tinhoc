// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Video,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import {
  StudentCardSkeleton,
  StudentEmptyState,
  StudentInfoCard,
  StudentPageShell,
  StudentPill,
  StudentSection,
} from '../../../features/student/student-shared';
import api from '../../../services/api';

const B = Button as any;

interface EnrolledClass {
  online_class_id: number;
  class_name: string;
  schedule_time: string | null;
  start_date: string | null;
  end_date: string | null;
  teacher_name: string | null;
  class_status: string;
  enrollment_status: string;
  join_link: string | null;
  today_session_id: number | null;
  today_session_date: string | null;
  today_start_time: string | null;
  today_end_time: string | null;
  today_attendance: string | null;
  today_checked_in_at: string | null;
  joined_today: boolean;
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN');
  } catch {
    return value;
  }
}

function fmtTime(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 5);
}

function detectMeetingPlatform(link?: string | null) {
  const normalized = String(link || '').toLowerCase();
  return normalized.includes('meet.google.com') ? 'meet' : 'zoom';
}

function ClassCard({
  cls,
  onJoinRoom,
  joining,
}: {
  cls: EnrolledClass;
  onJoinRoom: (cls: EnrolledClass) => void;
  joining: boolean;
}) {
  const hasLink = Boolean(cls.join_link);
  const didJoin = cls.joined_today;
  const platform = detectMeetingPlatform(cls.join_link);
  const joinLabel = platform === 'meet' ? 'Vào Meet' : 'Vào Zoom';
  const rejoinLabel = platform === 'meet' ? 'Vào lại Meet' : 'Vào lại Zoom';
  const noLinkLabel = platform === 'meet' ? 'Chưa có link Meet' : 'Chưa có link Zoom';
  const todayTime = cls.today_start_time
    ? `${fmtTime(cls.today_start_time)}${cls.today_end_time ? ' – ' + fmtTime(cls.today_end_time) : ''}`
    : null;

  return (
    <StudentInfoCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900">{cls.class_name}</h3>
            {didJoin ? (
              <StudentPill tone="emerald">
                <CheckCircle2 size={11} className="mr-1" />
                Đã vào hôm nay
              </StudentPill>
            ) : null}
            {!hasLink ? <StudentPill tone="slate">Chưa có link</StudentPill> : null}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {cls.teacher_name ? <span>👩‍🏫 {cls.teacher_name}</span> : null}
            {cls.schedule_time ? (
              <span>
                <Calendar size={11} className="mr-1 inline text-slate-400" />
                {cls.schedule_time}
              </span>
            ) : null}
            {cls.start_date || cls.end_date ? (
              <span>
                {fmtDate(cls.start_date)}
                {cls.end_date ? ` → ${fmtDate(cls.end_date)}` : ''}
              </span>
            ) : null}
          </div>
        </div>

        {hasLink ? (
          <B
            disabled={joining}
            onClick={() => onJoinRoom(cls)}
            className={`min-w-[120px] rounded-xl ${
              didJoin ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
            } text-white`}
          >
            {joining ? (
              <Loader2 size={15} className="mr-2 animate-spin" />
            ) : didJoin ? (
              <CheckCircle2 size={15} className="mr-2" />
            ) : (
              <Video size={15} className="mr-2" />
            )}
            {joining ? 'Đang mở...' : didJoin ? rejoinLabel : joinLabel}
            {!joining ? <ExternalLink size={12} className="ml-2 opacity-60" /> : null}
          </B>
        ) : (
          <span className="mt-1 text-xs font-semibold text-slate-400">{noLinkLabel}</span>
        )}
      </div>

      {cls.today_session_date ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            didJoin
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          <div className="mb-0.5 font-bold">
            {didJoin ? '✅ Buổi hôm nay: đã ghi nhận vào lớp' : '📓 Buổi học hôm nay'}
          </div>
          <div className="text-xs font-semibold opacity-80">
            {fmtDate(cls.today_session_date)}
            {todayTime ? ` · ${todayTime}` : ''}
          </div>
          {didJoin && cls.today_checked_in_at ? (
            <div className="mt-0.5 text-xs opacity-70">
              Check-in:{' '}
              {new Date(cls.today_checked_in_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </StudentInfoCard>
  );
}

export default function StudentMyClassesView({ compact = false }: { compact?: boolean }) {
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await (api as any).getMyEnrolledClasses();
      const data = response?.data ?? response ?? [];
      setClasses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách lớp học.');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleJoinRoom = async (cls: EnrolledClass) => {
    setJoiningId(cls.online_class_id);
    try {
      const source = detectMeetingPlatform(cls.join_link) === 'meet' ? 'meet_click' : 'zoom_click';
      const response = await (api as any).trackZoomJoin(cls.online_class_id, source);
      const payload = response?.data ?? response ?? {};
      const link: string | null = payload?.join_link || cls.join_link || null;
      const launchPlatform = detectMeetingPlatform(link);

      setClasses((previous) =>
        previous.map((item) =>
          item.online_class_id === cls.online_class_id ? { ...item, joined_today: true } : item,
        ),
      );

      setToast({
        type: 'success',
        text: `Đã ghi nhận vào lớp tự động. Đang mở ${
          launchPlatform === 'meet' ? 'Google Meet' : 'Zoom'
        }...`,
      });

      if (link) {
        setTimeout(() => window.open(link, '_blank', 'noopener,noreferrer'), 300);
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        text: `Không ghi được điểm danh: ${err?.message || 'Lỗi hệ thống'}`,
      });
      if (cls.join_link) {
        setTimeout(() => window.open(cls.join_link, '_blank', 'noopener,noreferrer'), 500);
      }
    } finally {
      setJoiningId(null);
    }
  };

  const activeCount = classes.filter((item) => item.class_status === 'active').length;
  const joinedToday = classes.filter((item) => item.joined_today).length;

  return (
    <StudentPageShell
      icon={<BookOpen size={18} />}
      title="Lớp học của tôi"
      subtitle="Vào đúng Zoom/Meet của buổi học hôm nay để hệ thống ghi nhận tự động trong khung giờ hợp lệ."
      compact={compact}
      stickyHeader={!compact}
      stats={[
        { label: 'Đang học', value: activeCount },
        { label: 'Đã vào hôm nay', value: joinedToday },
      ]}
      action={
        <B
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            setError(null);
            void load();
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </B>
      }
    >
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      {loading ? <StudentCardSkeleton count={3} /> : null}

      {!loading && error ? (
        <StudentEmptyState
          title="Không thể tải lớp học"
          description={error}
          action={
            <B variant="outline" onClick={() => void load()}>
              Thử lại
            </B>
          }
        />
      ) : null}

      {!loading && !error ? (
        <StudentSection
          title="Danh sách lớp đang học"
          description="Hệ thống tự ghi nhận khi bạn vào đúng Zoom/Meet của buổi học hôm nay trong khung giờ hợp lệ."
        >
          {!classes.length ? (
            <StudentEmptyState
              title="Chưa có lớp online nào"
              description="Khi bạn được ghi nhận vào một lớp học online, lớp sẽ xuất hiện tại đây cùng nút vào phòng học tương ứng."
            />
          ) : (
            <div className="space-y-4">
              {classes.map((cls) => (
                <ClassCard
                  key={cls.online_class_id}
                  cls={cls}
                  onJoinRoom={handleJoinRoom}
                  joining={joiningId === cls.online_class_id}
                />
              ))}
            </div>
          )}
        </StudentSection>
      ) : null}
    </StudentPageShell>
  );
}
