import { describe, expect, it } from 'vitest';
import {
  isVietnamProvince2025,
  normalizeBirthPlaceValue,
  VIETNAM_PROVINCE_OPTIONS_2025,
} from '../../src/utils/birthPlaceOptions';

describe('birthPlaceOptions', () => {
  it('contains the 34 merged provinces and cities', () => {
    expect(VIETNAM_PROVINCE_OPTIONS_2025).toHaveLength(34);
    expect(VIETNAM_PROVINCE_OPTIONS_2025.some((option) => option.value === 'Hà Nội')).toBe(true);
    expect(VIETNAM_PROVINCE_OPTIONS_2025.some((option) => option.value === 'TP.HCM')).toBe(true);
  });

  it('normalizes old province names to the new merged units', () => {
    expect(normalizeBirthPlaceValue('Hải Dương')).toBe('Hải Phòng');
    expect(normalizeBirthPlaceValue('Bắc Giang')).toBe('Bắc Ninh');
    expect(normalizeBirthPlaceValue('Bình Dương')).toBe('TP.HCM');
    expect(isVietnamProvince2025('Hải Dương')).toBe(true);
  });

  it('keeps foreign places unchanged', () => {
    expect(normalizeBirthPlaceValue('Nhật Bản')).toBe('Nhật Bản');
    expect(isVietnamProvince2025('Nhật Bản')).toBe(false);
  });
});
