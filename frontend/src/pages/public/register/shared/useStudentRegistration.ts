import { useRef, useState, type FocusEvent } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import '../../../../styles/public/RegistrationFormA4.css';
import { normalizeBirthPlaceValue } from '../../../../utils/birthPlaceOptions';
import analytics from '../../../../utils/analytics';
import {
  registrationSchema,
  type RegistrationFormData,
} from './student-registration-types';
import { REGISTER_ERROR_COPY, REGISTER_SUCCESS_COPY } from './student-registration-copy';
import { useStudentRegistrationUpload } from './useStudentRegistrationUpload';
import api from '../../../../services/api';

export function useStudentRegistration(): StudentRegistrationHookResult {
  const formStartTrackedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register, handleSubmit, setFocus, setValue, getValues, watch, formState: { errors } } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      dan_toc: 'Kinh',
      noi_sinh: '',
    },
  });

  const watchedBirthPlace = watch('noi_sinh');

  const {
    imageErrors,
    imageIds,
    uploaderKeys,
    processingItems,
    isProcessingUploads,
    handleUploaderStatusChange,
    handleUploadSuccess,
    handleUploadError,
    setImageErrors,
  } = useStudentRegistrationUpload();

  const fieldErrorId = (field: keyof RegistrationFormData) => `${String(field)}-error`;
  const fieldHintId = (field: keyof RegistrationFormData) => `${String(field)}-hint`;
  const getFieldA11y = (field: keyof RegistrationFormData) => ({
    'aria-invalid': errors[field] ? 'true' : 'false',
    'aria-describedby': errors[field] ? fieldErrorId(field) : undefined,
  });

  const trackFormStartOnce = () => {
    if (formStartTrackedRef.current) return;
    formStartTrackedRef.current = true;
    analytics.formStart('student_registration');
  };

  const handleFormFocusCapture = (event: FocusEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.matches('input, select, textarea, button')) {
      trackFormStartOnce();
    }
  };

  const handleInvalidSubmit = (invalidFields: FieldErrors<RegistrationFormData>) => {
    const fieldOrder: (keyof RegistrationFormData)[] = [
      'ho','ten','ngay','thang','nam','gioi_tinh','cccd','ngay_cap_ngay','ngay_cap_thang','ngay_cap_nam','dan_toc','sdt','email','noi_sinh','workplace','nganh_dang_hoc','dia_chi_hien_nay','commit_accuracy','commit_usage',
    ];

    const firstInvalidField = fieldOrder.find((field) => invalidFields[field]);
    setErrorMsg(REGISTER_ERROR_COPY.invalidForm);

    if (firstInvalidField) {
      analytics.formError('student_registration', String(firstInvalidField));
      if (firstInvalidField === 'noi_sinh') {
        document.querySelector('[data-testid="birth-place-field"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setFocus(firstInvalidField);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    trackFormStartOnce();
    setLoading(true);
    setErrorMsg('');
    setImageErrors({ cccd_front: '', cccd_back: '', photo_3x4: '' });

    const newImageErrors = {
      cccd_front: !imageIds.cccd_front ? REGISTER_ERROR_COPY.missingFront : '',
      cccd_back: !imageIds.cccd_back ? REGISTER_ERROR_COPY.missingBack : '',
      photo_3x4: !imageIds.photo_3x4 ? REGISTER_ERROR_COPY.missingPhoto : '',
    };

    if (Object.values(newImageErrors).some(Boolean)) {
      setImageErrors(newImageErrors);
      setErrorMsg(REGISTER_ERROR_COPY.missingAllImages);
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
        nganh_dang_hoc: data.nganh_dang_hoc,
        dia_chi: data.dia_chi_hien_nay,
        cccd_front_image_id: imageIds.cccd_front,
        cccd_back_image_id: imageIds.cccd_back,
        photo_3x4_image_id: imageIds.photo_3x4,
      };

      const res = await api.registerStudent(apiData);
      if (res.success) {
        analytics.formSubmit('student_registration', true);
        setSuccessMsg(REGISTER_SUCCESS_COPY.submitted);
        const studentPayload = res.data || {};
        const ho_ten_full = studentPayload.ho_ten_full || [data.ho, data.ten_dem, data.ten].filter(Boolean).join(' ');
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
          don_vi_cong_tac: data.workplace,
          nganh_dang_hoc: data.nganh_dang_hoc,
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
      setErrorMsg(error instanceof Error ? error.message : REGISTER_ERROR_COPY.submitFailed);
    } finally {
      setLoading(false);
    }
  };

  return {
    handleFormFocusCapture,
    handleSubmit,
    onSubmit,
    handleInvalidSubmit,
    isProcessingUploads,
    processingItems,
    imageErrors,
    imageIds,
    uploaderKeys,
    handleUploaderStatusChange,
    handleUploadSuccess,
    handleUploadError,
    watch,
    register,
    errors,
    fieldErrorId,
    fieldHintId,
    getFieldA11y,
    watchedBirthPlace,
    setValue,
    errorMsg,
    successMsg,
    loading,
  };
}


