import { Users, Eye, Edit2, Trash2 } from 'lucide-react';
import { formatDateVN } from '../../../../utils/dateUtils';

// Normalize giới tính — DB có thể lưu 'Nam'/'Nữ' hoặc 'male'/'female'
const resolveGender = (g) => {
  if (!g) return 'N/A';
  if (g === 'Nam' || g === 'male') return 'Nam';
  if (g === 'Nữ' || g === 'female') return 'Nữ';
  return g;
};

// CCCD code badge
function CccdBadge({ value }) {
  return (
    <code className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold">
      {value}
    </code>
  );
}

// Status badge with color map
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

// Action icon button with tooltip title
function ActionBtn({ onClick, title, className, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all duration-150 hover:scale-110 ${className}`}
    >
      {children}
    </button>
  );
}

const TH = ({ children, center }) => (
  <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 ${center ? 'text-center' : 'text-left'}`}>
    {children}
  </th>
);

// Indeterminate checkbox — shows dash when some (not all) rows are selected
function IndeterminateCheckbox({ checked, indeterminate, onChange, title }) {
  return (
    <input
      type="checkbox"
      title={title}
      ref={el => { if (el) el.indeterminate = indeterminate; }}
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
    />
  );
}

export default function StudentTableView({
  students,
  onViewDetail,
  onEdit,
  onDelete,
  // Bulk selection props (optional — table is still usable without them)
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
}) {
  const allSelected   = students.length > 0 && students.every(s => selectedIds.has(s.id));
  const someSelected  = students.some(s => selectedIds.has(s.id)) && !allSelected;
  const bulkEnabled   = typeof onToggleSelect === 'function';

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Users size={48} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">Chưa có học viên nào</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            {/* Select-all checkbox column */}
            {bulkEnabled && (
              <th className="px-4 py-4 bg-slate-50 w-12">
                <IndeterminateCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => onToggleSelectAll(students)}
                  title="Chọn tất cả"
                />
              </th>
            )}
            <TH>Học viên</TH>
            <TH>CCCD</TH>
            <TH>Liên hệ</TH>
            <TH>Lớp học</TH>
            <TH>Lớp thi</TH>
            <TH>Trạng thái</TH>
            <TH center>Thao tác</TH>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            const isSelected = selectedIds.has(student.id);
            return (
              <tr
                key={student.id}
                className={`border-b border-slate-50 transition-all duration-150 group
                  ${isSelected
                    ? 'bg-emerald-50 border-l-4 border-l-emerald-400'
                    : 'hover:bg-slate-50 hover:border-l-4 hover:border-l-emerald-400'}`}
              >
                {/* Row checkbox */}
                {bulkEnabled && (
                  <td className="px-4 py-5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(student.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                )}

                {/* Avatar + Name */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm">
                      {student.ho_ten_full?.charAt(0) || 'H'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{student.ho_ten_full}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {resolveGender(student.gioi_tinh)} &bull; {formatDateVN(student.ngay_sinh)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* CCCD */}
                <td className="px-6 py-5">
                  <CccdBadge value={student.cccd} />
                </td>

                {/* Contact */}
                <td className="px-6 py-5">
                  <div className="text-sm text-slate-700">{student.email}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{student.sdt}</div>
                </td>

                {/* Classes */}
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                    {student.registrations?.filter(r => r.class_type === 'hoc').length || 0} lớp
                  </span>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                    {student.registrations?.filter(r => r.class_type === 'thi').length || 0} lớp
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-5">
                  <StatusBadge status={student.registrations?.[0]?.status} />
                </td>

                {/* Actions */}
                <td className="px-6 py-5">
                  <div className="flex items-center justify-center gap-1">
                    <ActionBtn onClick={() => onViewDetail(student)} title="Xem chi tiết" className="text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                      <Eye size={17} />
                    </ActionBtn>
                    <ActionBtn onClick={() => onEdit(student)} title="Chỉnh sửa" className="text-blue-400 hover:text-blue-600 hover:bg-blue-50">
                      <Edit2 size={17} />
                    </ActionBtn>
                    <ActionBtn onClick={() => onDelete(student)} title="Xóa" className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={17} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
