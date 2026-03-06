import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2, Printer, CheckCircle2, AlertCircle, Upload,
  User, Camera, Info
} from 'lucide-react';
import CCCDUploader from '../../components/upload/CCCDUploader';
import api from '../../services/api';
import '../../styles/public/RegistrationFormA4.css';

const registrationSchema = z.object({
  ho: z.string().min(1, 'Vui lòng nhập họ'),
  ten_dem: z.string().optional(),
  ten: z.string().min(1, 'Vui lòng nhập tên'),
  ngay: z.string().min(1, 'Vui lòng chọn ngày'),
  thang: z.string().min(1, 'Vui lòng chọn tháng'),
  nam: z.string().min(1, 'Vui lòng chọn năm'),
  cccd: z.string().min(9, 'CCCD/CMND tối thiểu 9 số').max(12, 'CCCD/CMND tối đa 12 số'),
  ngay_cap_ngay: z.string().min(1, 'Vui lòng chọn ngày cấp'),
  ngay_cap_thang: z.string().min(1, 'Vui lòng chọn tháng cấp'),
  ngay_cap_nam: z.string().min(1, 'Vui lòng chọn năm cấp'),
  dan_toc: z.string().min(1, 'Vui lòng nhập dân tộc'),
  noi_sinh: z.string().min(1, 'Vui lòng nhập nơi sinh'),
  gioi_tinh: z.enum(['Nam', 'Nữ']),
  sdt: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ'),
  workplace: z.string().min(1, 'Vui lòng nhập đơn vị công tác'),
  dia_chi_hien_nay: z.string().min(1, 'Vui lòng nhập địa chỉ hiện tại'),
  commit_accuracy: z.boolean().refine(v => v === true, 'Bạn cần cam đoan thông tin là đúng'),
  commit_usage: z.boolean().refine(v => v === true, 'Bạn cần đồng ý sử dụng dữ liệu'),
});

