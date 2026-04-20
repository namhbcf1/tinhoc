type RegistrationFormValues = {
  ho: string;
  ten_dem?: string;
  ten: string;
  ngay: string;
  thang: string;
  nam: string;
  cccd: string;
  ngay_cap_ngay: string;
  ngay_cap_thang: string;
  ngay_cap_nam: string;
  dan_toc: string;
  noi_sinh: string;
  gioi_tinh: 'Nam' | 'Nữ';
  dia_chi_hien_nay: string;
};

type OCRPrefillPayload = {
  cccd?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  ethnicity?: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  issueDate?: string;
};

type SetValue = (
  name: keyof RegistrationFormValues,
  value: string,
  options?: { shouldDirty?: boolean; shouldTouch?: boolean }
) => void;

const REQUIRED_CCCD_FRONT_FIELDS = [
  { key: 'fullName', label: 'họ tên' },
  { key: 'cccd', label: 'số CCCD' },
  { key: 'dateOfBirth', label: 'ngày sinh' },
] as const;

const REQUIRED_CCCD_BACK_FIELDS = [
  { key: 'issueDate', label: 'ngay cap' },
] as const;

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) {
    return { ho: '', ten_dem: '', ten: '' };
  }
  if (parts.length === 1) {
    return { ho: parts[0], ten_dem: '', ten: '' };
  }

  return {
    ho: parts[0],
    ten_dem: parts.slice(1, -1).join(' '),
    ten: parts[parts.length - 1],
  };
}

function splitDateParts(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length !== 8) {
    return null;
  }

  return {
    day: digits.slice(0, 2),
    month: digits.slice(2, 4),
    year: digits.slice(4, 8),
  };
}

function cleanPrefillPlace(value?: string) {
  if (!value) return '';

  return value
    .replace(/\b(?:place\s*of\s*ongin|place\s*of\s*origin|place\s*of\s*residence|quê\s*quán|quê\s*quản|que\s*quan|nơi\s*thường\s*trú)\b/gi, '')
    .replace(/[/:]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:[,.\-\s])+/, '')
    .trim();
}

function normalizeOCRGender(value?: string): 'Nam' | 'Nữ' | '' {
  if (!value) return '';

  const folded = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!folded) return '';
  if (folded === 'nam' || folded === 'male' || folded === 'm') return 'Nam';
  if (folded === 'nu' || folded === 'female' || folded === 'f') return 'Nữ';

  if (folded.includes('nam')) return 'Nam';
  if (folded.includes('nu') || folded.includes('female')) return 'Nữ';

  return '';
}

function setIfEmpty(
  currentValue: string | undefined,
  field: keyof RegistrationFormValues,
  nextValue: string,
  setValue: SetValue,
  appliedFields: string[]
) {
  if (!nextValue) {
    return;
  }

  const hasExistingValue = currentValue && (currentValue || '').trim().length > 0;
  if (hasExistingValue) {
    return;
  }

  setValue(field, nextValue, { shouldDirty: true });
  appliedFields.push(field);
}

export function validateCCCDFrontOCRPrefill(prefill: OCRPrefillPayload) {
  const missingFields = REQUIRED_CCCD_FRONT_FIELDS
    .filter(({ key }) => !(prefill[key] || '').trim())
    .map(({ label }) => label);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export function validateCCCDBackOCRPrefill(prefill: OCRPrefillPayload) {
  const missingFields = REQUIRED_CCCD_BACK_FIELDS
    .filter(({ key }) => !(prefill[key] || '').trim())
    .map(({ label }) => label);

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export function applyOCRPrefillToRegistrationForm(
  prefill: OCRPrefillPayload,
  currentValues: RegistrationFormValues,
  setValue: SetValue
) {
  const appliedFields: string[] = [];
  const notes: string[] = [];

  const normalizedGender = normalizeOCRGender(prefill.gender);
  if (normalizedGender) {
    const currentGender = normalizeOCRGender(currentValues.gioi_tinh);
    if (currentGender !== normalizedGender) {
      setValue('gioi_tinh', normalizedGender, { shouldDirty: true });
      appliedFields.push('gioi_tinh');
    }
  }

  if (prefill.fullName) {
    const nameParts = splitName(prefill.fullName);
    setIfEmpty(currentValues.ho, 'ho', nameParts.ho, setValue, appliedFields);
    setIfEmpty(currentValues.ten_dem || '', 'ten_dem', nameParts.ten_dem, setValue, appliedFields);
    setIfEmpty(currentValues.ten, 'ten', nameParts.ten, setValue, appliedFields);
  }

  setIfEmpty(currentValues.cccd, 'cccd', prefill.cccd || '', setValue, appliedFields);
  setIfEmpty(currentValues.dan_toc, 'dan_toc', prefill.ethnicity || '', setValue, appliedFields);

  const birth = splitDateParts(prefill.dateOfBirth || '');
  if (birth) {
    setIfEmpty(currentValues.ngay, 'ngay', birth.day, setValue, appliedFields);
    setIfEmpty(currentValues.thang, 'thang', birth.month, setValue, appliedFields);
    setIfEmpty(currentValues.nam, 'nam', birth.year, setValue, appliedFields);
  }

  const issueDate = splitDateParts(prefill.issueDate || '');
  if (issueDate) {
    setIfEmpty(currentValues.ngay_cap_ngay, 'ngay_cap_ngay', issueDate.day, setValue, appliedFields);
    setIfEmpty(currentValues.ngay_cap_thang, 'ngay_cap_thang', issueDate.month, setValue, appliedFields);
    setIfEmpty(currentValues.ngay_cap_nam, 'ngay_cap_nam', issueDate.year, setValue, appliedFields);
  }

  const sanitizedOrigin = cleanPrefillPlace(prefill.placeOfOrigin);
  const sanitizedResidence = cleanPrefillPlace(prefill.placeOfResidence);
  if (sanitizedOrigin && !currentValues.noi_sinh.trim()) {
    notes.push('Mục "Nơi sinh" không tự điền từ ảnh CCCD. Bạn vui lòng tự chọn hoặc tự nhập.');
  }

  if (sanitizedResidence && !currentValues.dia_chi_hien_nay.trim()) {
    setValue('dia_chi_hien_nay', sanitizedResidence, { shouldDirty: true });
    appliedFields.push('dia_chi_hien_nay');
    notes.push('Địa chỉ hiện nay được điền tạm từ mục nơi thường trú trên CCCD. Bạn kiểm tra lại nếu địa chỉ hiện tại khác.');
  }

  return { appliedFields, notes };
}
