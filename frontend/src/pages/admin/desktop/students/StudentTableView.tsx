// @ts-nocheck
import { Users, Eye, Edit2, Trash2 } from 'lucide-react';
import { formatDateVN } from '../../../../utils/dateUtils';
import { applyImageFallback } from '../../../../utils/imageUrl';

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
    <code className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-mono font-semibold text-slate-600">
      {value}
    </code>
  );
}

// Status badge with color map
function StatusBadge({ status }) {
  const normalizedStatus = String(status || 'new').toLowerCase();
  const map = {
    new:       { cls: 'bg-slate-100 text-slate-600',      text: 'Mới' },
    studying:  { cls: 'bg-emerald-100 text-emerald-700',  text: 'Đang học' },
    active:    { cls: 'bg-emerald-100 text-emerald-700',  text: 'Đang học' },
    approved:  { cls: 'bg-blue-100 text-blue-700',        text: 'Đã duyệt' },
    pending:   { cls: 'bg-amber-100 text-amber-700',      text: 'Chờ duyệt' },
    completed: { cls: 'bg-blue-100 text-blue-700',        text: 'Hoàn thành' },
    certified: { cls: 'bg-purple-100 text-purple-700',    text: 'Có chứng chỉ' },
    cancelled: { cls: 'bg-rose-100 text-rose-700',        text: 'Đã hủy' },
    canceled:  { cls: 'bg-rose-100 text-rose-700',        text: 'Đã hủy' },
  };
  const s = map[normalizedStatus] || { cls: 'bg-slate-100 text-slate-500', text: 'Khác' };
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

const TH = ({ children, center, sortKey, sortState, onSort }) => {
  const active = sortKey && sortState?.sort_by === sortKey;
  return (
    <th className={`px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 bg-[#f4f7f5] ${center ? 'text-center' : 'text-left'}`}>
      {sortKey ? (
        <button type="button" onClick={() => onSort?.(sortKey)} className={`inline-flex items-center gap-1 rounded-lg px-1 py-0.5 transition hover:text-emerald-700 ${active ? 'text-emerald-700' : ''}`}>
          {children}{active ? (sortState.sort_dir === 'asc' ? ' ↑' : ' ↓') : ''}
        </button>
      ) : children}
    </th>
  );
};

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
  getImageUrl,
  // Bulk selection props (optional — table is still usable without them)
  selectedIds = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  sortState,
  onSort,
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
      <table className="min-w-[1120px] w-full border-collapse">
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
            <TH sortKey="name" sortState={sortState} onSort={onSort}>Học viên</TH>
            <TH sortKey="cccd" sortState={sortState} onSort={onSort}>CCCD</TH>
            <TH sortKey="email" sortState={sortState} onSort={onSort}>Liên hệ</TH>
            <TH sortKey="study_count" sortState={sortState} onSort={onSort}>Lớp học</TH>
            <TH sortKey="exam_count" sortState={sortState} onSort={onSort}>Lớp thi</TH>
            <TH sortKey="status" sortState={sortState} onSort={onSort}>Trạng thái</TH>
            <TH center>Thao tác</TH>
          </tr>
        </thead>
        <tbody>
          {students.map(student => {
            const isSelected = selectedIds.has(student.id);
            const studyCount = student.study_count ?? student.registrations?.filter(r => r.class_type === 'hoc').length ?? 0;
            const examCount = student.exam_count ?? student.registrations?.filter(r => r.class_type === 'thi').length ?? 0;
            const primaryStatus = student.primary_status || student.registrations?.[0]?.status;
            return (
              <tr
                key={student.id}
                className={`border-b border-slate-100 transition-all duration-150 group
                  ${isSelected
                    ? 'bg-emerald-50/75'
                    : 'hover:bg-slate-50/85'}`}
              >
                {/* Row checkbox */}
                {bulkEnabled && (
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(student.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                )}

                {/* Avatar + Name */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm overflow-hidden">
                      {student.photo_3x4_image_id || student.image_3x4 ? (
                        <img
                          src={getImageUrl ? getImageUrl(student.photo_3x4_image_id || student.image_3x4) : (student.photo_3x4_image_id || student.image_3x4)}
                          alt={student.ho_ten_full || 'Hoc vien'}
                          className="w-full h-full object-cover"
                          onError={(event) => applyImageFallback(event, student.ho_ten_full || 'Hoc vien')}
                        />
                      ) : (
                        student.ho_ten_full?.charAt(0) || 'H'
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 text-sm">{student.ho_ten_full}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {resolveGender(student.gioi_tinh)} &bull; {formatDateVN(student.ngay_sinh)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* CCCD */}
                <td className="px-5 py-4">
                  <CccdBadge value={student.cccd} />
                </td>

                {/* Contact */}
                <td className="px-5 py-4">
                  <div className="max-w-[260px] truncate text-sm text-slate-700">{student.email}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{student.sdt}</div>
                </td>

                {/* Classes */}
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                    {studyCount} lớp
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                    {examCount} lớp
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <StatusBadge status={primaryStatus} />
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
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
