// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  XCircle,
} from 'lucide-react';
import api from '../../../services/api';
import {
  StudentCardSkeleton,
  StudentEmptyState,
  StudentInfoCard,
  StudentPageShell,
  StudentPill,
  StudentRefreshButton,
  StudentSection,
} from '../../../features/student/student-shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: any) => {
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d || '—'; }
};
const fmtDateTime = (d: any) => {
  try { return new Date(d).toLocaleString('vi-VN'); } catch { return d || '—'; }
};

type StatusTone = 'emerald' | 'red' | 'amber' | 'blue' | 'slate';

const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
  present:  { label: 'Có mặt',   tone: 'emerald' },
  co_mat:   { label: 'Có mặt',   tone: 'emerald' },
  absent:   { label: 'Vắng',     tone: 'red'     },
  vang:     { label: 'Vắng',     tone: 'red'     },
  late:     { label: 'Muộn',     tone: 'amber'   },
  muon:     { label: 'Muộn',     tone: 'amber'   },
  excused:  { label: 'Có phép',  tone: 'blue'    },
};
const mapStatus = (raw: string) =>
  STATUS_MAP[(raw || '').toLowerCase()] ?? { label: raw || '—', tone: 'slate' as StatusTone };

const isPresent = (r: any) =>
  ['present', 'co_mat', 'late', 'muon'].includes((r.status || r.trang_thai || '').toLowerCase());

