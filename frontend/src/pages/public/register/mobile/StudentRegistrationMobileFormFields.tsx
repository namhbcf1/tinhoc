import BirthPlaceField from '../../../../components/forms/BirthPlaceField';
import type { StudentRegistrationFormFieldsProps } from '../shared/student-registration-types';

export default function StudentRegistrationMobileFormFields({
  register,
  errors,
  fieldErrorId,
  fieldHintId,
  getFieldA11y,
  watchedBirthPlace,
  setValue,
}: StudentRegistrationFormFieldsProps) {
  return (
    <>
      {/* Họ / Tên đệm / Tên */}
      <div className="form-row-3">
        <div className="form-field">
    <label>1a. Họ <span className="required">*</span></label>
    <input
      id="ho"
      type="text"
      {...register('ho')}
      {...getFieldA11y('ho')}
      autoComplete="family-name"
      className={`form-input ${errors.ho ? 'error' : ''}`}
      placeholder="VÍ DỤ: NGUYỄN"
    />
    {errors.ho && <p id={fieldErrorId('ho')} className="error-text">{errors.ho.message}</p>}
        </div>
        <div className="form-field">
    <label htmlFor="ten_dem">1b. Tên đệm</label>
    <input
      id="ten_dem"
      type="text"
      {...register('ten_dem')}
      autoComplete="additional-name"
      className="form-input"
      placeholder="VÍ DỤ: VĂN"
    />
        </div>
        <div className="form-field">
    <label htmlFor="ten">1c. Tên <span className="required">*</span></label>
    <input
      id="ten"
      type="text"
      {...register('ten')}
      {...getFieldA11y('ten')}
      autoComplete="given-name"
      className={`form-input ${errors.ten ? 'error' : ''}`}
      placeholder="VÍ DỤ: A"
    />
    {errors.ten && <p id={fieldErrorId('ten')} className="error-text">{errors.ten.message}</p>}
        </div>
      </div>
      <p className="form-hint" style={{ marginTop: '-12px', marginBottom: '16px' }}>
        Ví dụ: Họ: NGUYỄN | Tên đệm: VĂN | Tên: A → Họ tên đầy đủ: NGUYỄN VĂN A
      </p>

      {/* Ngày sinh + Giới tính */}
      <div className="form-row-2">
        <div className="form-field">
    <label>2. Ngày sinh (DD/MM/YYYY) <span className="required">*</span></label>
    <div className="date-selects">
      <select id="ngay" {...register('ngay')} aria-invalid={errors.ngay ? 'true' : 'false'} aria-describedby={(errors.ngay || errors.thang || errors.nam) ? fieldErrorId('ngay') : undefined} className={`form-input date-select ${errors.ngay ? 'error' : ''}`}>
        <option value="">Ngày</option>
        {[...Array(31)].map((_, i) => (
          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
      {String(i + 1).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select id="thang" {...register('thang')} aria-invalid={errors.thang ? 'true' : 'false'} aria-describedby={(errors.ngay || errors.thang || errors.nam) ? fieldErrorId('ngay') : undefined} className={`form-input date-select ${errors.thang ? 'error' : ''}`}>
        <option value="">Tháng</option>
        {[...Array(12)].map((_, i) => (
          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
      {String(i + 1).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select id="nam" {...register('nam')} aria-invalid={errors.nam ? 'true' : 'false'} aria-describedby={(errors.ngay || errors.thang || errors.nam) ? fieldErrorId('ngay') : undefined} className={`form-input date-select ${errors.nam ? 'error' : ''}`}>
        <option value="">Năm</option>
        {[...Array(80)].map((_, i) => {
          const year = new Date().getFullYear() - i;
          return <option key={year} value={year}>{year}</option>;
        })}
      </select>
    </div>
    {(errors.ngay || errors.thang || errors.nam) && (
      <p id={fieldErrorId('ngay')} className="error-text">Vui lòng chọn đầy đủ ngày sinh</p>
    )}
        </div>
        <div className="form-field">
    <label>3. Giới tính <span className="required">*</span></label>
    <div className="radio-group">
      <label className="radio-option">
        <input type="radio" value="Nam" {...register('gioi_tinh')} aria-invalid={errors.gioi_tinh ? 'true' : 'false'} aria-describedby={errors.gioi_tinh ? fieldErrorId('gioi_tinh') : undefined} />
        <span>NAM</span>
      </label>
      <label className="radio-option">
        <input type="radio" value="Nữ" {...register('gioi_tinh')} aria-invalid={errors.gioi_tinh ? 'true' : 'false'} aria-describedby={errors.gioi_tinh ? fieldErrorId('gioi_tinh') : undefined} />
        <span>NỮ</span>
      </label>
    </div>
    {errors.gioi_tinh && (
      <p id={fieldErrorId('gioi_tinh')} className="error-text">{errors.gioi_tinh.message}</p>
    )}
        </div>
      </div>

      {/* CCCD + Ngày cấp */}
      <div className="form-row-2">
        <div className="form-field">
    <label htmlFor="cccd">4a. Số CCCD <span className="required">*</span></label>
    <input
      id="cccd"
      type="text"
      {...register('cccd')}
      {...getFieldA11y('cccd')}
      inputMode="numeric"
      autoComplete="off"
      maxLength={12}
      pattern="[0-9]*"
      className={`form-input ${errors.cccd ? 'error' : ''}`}
      placeholder="Nhp s CCCD"
    />
    {errors.cccd && <p id={fieldErrorId('cccd')} className="error-text">{errors.cccd.message}</p>}
        </div>
        <div className="form-field">
    <label>4b. Ngày cấp CCCD <span className="required">*</span></label>
    <div className="date-selects">
      <select id="ngay_cap_ngay" {...register('ngay_cap_ngay')} aria-invalid={errors.ngay_cap_ngay ? 'true' : 'false'} aria-describedby={(errors.ngay_cap_ngay || errors.ngay_cap_thang || errors.ngay_cap_nam) ? fieldErrorId('ngay_cap_ngay') : undefined} className={`form-input date-select ${errors.ngay_cap_ngay ? 'error' : ''}`}>
        <option value="">Ngày</option>
        {[...Array(31)].map((_, i) => (
          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
      {String(i + 1).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select id="ngay_cap_thang" {...register('ngay_cap_thang')} aria-invalid={errors.ngay_cap_thang ? 'true' : 'false'} aria-describedby={(errors.ngay_cap_ngay || errors.ngay_cap_thang || errors.ngay_cap_nam) ? fieldErrorId('ngay_cap_ngay') : undefined} className={`form-input date-select ${errors.ngay_cap_thang ? 'error' : ''}`}>
        <option value="">Tháng</option>
        {[...Array(12)].map((_, i) => (
          <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
      {String(i + 1).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select id="ngay_cap_nam" {...register('ngay_cap_nam')} aria-invalid={errors.ngay_cap_nam ? 'true' : 'false'} aria-describedby={(errors.ngay_cap_ngay || errors.ngay_cap_thang || errors.ngay_cap_nam) ? fieldErrorId('ngay_cap_ngay') : undefined} className={`form-input date-select ${errors.ngay_cap_nam ? 'error' : ''}`}>
        <option value="">Năm</option>
        {[...Array(50)].map((_, i) => {
          const year = new Date().getFullYear() - i;
          return <option key={year} value={year}>{year}</option>;
        })}
      </select>
    </div>
    {(errors.ngay_cap_ngay || errors.ngay_cap_thang || errors.ngay_cap_nam) && (
      <p id={fieldErrorId('ngay_cap_ngay')} className="error-text">Vui lòng chọn ngày cấp</p>
    )}
        </div>
      </div>

      {/* Dân tộc + Số điện thoại */}
      <div className="form-row-2">
        <div className="form-field">
    <label htmlFor="dan_toc">5. Dân tộc <span className="required">*</span></label>
    <input
      id="dan_toc"
      type="text"
      {...register('dan_toc')}
      {...getFieldA11y('dan_toc')}
      autoComplete="off"
      className="form-input"
      defaultValue="Kinh"
    />
    {errors.dan_toc && <p id={fieldErrorId('dan_toc')} className="error-text">{errors.dan_toc.message}</p>}
        </div>
        <div className="form-field">
    <label htmlFor="sdt">6. Số điện thoại <span className="required">*</span></label>
    <input
      id="sdt"
      type="tel"
      {...register('sdt')}
      {...getFieldA11y('sdt')}
      inputMode="tel"
      autoComplete="tel-national"
      maxLength={12}
      className={`form-input ${errors.sdt ? 'error' : ''}`}
      placeholder="09xxxxxxxx"
    />
    {errors.sdt && <p id={fieldErrorId('sdt')} className="error-text">{errors.sdt.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="form-field full-width">
        <label htmlFor="email">7. Email <span className="required">*</span></label>
        <input
    id="email"
    type="email"
    {...register('email')}
    {...getFieldA11y('email')}
    autoComplete="email"
    className={`form-input ${errors.email ? 'error' : ''}`}
    placeholder="email@example.com"
        />
        {errors.email && <p id={fieldErrorId('email')} className="error-text">{errors.email.message}</p>}
      </div>

      {/* Nơi sinh */}
      <div className="form-field full-width">
        <input type="hidden" {...register('noi_sinh')} />
        <BirthPlaceField
    label="8. Nơi sinh (Tỉnh/Thành phố)"
    fieldId="noi_sinh_field"
    hintId={fieldHintId('noi_sinh')}
    errorId={fieldErrorId('noi_sinh')}
    required
    value={watchedBirthPlace}
    onChange={(nextValue) => setValue('noi_sinh', nextValue, { shouldValidate: true, shouldDirty: true })}
    hint="Ghi chú: Ghi theo VNeID cấp độ 2"
    error={errors.noi_sinh?.message}
    wrapperClassName=""
    labelClassName="block text-sm font-medium text-slate-700"
    toggleWrapperClassName="noi-sinh-row"
    radioGroupClassName="radio-group-inline"
    radioOptionClassName="radio-option"
    domesticTextClassName="text-red"
    foreignTextClassName=""
    inputClassName={`form-input ${errors.noi_sinh ? 'error' : ''}`}
    selectClassName={`form-input ${errors.noi_sinh ? 'error' : ''}`}
    hintClassName="form-hint"
    errorClassName="error-text"
    selectPlaceholder="Vui lòng chọn tỉnh/thành phố"
    inputPlaceholder="Vui lòng nhập nơi sinh ở nước ngoài"
        />
      </div>

      {/* Đơn vị công tác */}
      <div className="form-field full-width">
    <label htmlFor="workplace">9. Đơn vị công tác/trường học <span className="required">*</span></label>
    <input
      id="workplace"
      type="text"
      {...register('workplace')}
      {...getFieldA11y('workplace')}
      autoComplete="organization"
      className={`form-input ${errors.workplace ? 'error' : ''}`}
      placeholder="Ví dụ: Sinh viên trường Đại học Công nghiệp"
    />
    {errors.workplace && <p id={fieldErrorId('workplace')} className="error-text">{errors.workplace.message}</p>}
        </div>

      <div className="form-field full-width">
    <label htmlFor="nganh_dang_hoc">10. Khoa/ngành đang theo học <span className="required">*</span></label>
    <input
      id="nganh_dang_hoc"
      type="text"
      {...register('nganh_dang_hoc')}
      {...getFieldA11y('nganh_dang_hoc')}
      autoComplete="organization-title"
      className={`form-input ${errors.nganh_dang_hoc ? 'error' : ''}`}
      placeholder="Ví dụ: Khoa Công nghệ thông tin / Ngành Kế toán"
    />
    {errors.nganh_dang_hoc && <p id={fieldErrorId('nganh_dang_hoc')} className="error-text">{errors.nganh_dang_hoc.message}</p>}
        </div>

      {/* Địa chỉ */}
      <div className="form-field full-width">
    <label htmlFor="dia_chi_hien_nay">11. Địa chỉ hiện nay (nơi nhận bằng) <span className="required">*</span></label>
    <input
      id="dia_chi_hien_nay"
      type="text"
      {...register('dia_chi_hien_nay')}
      {...getFieldA11y('dia_chi_hien_nay')}
      aria-describedby={[fieldHintId('dia_chi_hien_nay'), errors.dia_chi_hien_nay ? fieldErrorId('dia_chi_hien_nay') : ''].filter(Boolean).join(' ') || undefined}
      autoComplete="street-address"
      className={`form-input ${errors.dia_chi_hien_nay ? 'error' : ''}`}
      placeholder="Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh/TP..."
    />
    <p id={fieldHintId('dia_chi_hien_nay')} className="form-hint">Ghi theo địa chỉ mới sau sáp nhập</p>
    {errors.dia_chi_hien_nay && <p id={fieldErrorId('dia_chi_hien_nay')} className="error-text">{errors.dia_chi_hien_nay.message}</p>}
        </div>


    </>
  );
}



