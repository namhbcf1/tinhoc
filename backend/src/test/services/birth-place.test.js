import { describe, expect, it } from 'vitest';
import { normalizeBirthPlaceValue } from '../../utils/birth-place.js';
describe('birth place normalization', () => {
    it('maps merged provinces to the 34-unit list', () => {
        expect(normalizeBirthPlaceValue('Hải Dương')).toBe('Hải Phòng');
        expect(normalizeBirthPlaceValue('Bắc Giang')).toBe('Bắc Ninh');
        expect(normalizeBirthPlaceValue('Bình Dương')).toBe('TP.HCM');
        expect(normalizeBirthPlaceValue('Hà Giang')).toBe('Tuyên Quang');
    });
    it('keeps foreign text and existing canonical names intact', () => {
        expect(normalizeBirthPlaceValue('Nhật Bản')).toBe('Nhật Bản');
        expect(normalizeBirthPlaceValue('Hà Nội')).toBe('Hà Nội');
    });
});
