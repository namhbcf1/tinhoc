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

  // Only skip if current value has meaningful content (not empty/whitespace)
  const hasExistingValue = currentValue && (currentValue || '').trim().length > 0;
  if (hasExistingValue) {
    return;
  }

  setValue(field, nextValue, { shouldDirty: true });
  appliedFields.push(field);
}

export function applyOCRPrefillToRegistrationForm(
  prefill: OCRPrefillPayload,
  currentValues: RegistrationFormValues,
  setValue: SetValue
) {
  const appliedFields: string[] = [];
  const notes: string[] = [];

  // Handle gender - apply regardless of current value if OCR provides it
  if (prefill.gender && (prefill.gender === 'Nam' || prefill.gender === 'Nữ')) {
    const currentGender = currentValues.gioi_tinh;
    // Only update if different from current (which defaults to 'Nam')
    if (currentGender !== prefill.gender) {
      setValue('gioi_tinh', prefill.gender as 'Nam' | 'Nữ', { shouldDirty: true });
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

  const sanitizedOrigin = normalizeBirthPlaceValue(cleanPrefillPlace(prefill.placeOfOrigin));
  if (sanitizedOrigin) {
    setIfEmpty(currentValues.noi_sinh, 'noi_sinh', sanitizedOrigin, setValue, appliedFields);
    if (!currentValues.noi_sinh.trim()) {
      notes.push('Mục "Nơi sinh" đang được điền tạm từ "Quê quán" trên CCCD, bạn nên kiểm tra lại.');
    }
  }

  return { appliedFields, notes };
}
import { normalizeBirthPlaceValue } from '../../utils/birthPlaceOptions';