const mapJoinSource = (raw: any) => ({
  zoom_click:        'Vào Zoom',
  meet_click:        'Vào Meet',
  manual:            'Điểm danh tay',
}[String(raw || '').toLowerCase()] ?? null);

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-extrabold tabular-nums shrink-0 ${textColor}`}>{pct}%</span>
    </div>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({
  classItem: { className, records, presentCount, totalCount, sourceLabel, teacherName },
}: {
  classItem: {
    className: string;
    records: any[];
    presentCount: number;
    totalCount: number;
    sourceLabel: string | null;
    teacherName: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const pct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50/80 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Class info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-extrabold text-slate-900 truncate">{className}</p>
            {sourceLabel ? (
              <StudentPill tone="blue">{sourceLabel}</StudentPill>
            ) : null}
            {teacherName ? (
              <span className="text-[11px] text-slate-400">{teacherName}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar pct={pct} />
            <span className="text-[11px] text-slate-400 shrink-0">
              {presentCount}/{totalCount} buổi
            </span>
          </div>
        </div>
        {/* Chevron */}
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expandable table */}
      {open ? (
        <div className="border-t border-slate-100 overflow-x-auto">
          {records.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-6 font-medium">
              Chưa có buổi học nào
            </p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-bold">Ngày</th>
                  <th className="px-4 py-2.5 text-left font-bold">Trạng thái</th>
                  <th className="px-4 py-2.5 text-left font-bold">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec: any, idx: number) => {
                  const { label, tone } = mapStatus(rec.status || rec.trang_thai);
                  const joinSource = mapJoinSource(rec.join_source);
                  const meta = rec.checked_in_at
                    ? `Điểm danh: ${fmtDateTime(rec.checked_in_at)}`
                    : joinSource;
                  return (
                    <tr
                      key={idx}
                      className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400" />
                          {fmtDate(rec.date || rec.session_date || rec.ngay)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StudentPill tone={tone}>{label}</StudentPill>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                        {rec.notes || rec.ghi_chu || meta || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AttendancePage({
  studentData,
  /** Pass true khi render bên trong StudentMobileLayout (đã có header) để tránh double sticky */
  insideMobileLayout = false,
}: {
  studentData: any;
  insideMobileLayout?: boolean;
}) {
  const [classes, setClasses]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const regs       = studentData?.registrations ?? [];
      const studentId  = Number(studentData?.id);

      const [offlineResults, onlineRes] = await Promise.all([
        regs.length
          ? Promise.all(regs.map(async (reg: any) => {
              try {
                const [classRes, attendRes] = await Promise.all([
                  api.getClass(reg.class_id),
                  api.getAttendanceByRegistration(reg.registration_id),
                ]);
                const records = Array.isArray(attendRes?.data) ? attendRes.data : [];
                return {
                  classKey:     `offline-${reg.registration_id}`,
                  className:    classRes.data?.ten_lop || classRes.data?.class_name || `Lớp #${reg.class_id}`,
                  sourceLabel:  reg.class_type === 'thi' ? 'Lịch thi' : 'Lớp học',
                  teacherName:  null,
                  records,
                  presentCount: records.filter(isPresent).length,
                  totalCount:   records.length,
                };
              } catch { return null; }
            }))
          : Promise.resolve([]),
        Number.isFinite(studentId) && studentId > 0
          ? api.getOnlineAttendanceByStudent(studentId, 'student').catch(() => null)
          : Promise.resolve(null),
      ]);

      const onlineItems   = Array.isArray(onlineRes?.data) ? onlineRes.data : [];
      const onlineResults = onlineItems.map((item: any) => {
        const records = Array.isArray(item.records) ? item.records : [];
        return {
          classKey:     `online-${item.online_class_id}`,
          className:    item.class_name || `Lớp online #${item.online_class_id}`,
          sourceLabel:  'Lớp online',
          teacherName:  item.teacher_name ?? null,
          records,
          presentCount: Number(item.present_count || 0),
          totalCount:   Number(item.total_sessions || records.length),
        };
      });

      setClasses([...offlineResults.filter(Boolean), ...onlineResults]);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (studentData) fetchAttendance(); }, [studentData]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSessions  = classes.reduce((s, c) => s + c.totalCount,   0);
  const totalPresent   = classes.reduce((s, c) => s + c.presentCount, 0);
  const overallPct     = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
  const lowAttendance  = classes.filter((c) => c.totalCount > 0 && Math.round((c.presentCount / c.totalCount) * 100) < 80);

  return (
    <StudentPageShell
      icon={<ClipboardList size={20} />}
      title="Điểm danh"
      subtitle="Theo dõi chuyên cần của bạn qua từng lớp học."
      stickyHeader={!insideMobileLayout}
      stats={[
        { label: 'Tổng buổi',  value: totalSessions },
        { label: 'Có mặt',     value: totalPresent  },
        { label: 'Chuyên cần', value: `${overallPct}%` },
      ]}
      action={<StudentRefreshButton onClick={fetchAttendance} loading={loading} />}
    >
      {/* Overall progress card */}
      <StudentInfoCard>
        <div className="flex items-center gap-4">
          {/* Big percent */}
          <div className="shrink-0 w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center">
            <span className={[
              'text-2xl font-black leading-none',
              overallPct >= 80 ? 'text-emerald-600' : overallPct >= 60 ? 'text-amber-600' : 'text-red-600',
            ].join(' ')}>
              {overallPct}
            </span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">%</span>
          </div>
          {/* Stats */}
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-extrabold text-slate-900">Tổng quan chuyên cần</p>
            <ProgressBar pct={overallPct} />
            <div className="flex gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle size={11} className="text-emerald-500" />
                Có mặt: <strong className="text-slate-700">{totalPresent}</strong>
              </span>
              <span className="flex items-center gap-1">
                <XCircle size={11} className="text-red-400" />
                Vắng: <strong className="text-slate-700">{totalSessions - totalPresent}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-slate-400" />
                Tổng: <strong className="text-slate-700">{totalSessions}</strong>
              </span>
            </div>
          </div>
        </div>
      </StudentInfoCard>

      {/* Low-attendance warning */}
      {!loading && lowAttendance.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-extrabold text-amber-800">Cảnh báo chuyên cần</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {lowAttendance.length} lớp dưới 80%:{' '}
              <span className="font-bold">{lowAttendance.map((c) => c.className).join(', ')}</span>
            </p>
          </div>
        </div>
      ) : null}

      {/* Class list */}
      <StudentSection title="Chi tiết từng lớp" description="Bấm vào lớp để xem lịch sử buổi học">
        {loading ? (
          <StudentCardSkeleton count={3} />
        ) : classes.length === 0 ? (
          <StudentEmptyState
            title="Chưa có dữ liệu điểm danh"
            description="Bạn chưa đăng ký lớp học nào hoặc chưa có buổi học nào được ghi nhận."
          />
        ) : (
          <div className="space-y-2">
            {classes.map((c) => (
              <ClassCard key={c.classKey || c.className} classItem={c} />
            ))}
          </div>
        )}
      </StudentSection>
    </StudentPageShell>
  );
}
