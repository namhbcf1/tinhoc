import { useState } from 'react';
import { X, BookOpen, User, CreditCard, AlertCircle } from 'lucide-react';
import BirthPlaceField from '../../../../components/forms/BirthPlaceField';

// ── Validation helpers ──────────────────────────────────────────────────────────
const VALIDATORS = {
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email không hợp lệ',
  phone: (v) => !v || /^(0|\+84)\d{9}$/.test(v.replace(/\s/g, '')) ? '' : 'SĐT không hợp lệ',
  cccd:  (v) => !v || /^\d{9,12}$/.test(v) ? '' : 'CCCD 9-12 chữ số',
  password: (v) => !v || v.length >= 8 ? '' : 'Tối thiểu 8 ký tự',
  required: (v, label) => (v && v.trim()) ? '' : `Bắt buộc`,
};

// Tailwind-styled input field with error
function FormInput({ label, value, onChange, type = 'text', placeholder = '', required = false, disabled = false, error = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        aria-label={label}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all duration-150
          focus:ring-2 focus:border-emerald-400 ${error ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-emerald-400'}
          ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-800 hover:border-slate-300'}`}
      />
      {error && (
        <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium">
          <AlertCircle size={12} /> {error}
        </p>
      )}
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
  const [errors, setErrors] = useState({});

  const update = (field) => (val) => {
    setFormData({ ...formData, [field]: val });
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    // Required
    errs.ho = VALIDATORS.required(formData.ho, 'Họ');
    errs.ten = VALIDATORS.required(formData.ten, 'Tên');
    if (!isEdit) {
      errs.cccd = VALIDATORS.required(formData.cccd, 'CCCD') || VALIDATORS.cccd(formData.cccd);
      errs.password = VALIDATORS.required(formData.password, 'Mật khẩu') || VALIDATORS.password(formData.password);
    }

    // Optional format checks
    if (formData.email) errs.email = VALIDATORS.email(formData.email);
    if (formData.sdt) errs.sdt = VALIDATORS.phone(formData.sdt);
    if (isEdit && formData.cccd) errs.cccd = VALIDATORS.cccd(formData.cccd);

    // Remove empty errors
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(errs)) {
      if (v) filtered[k] = v;
    }
    setErrors(filtered);
    return Object.keys(filtered).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(e);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-content large"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 1120, background: 'white', borderRadius: 24, padding: 0, overflow: 'hidden' }}
      >
        {/* Emerald gradient header */}
        <div className="flex items-center justify-between px-7 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500">
          <div>
            <h2 className="text-lg font-bold text-white m-0">
              {isEdit ? 'Sửa học viên' : 'Thêm học viên'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Validation summary */}
        {Object.keys(errors).length > 0 && (
          <div className="mx-7 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">Kiểm tra {Object.keys(errors).length} trường</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid xl:grid-cols-[minmax(0,1fr)_300px]">

            {/* Left: form sections */}
            <div className="p-7 space-y-6">

              {/* Personal info section */}
              <section>
                <SectionHeader color="green">Thông tin cá nhân</SectionHeader>
                <div className="grid gap-3 md:grid-cols-3">
                  <FormInput label="Họ"    value={formData.ho}      onChange={update('ho')}      required error={errors.ho} />
                  <FormInput label="Tên đệm" value={formData.ten_dem} onChange={update('ten_dem')} />
                  <FormInput label="Tên"   value={formData.ten}     onChange={update('ten')}     required error={errors.ten} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                  <BirthPlaceField
                    label="Nơi sinh"
                    value={formData.noi_sinh}
                    onChange={update('noi_sinh')}
                    hint="Trong nước chọn theo danh sách 34 tỉnh/thành."
                    wrapperClassName="space-y-1"
                    labelClassName="block text-xs font-medium text-slate-500"
                    toggleWrapperClassName=""
                    radioGroupClassName="flex flex-wrap gap-4"
                    radioOptionClassName="inline-flex items-center gap-2 text-sm text-slate-700"
                    inputClassName="w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all duration-150 border-slate-200 focus:ring-2 focus:border-emerald-400 focus:ring-emerald-400 bg-white text-slate-800 hover:border-slate-300"
                    selectClassName="w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all duration-150 border-slate-200 focus:ring-2 focus:border-emerald-400 focus:ring-emerald-400 bg-white text-slate-800 hover:border-slate-300"
                    hintClassName="text-xs text-slate-500"
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <FormInput label="Dân tộc"         value={formData.dan_toc}        onChange={update('dan_toc')}        placeholder="Kinh" />
                  <FormInput label="Quốc tịch"        value={formData.quoc_tich}      onChange={update('quoc_tich')}      placeholder="Việt Nam" />
                  <FormInput label="Đơn vị công tác" value={formData.don_vi_cong_tac} onChange={update('don_vi_cong_tac')} />
                </div>
              </section>

              {/* Contact section */}
              <section>
                <SectionHeader color="blue">Liên hệ &amp; Cư trú</SectionHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormInput label="Số điện thoại" value={formData.sdt}   onChange={update('sdt')}   type="tel" error={errors.sdt} />
                  <FormInput label="Email"          value={formData.email} onChange={update('email')} type="email" error={errors.email} />
                </div>
                <div className="mt-3">
                  <FormInput label="Địa chỉ hiện tại" value={formData.dia_chi} onChange={update('dia_chi')} />
                </div>
              </section>

              {/* Identity docs section */}
              <section>
                <SectionHeader color="amber">Giấy tờ tùy thân</SectionHeader>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormInput label="Số CCCD/CMND" value={formData.cccd}        onChange={update('cccd')}        disabled={isEdit} required error={errors.cccd} />
                  <FormInput label="Ngày cấp CCCD" value={formData.ngay_cap_cccd} onChange={update('ngay_cap_cccd')} placeholder="dd/mm/yyyy" />
                </div>
                {!isEdit && (
                  <div className="mt-3">
                    <FormInput label="Mật khẩu" value={formData.password} onChange={update('password')} type="password" required error={errors.password} />
                    {formData.password && formData.password.length >= 8 && (
                      <p className="mt-1 text-xs text-emerald-600 font-medium">Mật khẩu đủ mạnh</p>
                    )}
                    {formData.password && formData.password.length > 0 && formData.password.length < 8 && (
                      <div className="mt-1.5">
                        <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-red-400"
                            style={{ width: `${Math.min((formData.password.length / 8) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Right: photo preview panel */}
            <div className="border-l border-slate-200 bg-slate-50 p-6 xl:min-h-full">
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
