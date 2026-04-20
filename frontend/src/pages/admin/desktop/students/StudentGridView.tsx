import { Mail, Phone } from 'lucide-react';
import { applyImageFallback } from '../../../../utils/imageUrl';

// Status badge
function StatusBadge({ status }) {
  const map = {
    studying:  { cls: 'bg-emerald-100 text-emerald-700', text: 'Đang học' },
    active:    { cls: 'bg-emerald-100 text-emerald-700', text: 'Đang học' },
    approved:  { cls: 'bg-blue-100 text-blue-700',       text: 'Đã duyệt' },
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
function StudentCard({ student, onClick, getImageUrl }) {
  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer rounded-[28px] border border-slate-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_28px_60px_-34px_rgba(15,23,42,0.34)]"
    >
      {/* Status badge — top-right */}
      <div className="absolute top-4 right-4">
        <StatusBadge status={student.registrations?.[0]?.status} />
      </div>

      {/* Avatar + Name */}
      <div className="mb-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0 overflow-hidden">
          {student.image_3x4 || student.photo_3x4_image_id ? (
            <img
              src={getImageUrl ? getImageUrl(student.image_3x4 || student.photo_3x4_image_id) : student.image_3x4}
              alt={student.ho_ten_full || 'Hoc vien'}
              className="w-full h-full object-cover"
              onError={(event) => applyImageFallback(event, student.ho_ten_full || 'Hoc vien')}
            />
          ) : (
            student.ho_ten_full?.charAt(0) || 'H'
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate font-bold text-slate-900 text-base leading-tight">{student.ho_ten_full}</div>
          <div className="mt-1 text-xs font-mono text-slate-400">{student.cccd}</div>
        </div>
      </div>

      {/* Contact info */}
      <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4">
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

export default function StudentGridView({ students, onViewDetail, getImageUrl }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 bg-slate-50/45 p-7">
      {students.map(student => (
        <StudentCard
          key={student.id}
          student={student}
          onClick={() => onViewDetail(student)}
          getImageUrl={getImageUrl}
        />
      ))}
    </div>
  );
}
