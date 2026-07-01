import type { FocusEventHandler } from 'react';
import type {
  FieldErrors,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormHandleSubmit,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import * as z from 'zod';
import type { UploadStatusSnapshot } from '../../../../components/upload/CCCDUploader';

export const registrationSchema = z.object({
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
  gioi_tinh: z.custom<'Nam' | 'Nữ'>(
    (value) => value === 'Nam' || value === 'Nữ',
    'Vui lòng chọn giới tính'
  ),
  sdt: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ'),
  workplace: z.string().min(1, 'Vui lòng nhập đơn vị công tác'),
  nganh_dang_hoc: z.string().min(1, 'Vui lòng nhập khoa/ngành đang theo học'),
  dia_chi_hien_nay: z.string().min(1, 'Vui lòng nhập địa chỉ hiện tại'),
  commit_accuracy: z.boolean().refine(v => v === true, 'Bạn cần cam đoan thông tin là đúng'),
  commit_usage: z.boolean().refine(v => v === true, 'Bạn cần đồng ý sử dụng dữ liệu'),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type RegistrationUploadType = 'cccd_front' | 'cccd_back' | 'photo_3x4';
export type UploadSuccessResult = { imageId: string; processingLogId?: string; type: RegistrationUploadType; imageUrl?: string; };
export type RegistrationImageState = Record<RegistrationUploadType, string | null>;
export type RegistrationImageErrors = Record<RegistrationUploadType, string>;
export type RegistrationUploaderKeys = Record<RegistrationUploadType, number>;
export type RegistrationUploadRuntime = Record<RegistrationUploadType, UploadStatusSnapshot>;
export type RegistrationProcessingItem = { key: string; title: string; description: string; progress: number; };
export type RegistrationFieldA11y = { 'aria-invalid': 'true' | 'false'; 'aria-describedby'?: string; };

export type StudentRegistrationViewProps = {
  handleFormFocusCapture: FocusEventHandler<HTMLFormElement>;
  handleSubmit: UseFormHandleSubmit<RegistrationFormData>;
  onSubmit: SubmitHandler<RegistrationFormData>;
  handleInvalidSubmit: SubmitErrorHandler<RegistrationFormData>;
  isProcessingUploads: boolean;
  processingItems: RegistrationProcessingItem[];
  imageErrors: RegistrationImageErrors;
  imageIds: RegistrationImageState;
  uploaderKeys: RegistrationUploaderKeys;
  handleUploaderStatusChange: (nextState: UploadStatusSnapshot) => void;
  handleUploadSuccess: (result: UploadSuccessResult) => Promise<void>;
  handleUploadError: (err: Error) => void;
  watch: UseFormWatch<RegistrationFormData>;
  register: UseFormRegister<RegistrationFormData>;
  errors: FieldErrors<RegistrationFormData>;
  fieldErrorId: (field: keyof RegistrationFormData) => string;
  fieldHintId: (field: keyof RegistrationFormData) => string;
  getFieldA11y: (field: keyof RegistrationFormData) => RegistrationFieldA11y;
  watchedBirthPlace: string;
  setValue: UseFormSetValue<RegistrationFormData>;
  errorMsg: string;
  successMsg: string;
  loading: boolean;
};

export type StudentRegistrationFormFieldsProps = Pick<StudentRegistrationViewProps,
  'register' | 'errors' | 'fieldErrorId' | 'fieldHintId' | 'getFieldA11y' | 'watchedBirthPlace' | 'setValue'
>;
export type StudentRegistrationFooterSectionProps = Pick<StudentRegistrationViewProps,
  'register' | 'errors' | 'fieldErrorId' | 'errorMsg' | 'successMsg' | 'loading'
>;
export type StudentRegistrationUploadSectionProps = Pick<StudentRegistrationViewProps,
  'isProcessingUploads' | 'processingItems' | 'imageErrors' | 'imageIds' | 'uploaderKeys' | 'handleUploaderStatusChange' | 'handleUploadSuccess' | 'handleUploadError' | 'watch'
>;
export type StudentRegistrationUploadHookResult = Pick<StudentRegistrationViewProps,
  'imageErrors' | 'imageIds' | 'uploaderKeys' | 'processingItems' | 'handleUploaderStatusChange' | 'handleUploadSuccess' | 'handleUploadError'
> & {
  isProcessingUploads: boolean;
  setImageErrors: (next: RegistrationImageErrors) => void;
};
export type StudentRegistrationHookResult = StudentRegistrationViewProps;

export const UPLOAD_TYPE_LABELS: Record<RegistrationUploadType, string> = {
  cccd_front: 'CCCD mặt trước',
  cccd_back: 'CCCD mặt sau',
  photo_3x4: 'Ảnh thẻ 3x4',
};

export const createIdleUploadSnapshot = (type: RegistrationUploadType): UploadStatusSnapshot => ({
  type,
  status: 'idle',
  progress: 0,
  stage: null,
  message: null,
});
