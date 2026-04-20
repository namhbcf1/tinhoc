import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2, CheckCircle2, AlertCircle,
  User, Info
} from 'lucide-react';
import CCCDUploader, { type UploadStatusSnapshot } from '../../components/upload/CCCDUploader';
import api from '../../services/api';
import {
  applyOCRPrefillToRegistrationForm,
  validateCCCDBackOCRPrefill,
  validateCCCDFrontOCRPrefill,
} from './student-registration-ocr';
import '../../styles/public/RegistrationFormA4.css';
import SEO from '../../components/common/SEO';
import BirthPlaceField from '../../components/forms/BirthPlaceField';
import { normalizeBirthPlaceValue } from '../../utils/birthPlaceOptions';
import analytics from '../../utils/analytics';

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
  noi_sinh: z.string().min(1, 'Vui lòng chọn hoặc nhập nơi sinh'),
  gioi_tinh: z.enum(['Nam', 'Nữ'], {
    errorMap: () => ({ message: 'Vui lòng chọn giới tính' }),
  }),
  sdt: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ'),
  workplace: z.string().min(1, 'Vui lòng nhập đơn vị công tác'),
  dia_chi_hien_nay: z.string().min(1, 'Vui lòng nhập địa chỉ hiện tại'),
  commit_accuracy: z.boolean().refine(v => v === true, 'Bạn cần cam đoan thông tin là đúng'),
  commit_usage: z.boolean().refine(v => v === true, 'Bạn cần đồng ý sử dụng dữ liệu'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

type UploadSuccessResult = {
  imageId: string;
  processingLogId?: string;
  type: 'cccd_front' | 'cccd_back' | 'photo_3x4';
  imageUrl?: string;
};

const UPLOAD_TYPE_LABELS: Record<UploadSuccessResult['type'], string> = {
  cccd_front: 'CCCD mặt trước',
  cccd_back: 'CCCD mặt sau',
  photo_3x4: 'Ảnh thẻ 3x4 AI',
};

const createIdleUploadSnapshot = (type: UploadSuccessResult['type']): UploadStatusSnapshot => ({
  type,
  status: 'idle',
  progress: 0,
  stage: null,
  message: null,
});

// ========================================
// MAIN COMPONENT
// ========================================
export default function StudentRegistration() {
  const formStartTrackedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [ocrLoadingType, setOcrLoadingType] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [uploadRuntime, setUploadRuntime] = useState<Record<UploadSuccessResult['type'], UploadStatusSnapshot>>({
    cccd_front: createIdleUploadSnapshot('cccd_front'),
    cccd_back: createIdleUploadSnapshot('cccd_back'),
    photo_3x4: createIdleUploadSnapshot('photo_3x4'),
  });
  const [imageErrors, setImageErrors] = useState({
    cccd_front: '',
    cccd_back: '',
    photo_3x4: '',
  });

  const [imageIds, setImageIds] = useState<{
    cccd_front: string | null;
    cccd_back: string | null;
    photo_3x4: string | null;
  }>({
    cccd_front: null,
    cccd_back: null,
    photo_3x4: null,
  });
  const [uploaderKeys, setUploaderKeys] = useState({
    cccd_front: 0,
    cccd_back: 0,
    photo_3x4: 0,
  });

  const { register, handleSubmit, setFocus, setValue, getValues, watch, formState: { errors } } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      dan_toc: 'Kinh',
      noi_sinh: '',
    },
  });
  const watchedBirthPlace = watch('noi_sinh');

  useEffect(() => {
    if (!ocrLoadingType) {
      setOcrProgress(0);
      return;
    }

    setOcrProgress(18);
    const timer = window.setInterval(() => {
      setOcrProgress((current) => {
        if (current >= 96) return current;
        if (current < 48) return current + 8;
        if (current < 76) return current + 4;
        return current + 2;
      });
    }, 380);

    return () => window.clearInterval(timer);
  }, [ocrLoadingType]);

  const fieldErrorId = (field: keyof RegistrationFormData) => `${String(field)}-error`;
  const fieldHintId = (field: keyof RegistrationFormData) => `${String(field)}-hint`;
  const getFieldA11y = (field: keyof RegistrationFormData) => ({
    'aria-invalid': errors[field] ? 'true' : 'false',
    'aria-describedby': errors[field] ? fieldErrorId(field) : undefined,
  });

  const trackFormStartOnce = () => {
    if (formStartTrackedRef.current) {
      return;
    }
    formStartTrackedRef.current = true;
    analytics.formStart('student_registration');
  };

  const handleFormFocusCapture = (event: FocusEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (target.matches('input, select, textarea, button')) {
      trackFormStartOnce();
    }
  };

  const handleUploaderStatusChange = (nextState: UploadStatusSnapshot) => {
    setUploadRuntime((prev) => {
      const current = prev[nextState.type];
      if (
        current.status === nextState.status
        && current.progress === nextState.progress
        && current.stage === nextState.stage
        && current.message === nextState.message
      ) {
        return prev;
      }

      return {
        ...prev,
        [nextState.type]: nextState,
      };
    });
  };

  const processingItems = [
    ...(ocrLoadingType === 'cccd_front' || ocrLoadingType === 'cccd_back'
      ? [{
        key: `ocr-${ocrLoadingType}`,
        title: UPLOAD_TYPE_LABELS[ocrLoadingType],
        description: ocrLoadingType === 'cccd_front'
          ? 'Đang đọc số CCCD, họ tên và ngày sinh để tự điền biểu mẫu.'
          : 'Đang đọc ngày cấp từ CCCD mặt sau để hoàn thiện hồ sơ.',
        progress: Math.max(ocrProgress, 18),
      }]
      : []),
    ...(['cccd_front', 'cccd_back', 'photo_3x4'] as const).flatMap((type) => {
      const runtime = uploadRuntime[type];
      if (runtime.status !== 'uploading' && runtime.status !== 'processing') {
        return [];
      }

      const fallbackDescription = runtime.status === 'uploading'
        ? `Đang tải ${UPLOAD_TYPE_LABELS[type].toLowerCase()} lên hệ thống.`
        : type === 'photo_3x4'
          ? 'AI đang tạo các phương án ảnh 3x4 và chấm điểm để bạn chọn.'
          : 'Hệ thống đang xử lý ảnh hồ sơ.';

      return [{
        key: `upload-${type}`,
        title: UPLOAD_TYPE_LABELS[type],
        description: runtime.message || fallbackDescription,
        progress: Math.max(runtime.progress || (runtime.status === 'uploading' ? 18 : 12), 8),
      }];
    }),
  ];

  const isProcessingUploads = processingItems.length > 0;

  const handleInvalidSubmit = (invalidFields: FieldErrors<RegistrationFormData>) => {
    const fieldOrder: (keyof RegistrationFormData)[] = [
      'ho',
      'ten',
      'ngay',
      'thang',
      'nam',
      'gioi_tinh',
      'cccd',
      'ngay_cap_ngay',
      'ngay_cap_thang',
      'ngay_cap_nam',
      'dan_toc',
      'sdt',
      'email',
      'noi_sinh',
      'workplace',
      'dia_chi_hien_nay',
      'commit_accuracy',
      'commit_usage',
    ];

    const firstInvalidField = fieldOrder.find((field) => invalidFields[field]);
    setErrorMsg('Vui lòng kiểm tra lại các mục đang được đánh dấu đỏ trước khi gửi hồ sơ.');

    if (firstInvalidField) {
      analytics.formError('student_registration', String(firstInvalidField));

      if (firstInvalidField === 'noi_sinh') {
        document.querySelector('[data-testid="birth-place-field"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      setFocus(firstInvalidField);
    }
  };

  const keepUploadAndShowManualHint = (type: 'cccd_front' | 'cccd_back', message: string) => {
    setOcrError('');
    setOcrMessage(
      type === 'cccd_front'
        ? `${message} Ảnh CCCD mặt trước vẫn được giữ lại. Bạn có thể tiếp tục bằng cách nhập tay họ tên, số CCCD và ngày sinh.`
        : `${message} Ảnh CCCD mặt sau vẫn được giữ lại. Bạn hãy nhập ngày cấp thủ công nếu cần.`
    );
  };

  const runCCCDOcrPrefill = async (imageId: string, type: UploadSuccessResult['type']) => {
    if (type !== 'cccd_front' && type !== 'cccd_back') {
      return true;
    }

    setOcrError('');
    setOcrLoadingType(type);
    setOcrMessage(
      type === 'cccd_front'
        ? 'Đang đọc thông tin từ CCCD mặt trước để tự điền biểu mẫu...'
        : 'Đang đọc ngày cấp từ CCCD mặt sau...'
    );

    try {
      const response = await api.extractCCCDRegistrationFields(imageId, type);
      const payload = response?.data?.prefill;
      const hasUsefulData = response?.data?.hasUsefulData;

      if (!response?.success || !payload) {
        if (response?.warning) {
          if (type === 'cccd_back') {
            setOcrMessage('Không đọc được ngày cấp từ mặt sau. Vui lòng nhập thủ công.');
            return true;
          }

            keepUploadAndShowManualHint(type, response.warning || 'Ảnh CCCD mặt trước không đủ rõ để OCR.');
            return true;
        }

        throw new Error('Không lấy được dữ liệu OCR từ ảnh CCCD');
      }

      if (hasUsefulData === false) {
        if (type === 'cccd_back') {
          setOcrMessage('Đã quét CCCD mặt sau nhưng không đọc được ngày cấp. Vui lòng nhập thủ công.');
          return true;
        }

          keepUploadAndShowManualHint(type, 'Ảnh CCCD mặt trước chưa OCR đủ họ tên, số CCCD và ngày sinh.');
          return true;
      }

      if (type === 'cccd_front') {
        const frontValidation = validateCCCDFrontOCRPrefill(payload);
        if (!frontValidation.isValid) {
          keepUploadAndShowManualHint(
            type,
            `Ảnh CCCD mặt trước OCR còn thiếu ${frontValidation.missingFields.join(', ')}.`
          );
          return true;
        }
      }

      const { appliedFields, notes } = applyOCRPrefillToRegistrationForm(payload, getValues(), setValue);

      if (appliedFields.length === 0 && notes.length === 0) {
        if (type === 'cccd_back') {
          setOcrMessage('Đã quét CCCD mặt sau nhưng chưa có trường nào mới để tự điền.');
        } else {
          setOcrMessage('Ảnh CCCD mặt trước hợp lệ và OCR đã đọc được đủ trường bắt buộc.');
        }
        return true;
      }

      const fieldSummary = appliedFields.length > 0
        ? `Đã tự điền ${appliedFields.length} mục từ CCCD${type === 'cccd_back' ? ' mặt sau' : ''}.`
        : `Đã đọc được ảnh CCCD${type === 'cccd_back' ? ' mặt sau' : ''}.`;
      setOcrMessage([fieldSummary, ...notes].join(' '));
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : 'Không thể tự điền từ ảnh CCCD.';

      keepUploadAndShowManualHint(type, type === 'cccd_back'
        ? 'Không đọc được ngày cấp từ mặt sau.'
        : message);
      return true;
    } finally {
      setOcrLoadingType(null);
    }
  };

  const runSafeCCCDOcrPrefill = async (imageId: string, type: UploadSuccessResult['type']) => {
    if (type !== 'cccd_front' && type !== 'cccd_back') {
      return true;
    }

    setOcrError('');
    setOcrLoadingType(type);
    setOcrMessage(
      type === 'cccd_front'
        ? 'Dang doc thong tin tu CCCD mat truoc de tu dien bieu mau...'
        : 'Dang doc ngay cap tu CCCD mat sau...'
    );

    try {
      const response = await api.extractCCCDRegistrationFields(imageId, type);
      const payload = response?.data?.prefill;
      const hasUsefulData = response?.data?.hasUsefulData;
      const backendMissingCriticalFields = Array.isArray(response?.data?.missingCriticalFields)
        ? response.data.missingCriticalFields.filter(Boolean)
        : [];

      if (!response?.success || !payload) {
        if (response?.warning) {
          if (type === 'cccd_back') {
            keepUploadAndShowManualHint(type, response.warning || 'Ảnh CCCD mặt sau không đủ rõ để OCR ngày cấp.');
            return true;
          }
          keepUploadAndShowManualHint(type, response.warning || 'Ảnh CCCD mặt trước không đủ rõ để OCR.');
          return true;
        }
        keepUploadAndShowManualHint(type, 'Không lấy được dữ liệu OCR từ ảnh CCCD.');
        return true;
      }

      const { appliedFields, notes } = applyOCRPrefillToRegistrationForm(payload, getValues(), setValue);
      const fallbackMissingCriticalFields = type === 'cccd_front'
        ? validateCCCDFrontOCRPrefill(payload).missingFields
        : validateCCCDBackOCRPrefill(payload).missingFields;
      const missingCriticalFields = backendMissingCriticalFields.length > 0
        ? backendMissingCriticalFields
        : fallbackMissingCriticalFields;

      const hasPartialOrFullData = Boolean(
        hasUsefulData
        || appliedFields.length > 0
        || notes.length > 0
        || missingCriticalFields.length > 0
      );

      if (!hasPartialOrFullData) {
        if (type === 'cccd_back') {
          keepUploadAndShowManualHint(type, 'Ảnh CCCD mặt sau chưa OCR được ngày cấp sau khi phục hồi an toàn.');
          return true;
        }
        keepUploadAndShowManualHint(type, 'Ảnh CCCD mặt trước chưa OCR đủ họ tên, số CCCD và ngày sinh.');
        return true;
      }

      if (appliedFields.length === 0 && notes.length === 0 && missingCriticalFields.length === 0) {
        setOcrMessage(type === 'cccd_back'
          ? 'Đã OCR CCCD mặt sau và đọc được ngày cấp.'
          : 'Đã OCR CCCD mặt trước. Kiểm tra lại thông tin bên dưới.');
        return true;
      }

      const messages: string[] = [];
      if (appliedFields.length > 0) {
        messages.push(`Đã tự điền ${appliedFields.length} mục từ CCCD${type === 'cccd_back' ? ' mặt sau' : ''}.`);
      } else {
        messages.push(`Đã OCR được một phần ảnh CCCD${type === 'cccd_back' ? ' mặt sau' : ' mặt trước'}.`);
      }

      if (missingCriticalFields.length > 0) {
        messages.push(`OCR còn thiếu ${missingCriticalFields.join(', ')}. Bạn kiểm tra và bổ sung nếu cần.`);
      }

      if (response?.warning && missingCriticalFields.length === 0) {
        messages.push(response.warning);
      }

      messages.push(...notes);
      setOcrMessage(messages.join(' '));
      return true;
    } catch (error: unknown) {
      keepUploadAndShowManualHint(type, error instanceof Error ? error.message : 'Không thể tự điền từ ảnh CCCD.');
      return true;
    } finally {
      setOcrLoadingType(null);
    }
  };

  const handleUploadSuccess = async (result: UploadSuccessResult) => {
    if (result.type === 'photo_3x4') {
      setImageIds(prev => ({ ...prev, photo_3x4: result.imageId }));
      setImageErrors(prev => ({ ...prev, photo_3x4: '' }));
      return;
    }

    setImageIds(prev => ({
      ...prev,
      [result.type]: result.imageId,
    }));
    setImageErrors(prev => ({
      ...prev,
      [result.type]: '',
    }));

    if (result.type === 'cccd_back') {
      await runSafeCCCDOcrPrefill(result.imageId, result.type);
      return;
    }

    await runSafeCCCDOcrPrefill(result.imageId, result.type);
  };

  const handleUploadError = (err: Error) => {
    console.error('Upload error:', err);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    trackFormStartOnce();
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
      analytics.formError('student_registration', 'uploads');
      setLoading(false);
      return;
    }

    try {
      const apiData = {
        cccd: data.cccd,
        ho: data.ho,
        ten_dem: data.ten_dem || '',
        ten: data.ten,
        ngay_sinh: `${data.nam}-${String(data.thang).padStart(2, '0')}-${String(data.ngay).padStart(2, '0')}`,
        noi_sinh: normalizeBirthPlaceValue(data.noi_sinh),
        gioi_tinh: data.gioi_tinh,
        email: data.email,
        sdt: data.sdt,
        dan_toc: data.dan_toc,
        ngay_cap_cccd: `${data.ngay_cap_nam}-${String(data.ngay_cap_thang).padStart(2, '0')}-${String(data.ngay_cap_ngay).padStart(2, '0')}`,
        don_vi_cong_tac: data.workplace,
        dia_chi: data.dia_chi_hien_nay,
        cccd_front_image_id: imageIds.cccd_front,
        cccd_back_image_id: imageIds.cccd_back,
        photo_3x4_image_id: imageIds.photo_3x4,
        // NOTE: 'notes' field bị bỏ, backend schema dùng .strict(), không chấp nhận field lạ
      };

      const res = await api.registerStudent(apiData);
      if (res.success) {
        analytics.formSubmit('student_registration', true);
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

        setTimeout(() => {
          window.location.assign('/dashboard/exams');
        }, 2000);
      }
    } catch (error: unknown) {
      analytics.formSubmit('student_registration', false);
      analytics.formError('student_registration', 'submit');
      setErrorMsg(error instanceof Error ? error.message : 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="a4-registration-page">
      <SEO
        title="Dang ky du thi"
        description="Form dang ky du thi truc tuyen cua Van Trang Education cho hoc vien va thi sinh."
        url="/register"
        structuredData={{
          '@type': 'WebPage',
          name: 'Dang ky du thi',
          description: 'Phieu dang ky du thi truc tuyen cua Van Trang Education.',
          url: 'https://vantrangedu.com/register'
        }}
      />
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

        <form noValidate onFocusCapture={handleFormFocusCapture} onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)}>

          {/* ===== SECTION I: THÔNG TIN CÁ NHÂN ===== */}
          <div className="a4-section">
            <div className="section-header-row">
              <div className="section-icon"><User size={18} /></div>
              <h2>I. THÔNG TIN CÁ NHÂN</h2>
            </div>

            {/* Upload ảnh trước để OCR tự điền biểu mẫu sớm hơn */}
            <div className="upload-section" style={{ marginBottom: '24px' }}>
              <div className="upload-waiting-note" role="note" style={{ marginBottom: '16px' }}>
                Upload ảnh có thể cần chờ tối đa 3 phút để hệ thống OCR, xử lý và tự điền thông tin. Vui lòng không thoát khỏi trang trong lúc đang xử lý.
              </div>

              {isProcessingUploads && (
                <div className="upload-processing-panel" role="status" aria-live="polite" style={{ marginBottom: '16px' }}>
                  <div className="upload-processing-header">
                    <Loader2 size={20} className="animate-spin" />
                    <div>
                      <p className="upload-processing-title">Hệ thống đang xử lý ảnh hồ sơ</p>
                      <p className="upload-processing-subtitle">
                        Quá trình này có thể mất tới 3 phút. Vui lòng không tải lại trang, đóng form hoặc thoát ra trong lúc OCR và AI đang chạy.
                      </p>
                    </div>
                  </div>
                  <div className="upload-processing-list">
                    {processingItems.map((item) => (
                      <div key={item.key} className="upload-processing-item">
                        <div className="upload-processing-item-head">
                          <span className="upload-processing-item-title">{item.title}</span>
                          <span className="upload-processing-item-progress">{Math.min(Math.round(item.progress), 99)}%</span>
                        </div>
                        <p className="upload-processing-item-copy">{item.description}</p>
                        <div className="upload-processing-track" aria-hidden="true">
                          <div className="upload-processing-fill" style={{ width: `${Math.min(item.progress, 99)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(ocrMessage || ocrError) && (
                <div
                  className={`message-box ${ocrError ? 'error-box' : 'success-box'}`}
                  role={ocrError ? 'alert' : 'status'}
                  style={{ marginBottom: '16px' }}
                >
                  {ocrError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  <span>
                    {ocrError || ocrMessage}
                  </span>
                </div>
              )}

              <div className="upload-grid">
                <div className="upload-card">
                  <p className="upload-label">Ảnh mặt TRƯỚC thẻ CCCD <span className="required">*</span></p>
                  <CCCDUploader
                    key={`cccd-front-${uploaderKeys.cccd_front}`}
                    type="cccd_front"
                    onStatusChange={handleUploaderStatusChange}
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                  />
                  {imageErrors.cccd_front && <p className="upload-error-text">{imageErrors.cccd_front}</p>}
                </div>

                <div className="upload-card">
                  <p className="upload-label">Ảnh mặt SAU thẻ CCCD <span className="required">*</span></p>
                  <CCCDUploader
                    key={`cccd-back-${uploaderKeys.cccd_back}`}
                    type="cccd_back"
                    onStatusChange={handleUploaderStatusChange}
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                  />
                  {imageErrors.cccd_back && <p className="upload-error-text">{imageErrors.cccd_back}</p>}
                </div>

                <div className="upload-card">
                  <p className="upload-label">Ảnh thẻ 3×4 <span className="required">*</span></p>
                  <CCCDUploader
                    key={`photo-${uploaderKeys.photo_3x4}`}
                    type="photo_3x4"
                    photoGenderHint={watch('gioi_tinh')}
                    onStatusChange={handleUploaderStatusChange}
                    onUploadSuccess={handleUploadSuccess}
                    onUploadError={handleUploadError}
                  />
                  {imageErrors.photo_3x4 && <p className="upload-error-text">{imageErrors.photo_3x4}</p>}
                </div>
              </div>
            </div>

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
                  placeholder="Nhập số CCCD"
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

            {/* Dân tộc + SĐT */}
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

            {/* Địa chỉ */}
            <div className="form-field full-width">
                <label htmlFor="dia_chi_hien_nay">10. Địa chỉ hiện nay (nơi nhận bằng) <span className="required">*</span></label>
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
          </div>

          {/* ===== CAM KẾT ===== */}
          <div className="a4-section commitments-section">
            <label className="checkbox-row">
              <input type="checkbox" {...register('commit_accuracy')} aria-invalid={errors.commit_accuracy ? 'true' : 'false'} aria-describedby={errors.commit_accuracy ? fieldErrorId('commit_accuracy') : undefined} />
              <span>Tôi cam đoan và hoàn toàn chịu trách nhiệm về sự chính xác của ảnh và thông tin đã cung cấp trong Phiếu đăng ký dự thi.</span>
            </label>
            {errors.commit_accuracy && <p id={fieldErrorId('commit_accuracy')} className="error-text ml-6">{errors.commit_accuracy.message}</p>}

            <label className="checkbox-row">
              <input type="checkbox" {...register('commit_usage')} aria-invalid={errors.commit_usage ? 'true' : 'false'} aria-describedby={errors.commit_usage ? fieldErrorId('commit_usage') : undefined} />
              <span>Tôi đồng ý việc VAN TRANG EDU sử dụng các thông tin cá nhân này vào mục đích phục vụ các công tác liên quan đến kỳ thi.</span>
            </label>
            {errors.commit_usage && <p id={fieldErrorId('commit_usage')} className="error-text ml-6">{errors.commit_usage.message}</p>}
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
            <div className="message-box error-box" role="alert" aria-live="assertive">
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="message-box success-box" role="status" aria-live="polite">
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

      {isProcessingUploads ? (
        <div className="register-processing-floating" role="status" aria-live="polite">
          <div className="register-processing-floating-card">
            <div className="register-processing-floating-head">
              <Loader2 size={18} className="animate-spin" />
              <div>
                <p className="register-processing-floating-title">Hệ thống đang xử lý ảnh hồ sơ</p>
                <p className="register-processing-floating-subtitle">Vui lòng chờ, đừng tắt trang trong lúc OCR và AI đang chạy.</p>
              </div>
            </div>
            <div className="register-processing-floating-list">
              {processingItems.map((item) => (
                <div key={`floating-${item.key}`} className="register-processing-floating-item">
                  <div className="register-processing-floating-item-head">
                    <span>{item.title}</span>
                    <strong>{Math.min(Math.round(item.progress), 99)}%</strong>
                  </div>
                  <p>{item.description}</p>
                  <div className="register-processing-floating-track" aria-hidden="true">
                    <div className="register-processing-floating-fill" style={{ width: `${Math.min(item.progress, 99)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
