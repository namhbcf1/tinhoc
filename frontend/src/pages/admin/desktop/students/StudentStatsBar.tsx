import { Award, Clock, UserCheck, Users } from 'lucide-react';

function StatCard({ icon: Icon, label, value, tone = 'slate' }) {
  const toneClasses = {
    emerald: {
      icon: 'bg-emerald-100 text-emerald-700',
      border: 'border-emerald-200/70',
      bg: 'bg-emerald-50/70',
    },
    blue: {
      icon: 'bg-blue-100 text-blue-700',
      border: 'border-blue-200/70',
      bg: 'bg-blue-50/70',
    },
    amber: {
      icon: 'bg-amber-100 text-amber-700',
      border: 'border-amber-200/70',
      bg: 'bg-amber-50/70',
    },
    purple: {
      icon: 'bg-purple-100 text-purple-700',
      border: 'border-purple-200/70',
      bg: 'bg-purple-50/70',
    },
    slate: {
      icon: 'bg-slate-100 text-slate-700',
      border: 'border-slate-200/80',
      bg: 'bg-white',
    },
  };

  const styles = toneClasses[tone] || toneClasses.slate;

  return (
    <div className={`rounded-[24px] border ${styles.border} ${styles.bg} px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.3)]`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
          <div className="mt-2 text-[32px] font-black leading-none tracking-tight text-slate-900">{value}</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.icon}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function StudentStatsBar({ students, stats }) {
  const fallbackStudying = students.filter((s) => s.registrations?.some((r) => ['studying', 'active', 'approved'].includes(r.status))).length;
  const fallbackPending = students.filter((s) => s.registrations?.some((r) => r.status === 'pending')).length;
  const fallbackCertified = students.filter((s) => s.registrations?.some((r) => r.status === 'certified')).length;

  const totalStudents = stats?.totalStudents ?? students.length;
  const studying = stats?.activeStudents ?? fallbackStudying;
  const pending = stats?.pendingStudents ?? fallbackPending;
  const certified = stats?.certifiedStudents ?? fallbackCertified;

  return (
    <div className="admin-stats-unified">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Tổng học viên" value={totalStudents} tone="blue" />
        <StatCard icon={UserCheck} label="Đang học" value={studying} tone="emerald" />
        <StatCard icon={Clock} label="Chờ duyệt" value={pending} tone="amber" />
        <StatCard icon={Award} label="Có chứng chỉ" value={certified} tone="purple" />
      </div>
    </div>
  );
}
