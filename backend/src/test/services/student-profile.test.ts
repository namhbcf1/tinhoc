import { describe, expect, it } from 'vitest';
import { normalizeStudentGender } from '../../services/student-service.js';

describe('student profile service', () => {
  describe('normalizeStudentGender', () => {
    it('normalizes supported gender aliases to database values', () => {
      expect(normalizeStudentGender('Nam')).toBe('Nam');
      expect(normalizeStudentGender('male')).toBe('Nam');
      expect(normalizeStudentGender('Nữ')).toBe('Nữ');
      expect(normalizeStudentGender('nu')).toBe('Nữ');
      expect(normalizeStudentGender(undefined, 'Nữ')).toBe('Nữ');
    });

    it('rejects unsupported gender values with a clear error', () => {
      expect(() => normalizeStudentGender('Khác')).toThrow(
        'Giới tính không hợp lệ. Chỉ hỗ trợ Nam hoặc Nữ.'
      );
    });
  });
});
