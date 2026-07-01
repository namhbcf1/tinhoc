import { describe, expect, it, vi } from 'vitest';
import {
  applyOCRPrefillToRegistrationForm,
  validateCCCDFrontOCRPrefill,
} from '../../src/pages/public/student-registration-ocr';

describe('applyOCRPrefillToRegistrationForm', () => {
  it('normalizes OCR gender and applies it to the registration form', () => {
    const setValue = vi.fn();

    const result = applyOCRPrefillToRegistrationForm(
      {
        gender: 'Nu',
      },
      {
        ho: '',
        ten_dem: '',
        ten: '',
        ngay: '',
        thang: '',
        nam: '',
        cccd: '',
        ngay_cap_ngay: '',
        ngay_cap_thang: '',
        ngay_cap_nam: '',
        dan_toc: '',
        noi_sinh: '',
        gioi_tinh: 'Nam',
        dia_chi_hien_nay: '',
      },
      setValue
    );

    expect(setValue).toHaveBeenCalledWith('gioi_tinh', 'Nữ', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    expect(result.appliedFields).toContain('gioi_tinh');
  });

  it('does not auto-fill noi_sinh from OCR placeOfOrigin', () => {
    const setValue = vi.fn();

    const result = applyOCRPrefillToRegistrationForm(
      {
        placeOfOrigin: 'Ha Noi',
        fullName: 'Nguyen Van A',
      },
      {
        ho: '',
        ten_dem: '',
        ten: '',
        ngay: '',
        thang: '',
        nam: '',
        cccd: '',
        ngay_cap_ngay: '',
        ngay_cap_thang: '',
        ngay_cap_nam: '',
        dan_toc: '',
        noi_sinh: '',
        gioi_tinh: 'Nam',
        dia_chi_hien_nay: '',
      },
      setValue
    );

    expect(setValue).not.toHaveBeenCalledWith(
      'noi_sinh',
      expect.any(String),
      expect.anything()
    );
    expect(result.appliedFields).not.toContain('noi_sinh');
    expect(result.notes).toContain('Mục "Nơi sinh" không tự điền từ ảnh CCCD. Bạn vui lòng tự chọn hoặc tự nhập.');
  });
  it('rejects cccd front OCR when required fields are missing', () => {
    const result = validateCCCDFrontOCRPrefill({
      cccd: '001304010625',
      fullName: 'NGUYEN QUYNH GIANG',
      dateOfBirth: '',
    });

    expect(result).toEqual({
      isValid: false,
      missingFields: ['ngày sinh'],
    });
  });

  it('accepts cccd front OCR when full name, cccd, and date of birth exist', () => {
    const result = validateCCCDFrontOCRPrefill({
      cccd: '001304010625',
      fullName: 'NGUYEN QUYNH GIANG',
      dateOfBirth: '17/06/2004',
    });

    expect(result).toEqual({
      isValid: true,
      missingFields: [],
    });
  });
});
