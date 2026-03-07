import { Users, UserCheck, Clock, Award } from 'lucide-react';

// Stat card with icon circle, value, label — Tailwind only
function StatCard({ icon, value, label, iconBg, iconColor }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs font-semibold text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function StudentStatsBar({ students }) {
  const studying  = students.filter(s => s.registrations?.some(r => r.status === 'studying')).length;
  const pending   = students.filter(s => s.registrations?.some(r => r.status === 'pending')).length;
  const certified = students.filter(s => s.registrations?.some(r => r.status === 'certified')).length;

  return (
    <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          icon={<Users size={24} />}
          value={students.length}
          label="Tổng học viên"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={<UserCheck size={24} />}
          value={studying}
          label="Đang học"
          iconBg="bg-emerald-100"
          iconColor="text-emerald-500"
        />
        <StatCard
          icon={<Clock size={24} />}
          value={pending}
          label="Chờ duyệt"
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <StatCard
          icon={<Award size={24} />}
          value={certified}
          label="Có chứng chỉ"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
      </div>
    </div>
  );
}
