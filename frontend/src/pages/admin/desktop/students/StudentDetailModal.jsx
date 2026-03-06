import { useState } from 'react';
import {
  X, Edit2, Download, User, Mail, Phone, MapPin, Calendar,
  CreditCard, Award, BookOpen
} from 'lucide-react';
import { formatDateVN } from '../../../../utils/dateUtils';

// Status badge
function StatusBadge({ status }) {
  const map = {
    studying:  { cls: 'bg-emerald-100 text-emerald-700', text: 'Đang học' },
    pending:   { cls: 'bg-amber-100 text-amber-700',     text: 'Chờ duyệt' },
    completed: { cls: 'bg-blue-100 text-blue-700',       text: 'Hoàn thành' },
    certified: { cls: 'bg-purple-100 text-purple-700',   text: 'Có CC' },
  };
  const s = map[status] || { cls: 'bg-slate-100 text-slate-500', text: status || 'Mới' };
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.text}</span>;
}

// Single info row: label + value with subtle background
function InfoRow({ icon, label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-100 px-4 py-3">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
        {icon}<span>{label}</span>
      </div>
      <div className="font-semibold text-slate-800 text-sm">{value || 'N/A'}</div>
    </div>
  );
}

// Image with download overlay on hover
function PhotoCard({ src, alt, filename, height = 140, placeholder }) {
  const [hovered, setHovered] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!src) return;
    try {
      const blob = await fetch(src).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { window.open(src, '_blank'); }
  };

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{ height, background: src ? 'white' : undefined, border: src ? '1px solid #e2e8f0' : '2px dashed #d1d5db', cursor: src ? 'pointer' : 'default' }}
      onMouseEnter={() => src && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src ? (
        <>
          <img src={src} alt={alt} className="w-full h-full object-contain" />
          {hovered && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
              >
                <Download size={13} /> Tải xuống
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center text-slate-300 text-xs">{placeholder}</div>
      )}
    </div>
  );
}

export default function StudentDetailModal({ student, getImageUrl, onClose, onEdit }) {
  const regStatusBadge = (status) => <StatusBadge status={status} />;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content large"
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', padding: 0, overflow: 'hidden', maxWidth: 1100, width: '95vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}
      >
        {/* Modal header with gradient banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-7 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg ring-2 ring-white/30">
              {student.image_3x4
                ? <img src={getImageUrl(student.image_3x4)} alt="Avatar" className="w-full h-full object-cover" />
                : student.ho_ten_full?.charAt(0) || 'H'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white m-0">{student.ho_ten_full}</h2>
              <p className="text-emerald-100 text-sm mt-0.5">CCCD: {student.cccd}</p>
              <div className="mt-1.5"><StatusBadge status={student.registrations?.[0]?.status} /></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onEdit(student); }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <Edit2 size={14} /> Chỉnh sửa
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-all"
            >
              <Download size={14} /> In
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2-column info body */}
        <div className="grid grid-cols-2 gap-0">
          {/* Col 1: Personal info */}
          <div className="p-6 border-r border-slate-100">
            <h3 className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wide mb-4">
              <User size={15} /> Thông tin cá nhân
            </h3>
            <div className="flex flex-col gap-3">
              <InfoRow icon={<CreditCard size={13} />} label="Căn cước công dân" value={student.cccd} />
              <InfoRow icon={<Calendar size={13} />}   label="Ngày cấp CCCD"     value={formatDateVN(student.ngay_cap_cccd)} />
              <InfoRow icon={<User size={13} />}       label="Giới tính"         value={student.gioi_tinh === 'male' || student.gioi_tinh === 'Nam' ? 'Nam' : 'Nữ'} />
              <InfoRow icon={<Calendar size={13} />}   label="Ngày sinh"         value={formatDateVN(student.ngay_sinh)} />
              <InfoRow icon={<MapPin size={13} />}     label="Nơi sinh"          value={student.noi_sinh} />
              <InfoRow icon={<User size={13} />}       label="Dân tộc"           value={student.dan_toc || 'Kinh'} />
              <InfoRow icon={<User size={13} />}       label="Quốc tịch"         value={student.quoc_tich || 'Việt Nam'} />
            </div>
          </div>

          {/* Col 2: Contact + Photos */}
          <div className="p-6">
            <h3 className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-wide mb-4">
              <Phone size={15} /> Thông tin liên hệ
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              <InfoRow icon={<Mail size={13} />}     label="Email"            value={student.email} />
              <InfoRow icon={<Phone size={13} />}    label="Số điện thoại"    value={student.sdt} />
              <InfoRow icon={<MapPin size={13} />}   label="Địa chỉ"          value={student.dia_chi || 'Chưa cập nhật'} />
              <InfoRow icon={<BookOpen size={13} />} label="Đơn vị công tác"  value={student.don_vi_cong_tac || 'N/A'} />
              <InfoRow icon={<Calendar size={13} />} label="Ngày tạo hồ sơ"   value={formatDateVN(student.created_at)} />
              <InfoRow icon={<Calendar size={13} />} label="Cập nhật lần cuối" value={formatDateVN(student.updated_at)} />
            </div>

            {/* Photo gallery strip */}
            <h3 className="flex items-center gap-2 text-purple-500 text-xs font-bold uppercase tracking-wide mb-3">
              <Award size={15} /> Ảnh hồ sơ
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-400 font-medium text-center mb-1.5">Ảnh 3x4</p>
                <PhotoCard
                  src={getImageUrl(student.image_3x4)}
                  alt="Ảnh 3x4" filename={`${student.ho_ten_full || 'student'}_3x4.jpg`} height={100}
                  placeholder={<><User size={22} className="opacity-40 mb-1" /><span>Chưa có</span></>}
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium text-center mb-1.5">CCCD Mặt trước</p>
                <PhotoCard
                  src={getImageUrl(student.image_cccd_front)}
                  alt="CCCD Front" filename={`${student.ho_ten_full || 'student'}_cccd_front.jpg`} height={100}
                  placeholder={<CreditCard size={20} className="text-slate-300" />}
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium text-center mb-1.5">CCCD Mặt sau</p>
                <PhotoCard
                  src={getImageUrl(student.image_cccd_back)}
                  alt="CCCD Back" filename={`${student.ho_ten_full || 'student'}_cccd_back.jpg`} height={100}
                  placeholder={<CreditCard size={20} className="text-slate-300" />}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Registration history — compact chips */}
        {student.registrations?.length > 0 && (
          <div className="px-7 py-5 border-t border-slate-100 bg-slate-50/60">
            <h3 className="flex items-center gap-2 text-purple-600 text-xs font-bold uppercase tracking-wide mb-3">
              <BookOpen size={15} /> Lịch sử đăng ký lớp ({student.registrations.length})
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {student.registrations.map((reg, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{reg.ten_lop || `Lớp #${reg.class_id}`}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {reg.class_type === 'thi' ? '📝 Lớp thi' : '📚 Lớp học'} &bull; {formatDateVN(reg.registration_created_at || reg.created_at)}
                    </div>
                  </div>
                  {regStatusBadge(reg.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
