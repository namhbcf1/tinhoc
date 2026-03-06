import { X, BookOpen, User, CreditCard } from 'lucide-react';

// Tailwind-styled input field
function FormInput({ label, value, onChange, type = 'text', placeholder = '', required = false, disabled = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all duration-150
          focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 border-slate-200
          ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800 hover:border-slate-300'}`}
      />
    </div>
  );
}

// Colored left-border section header
function SectionHeader({ color, children }) {
  const colors = { green: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500', purple: 'bg-purple-500' };
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`w-1 h-5 rounded-full ${colors[color] || colors.green}`} />
      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{children}</span>
    </div>
  );
}

export default function StudentFormModal({ isEdit, formData, setFormData, selectedStudent, getImageUrl, onSubmit, onClose }) {
  const update = (field) => (val) => setFormData({ ...formData, [field]: val });

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 900, background: 'white', borderRadius: 16, padding: 0, overflow: 'hidden' }}
      >
        {/* Emerald gradient header */}
        <div className="flex items-center justify-between px-7 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500">
          <div>
            <h2 className="text-lg font-bold text-white m-0">
              {isEdit ? 'Chỉnh sửa hồ sơ học viên' : 'Thêm học viên mới'}
            </h2>
            <p className="text-emerald-100 text-xs mt-1">
              {isEdit ? 'Cập nhật toàn bộ thông tin trong cơ sở dữ liệu' : 'Điền đầy đủ thông tin để tạo hồ sơ mới'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-[1fr_260px]">

            {/* Left: form sections */}
            <div className="p-7 space-y-6">

              {/* Personal info section */}
              <section>
                <SectionHeader color="green">Thông tin cá nhân</SectionHeader>
                <div className="grid grid-cols-3 gap-3">
                  <FormInput label="Họ"    value={formData.ho}      onChange={update('ho')}      required />
                  <FormInput label="Tên đệm" value={formData.ten_dem} onChange={update('ten_dem')} />
                  <FormInput label="Tên"   value={formData.ten}     onChange={update('ten')}     required />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <FormInput label="Ngày sinh" value={formData.ngay_sinh} onChange={update('ngay_sinh')} placeholder="dd/mm/yyyy" />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Giới tính</label>
                    <select
                      value={formData.gioi_tinh}
                      onChange={e => setFormData({ ...formData, gioi_tinh: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <FormInput label="Nơi sinh" value={formData.noi_sinh} onChange={update('noi_sinh')} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <FormInput label="Dân tộc"         value={formData.dan_toc}        onChange={update('dan_toc')}        placeholder="Kinh" />
                  <FormInput label="Quốc tịch"        value={formData.quoc_tich}      onChange={update('quoc_tich')}      placeholder="Việt Nam" />
                  <FormInput label="Đơn vị công tác" value={formData.don_vi_cong_tac} onChange={update('don_vi_cong_tac')} />
                </div>
              </section>

              {/* Contact section */}
              <section>
                <SectionHeader color="blue">Liên hệ &amp; Cư trú</SectionHeader>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Số điện thoại" value={formData.sdt}   onChange={update('sdt')}   type="tel" />
                  <FormInput label="Email"          value={formData.email} onChange={update('email')} type="email" />
                </div>
                <div className="mt-3">
                  <FormInput label="Địa chỉ hiện tại" value={formData.dia_chi} onChange={update('dia_chi')} />
                </div>
              </section>

              {/* Identity docs section */}
              <section>
                <SectionHeader color="amber">Giấy tờ tùy thân</SectionHeader>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Số CCCD/CMND" value={formData.cccd}        onChange={update('cccd')}        disabled={isEdit} required />
                  <FormInput label="Ngày cấp CCCD" value={formData.ngay_cap_cccd} onChange={update('ngay_cap_cccd')} placeholder="dd/mm/yyyy" />
                </div>
                {!isEdit && (
                  <div className="mt-3">
                    <FormInput label="Mật khẩu" value={formData.password} onChange={update('password')} type="password" required />
                  </div>
                )}
              </section>
            </div>

            {/* Right: photo preview panel */}
            <div className="bg-slate-50 border-l border-slate-200 p-6">
              <SectionHeader color="purple">Ảnh hồ sơ</SectionHeader>

              {/* 3x4 photo */}
              <div className="mb-5">
                <p className="text-xs text-slate-400 font-medium mb-2">Ảnh thẻ 3x4</p>
                <div className="w-full h-40 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden">
                  {selectedStudent?.image_3x4
                    ? <img src={getImageUrl(selectedStudent.image_3x4)} alt="Ảnh 3x4" className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center text-slate-300 text-xs"><User size={32} className="opacity-50 mb-1.5" /><span>Chưa có ảnh</span></div>
                  }
                </div>
              </div>

              {/* CCCD images */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium text-center mb-1.5">CCCD Mặt trước</p>
                  <div className="h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                    {selectedStudent?.image_cccd_front
                      ? <img src={getImageUrl(selectedStudent.image_cccd_front)} alt="CCCD Front" className="w-full h-full object-cover" />
                      : <CreditCard size={20} className="text-slate-300" />
                    }
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium text-center mb-1.5">CCCD Mặt sau</p>
                  <div className="h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                    {selectedStudent?.image_cccd_back
                      ? <img src={getImageUrl(selectedStudent.image_cccd_back)} alt="CCCD Back" className="w-full h-full object-cover" />
                      : <CreditCard size={20} className="text-slate-300" />
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm"
            >
              <BookOpen size={15} />
              {isEdit ? 'Lưu thay đổi' : 'Thêm học viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
