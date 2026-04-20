import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, AlertCircle } from 'lucide-react';
import BirthPlaceField from '../../../../components/forms/BirthPlaceField';
import { useOverlayLayer, useOverlayLock } from '../../../../components/ui/overlay-lock';

const CCCDUploader = lazy(() => import('../../../../components/upload/CCCDUploader'));

const VALIDATORS = {
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email không hợp lệ',
  phone: (v) => !v || /^(0|\+84)\d{9}$/.test(v.replace(/\s/g, '')) ? '' : 'SĐT không hợp lệ',
  cccd: (v) => !v || /^\d{9,12}$/.test(v) ? '' : 'CCCD 9-12 chữ số',
  password: (v) => !v || v.length >= 8 ? '' : 'Tối thiểu 8 ký tự',
  required: (v) => (v && v.trim()) ? '' : 'Bắt buộc',
};

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
        onChange={(e) => onChange(e.target.value)}
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

function SectionCard({ title, description, color = 'green', children, className = '' }) {
  const colors = {
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  };

  return (
    <section className={`rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)] ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-5 w-1 rounded-full ${colors[color] || colors.green}`} />
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">{title}</h3>
          {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function UploaderCard({ title, children }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

export default function StudentFormModal({ isEdit, formData, setFormData, selectedStudent, getImageUrl, onSubmit, onClose }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState('');
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [activePane, setActivePane] = useState<'profile' | 'documents'>('profile');
  const overlayLayer = useOverlayLayer(true);

  useOverlayLock();

  useEffect(() => {
    setPhotoPreview(getImageUrl(selectedStudent?.image_3x4 || selectedStudent?.photo_3x4_image_id) || '');
    setFrontPreview(getImageUrl(selectedStudent?.image_cccd_front || selectedStudent?.cccd_front_image_id) || '');
    setBackPreview(getImageUrl(selectedStudent?.image_cccd_back || selectedStudent?.cccd_back_image_id) || '');
  }, [getImageUrl, selectedStudent]);

  useEffect(() => {
    setActivePane('profile');
  }, [isEdit, selectedStudent?.id]);

  const uploaderFallback = (
    <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      Đang tải trình upload...
    </div>
  );

  const update = (field) => (val) => {
    setFormData({ ...formData, [field]: val });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    errs.ho = VALIDATORS.required(formData.ho);
    errs.ten = VALIDATORS.required(formData.ten);

    if (!isEdit) {
      errs.cccd = VALIDATORS.required(formData.cccd) || VALIDATORS.cccd(formData.cccd);
      errs.password = VALIDATORS.required(formData.password) || VALIDATORS.password(formData.password);
    }

    if (formData.email) errs.email = VALIDATORS.email(formData.email);
    if (formData.sdt) errs.sdt = VALIDATORS.phone(formData.sdt);
    if (isEdit && formData.cccd) errs.cccd = VALIDATORS.cccd(formData.cccd);

    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(errs)) {
      if (value) filtered[key] = value;
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

  const handleImageUploadSuccess = (field) => (result) => {
    if (!result?.imageId) return;

    const imageIdField = field === 'front'
      ? 'cccd_front_image_id'
      : field === 'back'
        ? 'cccd_back_image_id'
        : 'photo_3x4_image_id';

    setFormData((prev) => ({ ...prev, [imageIdField]: result.imageId }));

    if (!result.imageUrl) return;

    if (field === 'front') setFrontPreview(result.imageUrl);
    if (field === 'back') setBackPreview(result.imageUrl);
    if (field === 'portrait') setPhotoPreview(result.imageUrl);
  };

  const handleImageUploadError = () => {};

  const modalContent = (
    <div className="fixed inset-0 z-[100100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6" style={{ zIndex: overlayLayer }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto flex h-[min(94vh,960px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-slate-50 shadow-[0_38px_90px_-42px_rgba(15,23,42,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
              {isEdit ? 'Cập nhật hồ sơ' : 'Tạo hồ sơ mới'}
            </p>
            <h2 className="mt-2 text-xl font-bold text-white m-0">
              {isEdit ? 'Sửa học viên' : 'Thêm học viên'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/90">
              Bố cục được chia theo từng nhóm thông tin để kiểm tra nhanh hơn và tránh bỏ sót khi cập nhật hồ sơ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white transition-all hover:bg-white/30"
          >
            <X size={18} />
          </button>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:mx-7">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700">Kiểm tra lại {Object.keys(errors).length} trường trước khi lưu.</p>
          </div>
        )}

        <div className="px-6 pt-4 sm:px-7">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActivePane('profile')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activePane === 'profile' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Hồ sơ học viên
            </button>
            <button
              type="button"
              onClick={() => setActivePane('documents')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activePane === 'documents' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Ảnh & CCCD
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-5 sm:p-6 xl:p-7">
              {activePane === 'profile' ? (
              <div className="space-y-5">
                <SectionCard
                  title="Thông tin cá nhân"
                  description="Giữ các dữ liệu nhận diện ở một cụm duy nhất để dễ quét và dễ đối chiếu khi sửa hồ sơ."
                  color="green"
                >
                  <div className="grid gap-3 md:grid-cols-3">
                  <FormInput label="Họ" value={formData.ho} onChange={update('ho')} required error={errors.ho} />
                  <FormInput label="Tên đệm" value={formData.ten_dem} onChange={update('ten_dem')} />
                  <FormInput label="Tên" value={formData.ten} onChange={update('ten')} required error={errors.ten} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FormInput label="Ngày sinh" value={formData.ngay_sinh} onChange={update('ngay_sinh')} placeholder="dd/mm/yyyy" />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Giới tính</label>
                    <select
                      value={formData.gioi_tinh}
                      onChange={(e) => setFormData({ ...formData, gioi_tinh: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <FormInput label="Đơn vị công tác" value={formData.don_vi_cong_tac} onChange={update('don_vi_cong_tac')} />
                  </div>
                  <div className="mt-3">
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
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FormInput label="Dân tộc" value={formData.dan_toc} onChange={update('dan_toc')} placeholder="Kinh" />
                  <FormInput label="Quốc tịch" value={formData.quoc_tich} onChange={update('quoc_tich')} placeholder="Việt Nam" />
                </div>
                </SectionCard>

                <SectionCard
                  title="Liên hệ & Cư trú"
                  description="Ưu tiên các thông tin liên lạc mà admin cần dùng nhiều khi hỗ trợ học viên."
                  color="blue"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                  <FormInput label="Số điện thoại" value={formData.sdt} onChange={update('sdt')} type="tel" error={errors.sdt} />
                  <FormInput label="Email" value={formData.email} onChange={update('email')} type="email" error={errors.email} />
                  </div>
                  <div className="mt-3">
                  <FormInput label="Địa chỉ hiện tại" value={formData.dia_chi} onChange={update('dia_chi')} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Giấy tờ & Tài khoản"
                  description={isEdit
                    ? 'CCCD đang khóa trong chế độ chỉnh sửa để tránh lệch dữ liệu đăng nhập và lịch sử hồ sơ.'
                    : 'Khai báo CCCD và mật khẩu ban đầu cho học viên mới.'}
                  color="amber"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                  <FormInput label="Số CCCD/CMND" value={formData.cccd} onChange={update('cccd')} disabled={isEdit} required error={errors.cccd} />
                  <FormInput label="Ngày cấp CCCD" value={formData.ngay_cap_cccd} onChange={update('ngay_cap_cccd')} placeholder="dd/mm/yyyy" />
                  </div>
                  {!isEdit && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
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
                </SectionCard>
              </div>
              ) : (
              <div className="space-y-5">
                <SectionCard
                  title="Ảnh hồ sơ"
                  description="Tách riêng khu upload để admin cập nhật giấy tờ nhanh hơn, không phải kéo qua toàn bộ form thông tin."
                  color="purple"
                  className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)]"
                >
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-6 text-blue-700">
                    Ảnh mới sẽ được lưu cùng lúc với thông tin hồ sơ khi bấm <span className="font-semibold">{isEdit ? 'Lưu thay đổi' : 'Thêm học viên'}</span>.
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    <UploaderCard title="Ảnh thẻ 3x4">
                      <Suspense fallback={uploaderFallback}>
                        <CCCDUploader
                          type="photo_3x4"
                          onUploadSuccess={handleImageUploadSuccess('portrait')}
                          onUploadError={handleImageUploadError}
                          existingImageUrl={photoPreview || null}
                        />
                      </Suspense>
                    </UploaderCard>

                  </div>
                </SectionCard>

                <SectionCard
                  title="Giấy tờ tùy thân"
                  description="Hai mặt CCCD được gom trong cùng một cụm để đối chiếu và thay ảnh nhanh hơn."
                  color="amber"
                >
                  <div className="grid gap-4 xl:grid-cols-2">
                    <UploaderCard title="CCCD mặt trước">
                      <Suspense fallback={uploaderFallback}>
                        <CCCDUploader
                          type="cccd_front"
                          onUploadSuccess={handleImageUploadSuccess('front')}
                          onUploadError={handleImageUploadError}
                          existingImageUrl={frontPreview || null}
                        />
                      </Suspense>
                    </UploaderCard>

                    <UploaderCard title="CCCD mặt sau">
                      <Suspense fallback={uploaderFallback}>
                        <CCCDUploader
                          type="cccd_back"
                          onUploadSuccess={handleImageUploadSuccess('back')}
                          onUploadError={handleImageUploadError}
                          existingImageUrl={backPreview || null}
                        />
                      </Suspense>
                    </UploaderCard>
                  </div>
                </SectionCard>
              </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:px-7">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              Hủy bỏ
            </button>
            {activePane === 'profile' ? (
              <button
                type="button"
                onClick={() => setActivePane('documents')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
              >
                Sang Ảnh & CCCD
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActivePane('profile')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
              >
                Quay lại Hồ sơ
              </button>
            )}
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

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
