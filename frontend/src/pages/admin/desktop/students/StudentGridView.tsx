import { Mail, Phone } from 'lucide-react';

// Status badge
function StatusBadge({ status }) {
  const map = {
    studying:  { cls: 'bg-emerald-100 text-emerald-700', text: 'Đang học' },
    pending:   { cls: 'bg-amber-100 text-amber-700',     text: 'Chờ duyệt' },
    completed: { cls: 'bg-blue-100 text-blue-700',       text: 'Hoàn thành' },
    certified: { cls: 'bg-purple-100 text-purple-700',   text: 'Có CC' },
  };
  const s = map[status] || { cls: 'bg-slate-100 text-slate-500', text: status || 'Mới' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.text}
    </span>
  );
}

// Single grid card
function StudentCard({ student, onClick }) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200"
    >
      {/* Status badge — top-right */}
      <div className="absolute top-4 right-4">
        <StatusBadge status={student.registrations?.[0]?.status} />
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0">
          {student.ho_ten_full?.charAt(0) || 'H'}
        </div>
        <div>
          <div className="font-bold text-slate-900 text-base leading-tight">{student.ho_ten_full}</div>
          <div className="text-xs text-slate-400 mt-1 font-mono">{student.cccd}</div>
        </div>
      </div>

      {/* Contact info */}
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Mail size={14} className="flex-shrink-0 text-slate-400" />
          <span className="truncate">{student.email || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Phone size={14} className="flex-shrink-0 text-slate-400" />
          <span>{student.sdt || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}

export default function StudentGridView({ students, onViewDetail }) {
  return (
    <div className="p-8 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 bg-slate-50/50">
      {students.map(student => (
        <StudentCard
          key={student.id}
          student={student}
          onClick={() => onViewDetail(student)}
        />
      ))}
    </div>
  );
}