// ---- InstructionModal for upload guidance ----
function InstructionModal({ type, onClose }) {
  if (!type) return null;

  const content = {
    cccd_front: {
      title: 'QUY ĐỊNH VỀ ẢNH mặt trước CMND/CCCD/Hộ chiếu',
      rules: [
        '1. Ảnh mặt trước của CMND/CCCD',
        '2. Upload Ảnh mặt trước của CMND/CCCD hoặc ảnh Hộ chiếu theo đúng số đã nhập tại mục số 3 trong Phiếu đăng ký;',
        '3. Đảm bảo giấy tờ chụp đủ thông tin;',
        '4. Ảnh chụp rõ nét, không bị mờ lóa;',
        '5. Ảnh chụp không bị xoay, không bị mất góc (xoay hình ngang).',
      ],
      img: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_front.jpg',
    },
    cccd_back: {
      title: 'QUY ĐỊNH VỀ ẢNH mặt sau CMND/CCCD',
      rules: [
        '1. Ảnh mặt sau của CMND/CCCD',
        '2. Nếu sử dụng Hộ chiếu trong mục số 3 không cần tải ảnh mục này;',
        '3. Đảm bảo giấy tờ chụp đủ thông tin;',
        '4. Ảnh chụp rõ nét, không bị mờ lóa;',
        '5. Ảnh chụp không bị xoay, không bị mất góc (xoay hình ngang).',
      ],
      img: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/cccd_back.jpg',
    },
    photo_3x4: {
      title: 'QUY ĐỊNH VỀ ẢNH THẺ 3X4',
      rules: [
        '1. Kích thước ảnh: 3x4 cm (chuẩn Việt Nam) (xoay hình DỌC).',
        '2. Phông nền màu TRẮNG, chụp trong 6 tháng gần nhất',
        '3. Trang phục: Áo có cổ (sơ mi, vest) lịch sự',
        '4. Không đeo kính màu, tai và trán phải lộ rõ.',
      ],
      img: 'https://tec.hanu.vn/80c8302f1df48b830e40166e1f58b414/5550119/view-image/photo_3x4.jpg',
    },
  };

  const active = content[type];

  return (
    <div className="instruction-modal-overlay" onClick={onClose}>
      <div
        className="instruction-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instr-modal-title"
      >
        <div className="instruction-modal-header">
          <Info size={20} color="#f97316" />
          <h3 id="instr-modal-title">{active.title}</h3>
        </div>
        <div className="instruction-modal-body">
          <div className="instruction-image">
            <img
              src={active.img}
              alt="Hướng dẫn"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/400x250?text=Huong+Dan';
              }}
            />
          </div>
          <div className="instruction-rules">
            {active.rules.map((rule, i) => <p key={i}>{rule}</p>)}
          </div>
        </div>
        <button className="instruction-close-btn" onClick={onClose}>✓ Tôi đã hiểu</button>
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function StudentRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [noi_sinh_type, setNoiSinhType] = useState('trong_nuoc');
  const [modalType, setModalType] = useState(null);

  const [imageErrors, setImageErrors] = useState({
    cccd_front: '',
    cccd_back: '',
    photo_3x4: '',
  });

  const [imageIds, setImageIds] = useState({
    cccd_front: null,
    cccd_back: null,
    photo_3x4: null,
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      gioi_tinh: 'Nam',
      dan_toc: 'Kinh',
    },
  });

  const handleUploadSuccess = (result) => {
    setImageIds(prev => ({ ...prev, [result.type]: result.imageId }));
    setImageErrors(prev => ({ ...prev, [result.type]: '' }));
  };

  const handleUploadError = (err) => {
    console.error('Upload error:', err);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMsg('');
    setImageErrors({ cccd_front: '', cccd_back: '', photo_3x4: '' });

    const newImageErrors = {
      cccd_front: !imageIds.cccd_front ? 'Vui lòng tải lên ảnh CCCD mặt trước' : '',
      cccd_back: !imageIds.cccd_back ? 'Vui lòng tải lên ảnh CCCD mặt sau' : '',
      photo_3x4: !imageIds.photo_3x4 ? 'Vui lòng tải lên ảnh thẻ 3x4' : '',
    };

    const hasImageErrors = Object.values(newImageErrors).some(err => err !== '');
    if (hasImageErrors) {
      setImageErrors(newImageErrors);
      setErrorMsg('Vui lòng tải lên đầy đủ 3 ảnh: CCCD mặt trước, CCCD mặt sau và ảnh thẻ 3x4');
      setLoading(false);
      return;
    }

    try {
      const apiData = {
        cccd: data.cccd,
        ho: data.ho,
        ten_dem: data.ten_dem || '',
        ten: data.ten,
        ngay_sinh: `${data.nam}-${data.thang}-${data.ngay}`,
        noi_sinh: data.noi_sinh,
        gioi_tinh: data.gioi_tinh,
        email: data.email,
        sdt: data.sdt,
        dan_toc: data.dan_toc,
        ngay_cap_cccd: `${data.ngay_cap_nam}-${data.ngay_cap_thang}-${data.ngay_cap_ngay}`,
        don_vi_cong_tac: data.workplace,
        dia_chi: data.dia_chi_hien_nay,
        cccd_front_image_id: imageIds.cccd_front,
        cccd_back_image_id: imageIds.cccd_back,
        photo_3x4_image_id: imageIds.photo_3x4,
        // NOTE: 'notes' field bị bỏ — backend schema dùng .strict(), không chấp nhận field lạ
      };

      const res = await api.registerStudent(apiData);
      if (res.success) {
        setSuccessMsg('Đăng ký thành công! Thông tin của bạn đã được ghi nhận.');

        // Backend trả về { success: true, token, student_id, data: { id, cccd, ho, ten, ho_ten_full, ... } }
        const studentPayload = res.data || {};

        // ho_ten_full fallback nếu backend chưa trả về
        const ho_ten_full = studentPayload.ho_ten_full
          || [data.ho, data.ten_dem, data.ten].filter(Boolean).join(' ');

        // Lưu đủ fields để sidebar + các trang con hiển thị ngay mà không cần fetch lại
        const sessionData = {
          ...studentPayload,
          cccd: data.cccd,
          ho: data.ho,
          ten_dem: data.ten_dem || '',
          ten: data.ten,
          ho_ten_full,
          sdt: data.sdt,
          email: data.email,
          gioi_tinh: data.gioi_tinh,
          ngay_sinh: `${data.nam}-${data.thang}-${data.ngay}`,
          registrations: studentPayload.registrations || [],
        };

        localStorage.setItem('student_cccd', data.cccd);
        localStorage.setItem('student_sdt', data.sdt);
        localStorage.setItem('student_data', JSON.stringify(sessionData));

        setTimeout(() => navigate('/dashboard/exams'), 2000);
      }
    } catch (error) {
      setErrorMsg(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="a4-registration-page">
      <div className="a4-form-wrapper">

        {/* Header */}
        <div className="a4-header">
          <div className="header-left">
            <p className="org-label">HỆ THỐNG GIÁO DỤC</p>
            <p className="org-name">CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG</p>
          </div>
          <div className="header-right">
            <p className="brand-name">VAN TRANG EDUCATION</p>
            <p className="brand-subtitle">PROFESSIONAL COMMUNITY SUPPORT</p>
          </div>
        </div>

        <div className="a4-title">
          <h1>PHIẾU ĐĂNG KÝ DỰ THI</h1>
          <p className="a4-subtitle">Hệ thống thu thập hồ sơ và quản lý học viên trực tuyến</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ===== SECTION I: THÔNG TIN CÁ NHÂN ===== */}
          <div className="a4-section">
            <div className="section-header-row">
              <div className="section-icon"><User size={18} /></div>
              <h2>I. THÔNG TIN CÁ NHÂN</h2>
            </div>

            {/* Họ / Tên đệm / Tên */}
            <div className="form-row-3">
              <div className="form-field">
                <label>1a. Họ <span className="required">*</span></label>
                <input
                  type="text"
                  {...register('ho')}
                  className={`form-input ${errors.ho ? 'error' : ''}`}
                  placeholder="VÍ DỤ: NGUYỄN"
                />
                {errors.ho && <p className="error-text">{errors.ho.message}</p>}
              </div>
              <div className="form-field">
                <label>1b. Tên đệm</label>
                <input
                  type="text"
                  {...register('ten_dem')}
                  className="form-input"
                  placeholder="VÍ DỤ: VĂN"
                />
              </div>
              <div className="form-field">
                <label>1c. Tên <span className="required">*</span></label>
                <input
                  type="text"
                  {...register('ten')}
                  className={`form-input ${errors.ten ? 'error' : ''}`}
                  placeholder="VÍ DỤ: A"
                />
                {errors.ten && <p className="error-text">{errors.ten.message}</p>}
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
                  <select {...register('ngay')} className={`form-input date-select ${errors.ngay ? 'error' : ''}`}>
                    <option value="">Ngày</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <select {...register('thang')} className={`form-input date-select ${errors.thang ? 'error' : ''}`}>
                    <option value="">Tháng</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <select {...register('nam')} className={`form-input date-select ${errors.nam ? 'error' : ''}`}>
                    <option value="">Năm</option>
                    {[...Array(80)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                {(errors.ngay || errors.thang || errors.nam) && (
                  <p className="error-text">Vui lòng chọn đầy đủ ngày sinh</p>
                )}
              </div>
              <div className="form-field">
                <label>3. Giới tính <span className="required">*</span></label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input type="radio" value="Nam" {...register('gioi_tinh')} />
                    <span>Nam</span>
                  </label>
                  <label className="radio-option">
                    <input type="radio" value="Nữ" {...register('gioi_tinh')} />
                    <span>Nữ</span>
                  </label>
                </div>
              </div>
            </div>

            {/* CCCD + Ngày cấp */}
            <div className="form-row-2">
              <div className="form-field">
                <label>4a. CCCD/Hộ chiếu <span className="required">*</span></label>
                <input
                  type="text"
                  {...register('cccd')}
                  className={`form-input ${errors.cccd ? 'error' : ''}`}
                  placeholder="Nhập số CCCD"
                />
                {errors.cccd && <p className="error-text">{errors.cccd.message}</p>}
              </div>
              <div className="form-field">
                <label>4b. Ngày cấp CCCD <span className="required">*</span></label>
                <div className="date-selects">
                  <select {...register('ngay_cap_ngay')} className={`form-input date-select ${errors.ngay_cap_ngay ? 'error' : ''}`}>
                    <option value="">Ngày</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <select {...register('ngay_cap_thang')} className={`form-input date-select ${errors.ngay_cap_thang ? 'error' : ''}`}>
                    <option value="">Tháng</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <select {...register('ngay_cap_nam')} className={`form-input date-select ${errors.ngay_cap_nam ? 'error' : ''}`}>
                    <option value="">Năm</option>
                    {[...Array(50)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
                {(errors.ngay_cap_ngay || errors.ngay_cap_thang || errors.ngay_cap_nam) && (
                  <p className="error-text">Vui lòng chọn ngày cấp</p>
                )}
              </div>
            </div>

            {/* Dân tộc + SĐT */}
            <div className="form-row-2">
              <div className="form-field">
                <label>5. Dân tộc <span className="required">*</span></label>
                <input
                  type="text"
                  {...register('dan_toc')}
                  className="form-input"
                  defaultValue="Kinh"
                />
                {errors.dan_toc && <p className="error-text">{errors.dan_toc.message}</p>}
              </div>
              <div className="form-field">
                <label>6. Số điện thoại <span className="required">*</span></label>
                <input
                  type="text"
                  {...register('sdt')}
                  className={`form-input ${errors.sdt ? 'error' : ''}`}
                  placeholder="09xxxxxxxx"
                />
                {errors.sdt && <p className="error-text">{errors.sdt.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div className="form-field full-width">
              <label>7. Email <span className="required">*</span></label>
              <input
                type="email"
                {...register('email')}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="email@example.com"
              />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            {/* Nơi sinh */}
            <div className="form-field full-width">
              <label>8. Nơi sinh (Tỉnh/Thành phố) <span className="required">*</span></label>
              <div className="noi-sinh-row">
                <div className="radio-group-inline">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="noi_sinh_type"
                      value="trong_nuoc"
                      checked={noi_sinh_type === 'trong_nuoc'}
                      onChange={() => setNoiSinhType('trong_nuoc')}
                    />
                    <span className="text-red">Trong nước</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="noi_sinh_type"
                      value="nuoc_ngoai"
                      checked={noi_sinh_type === 'nuoc_ngoai'}
                      onChange={() => setNoiSinhType('nuoc_ngoai')}
                    />
                    <span>Nước ngoài</span>
                  </label>
                </div>
              </div>
              <input
                type="text"
                {...register('noi_sinh')}
                className={`form-input ${errors.noi_sinh ? 'error' : ''}`}
                placeholder="Vui lòng nhập tỉnh/thành phố"
              />
              <p className="form-hint">Ghi chú: Ghi theo VNeID cấp độ 2</p>
              {errors.noi_sinh && <p className="error-text">{errors.noi_sinh.message}</p>}
            </div>

            {/* Đơn vị công tác */}
            <div className="form-field full-width">
              <label>9. Đơn vị công tác/trường học <span className="required">*</span></label>
              <input
                type="text"
                {...register('workplace')}
                className={`form-input ${errors.workplace ? 'error' : ''}`}
                placeholder="Ví dụ: Sinh viên trường Đại học Công nghiệp"
              />
              {errors.workplace && <p className="error-text">{errors.workplace.message}</p>}
            </div>

            {/* Địa chỉ */}
            <div className="form-field full-width">
              <label>10. Địa chỉ hiện nay <span className="required">*</span></label>
              <input
                type="text"
                {...register('dia_chi_hien_nay')}
                className={`form-input ${errors.dia_chi_hien_nay ? 'error' : ''}`}
                placeholder="Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh/TP..."
              />
              <p className="form-hint">Ghi theo địa chỉ mới sau sáp nhập</p>
              {errors.dia_chi_hien_nay && <p className="error-text">{errors.dia_chi_hien_nay.message}</p>}
            </div>
          </div>

          {/* ===== SECTION II: UPLOAD ẢNH ===== */}
          <div className="a4-section upload-section">
            <div className="upload-grid">
              <div className="upload-card">
                <p className="upload-label">Ảnh mặt TRƯỚC thẻ CCCD - Ảnh Hộ chiếu <span className="required">*</span></p>
                <CCCDUploader
                  type="cccd_front"
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
                {imageErrors.cccd_front && <p className="upload-error-text">{imageErrors.cccd_front}</p>}
                <button type="button" className="view-rules-btn" onClick={() => setModalType('cccd_front')}>
                  Xem quy định
                </button>
              </div>

              <div className="upload-card">
                <p className="upload-label">Ảnh mặt SAU thẻ CCCD - Ảnh Hộ chiếu <span className="required">*</span></p>
                <CCCDUploader
                  type="cccd_back"
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
                {imageErrors.cccd_back && <p className="upload-error-text">{imageErrors.cccd_back}</p>}
                <button type="button" className="view-rules-btn" onClick={() => setModalType('cccd_back')}>
                  Xem quy định
                </button>
              </div>

              <div className="upload-card">
                <p className="upload-label">Ảnh thẻ 3x4 (Bản mềm lưu hồ sơ) <span className="required">*</span></p>
                <CCCDUploader
                  type="photo_3x4"
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
                {imageErrors.photo_3x4 && <p className="upload-error-text">{imageErrors.photo_3x4}</p>}
                <button type="button" className="view-rules-btn" onClick={() => setModalType('photo_3x4')}>
                  Xem quy định
                </button>
              </div>
            </div>
          </div>

          {/* ===== CAM KẾT ===== */}
          <div className="a4-section commitments-section">
            <label className="checkbox-row">
              <input type="checkbox" {...register('commit_accuracy')} />
              <span>Tôi cam đoan và hoàn toàn chịu trách nhiệm về sự chính xác của ảnh và thông tin đã cung cấp trong Phiếu đăng ký dự thi.</span>
            </label>
            {errors.commit_accuracy && <p className="error-text ml-6">{errors.commit_accuracy.message}</p>}

            <label className="checkbox-row">
              <input type="checkbox" {...register('commit_usage')} />
              <span>Tôi đồng ý việc VAN TRANG EDU sử dụng các thông tin cá nhân này vào mục đích phục vụ các công tác liên quan đến kỳ thi.</span>
            </label>
            {errors.commit_usage && <p className="error-text ml-6">{errors.commit_usage.message}</p>}
          </div>

          {/* ===== GHI CHÚ ===== */}
          <div className="a4-section notes-section">
            <p className="notes-title">Ghi chú:</p>
            <p className="note-item">
              <em>Thí sinh chỉ đủ điều kiện dự thi khi đã điền đầy đủ thông tin trên Phiếu đăng ký dự thi và chuyển khoản Phí dịch vụ thành công.</em>
            </p>
          </div>

          {/* Error / Success messages */}
          {errorMsg && (
            <div className="message-box error-box" role="alert">
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="message-box success-box" role="status">
              <CheckCircle2 size={20} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit */}
          <div className="submit-container">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <><Loader2 className="animate-spin mr-2" /> Đang gửi...</>
              ) : (
                'Hoàn tất đăng ký'
              )}
            </button>
          </div>

          <div className="back-link">
            <Link to="/login"><Info size={14} /> Quay lại Đăng nhập</Link>
          </div>
        </form>
      </div>

      {/* Instruction modal for upload guidance */}
      <InstructionModal type={modalType} onClose={() => setModalType(null)} />
    </div>
  );
}
