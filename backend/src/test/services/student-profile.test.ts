import { describe, expect, it } from 'vitest';
import { isAcceptedStudentLoginSecret, normalizeStudentGender } from '../../services/student-service.js';

describe('student profile service', () => {
  describe('normalizeStudentGender', () => {
    it('normalizes supported gender aliases to database values', () => {
      expect(normalizeStudentGender('Nam')).toBe('Nam');
      expect(normalizeStudentGender('male')).toBe('Nam');
      expect(normalizeStudentGender('Nữ')).toBe('Nữ');
      expect(normalizeStudentGender('nu')).toBe('Nữ');
      expect(normalizeStudentGender(undefined, 'Nữ')).toBe('Nữ');
      expect(normalizeStudentGender('Khác')).toBe('Khác');
      expect(normalizeStudentGender('other')).toBe('Khác');
    });

    it('rejects unsupported gender values with a clear error', () => {
      expect(() => normalizeStudentGender('Khong-ro')).toThrow(
        'Giới tính không hợp lệ. Chỉ hỗ trợ Nam, Nữ hoặc Khác.'
      );
    });
  });

  describe('isAcceptedStudentLoginSecret', () => {
    it('accepts the stored phone number for regular students', () => {
      expect(isAcceptedStudentLoginSecret('079203001234', '0909123456', '0909 123 456')).toBe(true);
    });

    it('accepts test123 only for synthetic test students 001-0019', () => {
      expect(isAcceptedStudentLoginSecret('001', '123456', 'test123')).toBe(true);
      expect(isAcceptedStudentLoginSecret('0019', '123456', 'test123')).toBe(true);
      expect(isAcceptedStudentLoginSecret('003', '123456', '123456')).toBe(false);
      expect(isAcceptedStudentLoginSecret('0020', '123456', 'test123')).toBe(false);
    });
  });
});
