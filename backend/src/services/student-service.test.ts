import { describe, expect, it } from 'vitest';
import { isAcceptedStudentLoginSecret } from './student-service.ts';

describe('isAcceptedStudentLoginSecret', () => {
  it('accepts the stored phone for a real student', () => {
    expect(isAcceptedStudentLoginSecret('001305032556', '0984 505 735', '0984505735', 'student@example.com')).toBe(true);
  });

  it('accepts the stored email case-insensitively for a real student', () => {
    expect(isAcceptedStudentLoginSecret('001305032556', '0984505735', ' student@example.COM ', 'Student@Example.com')).toBe(true);
  });

  it('rejects another student phone or email when CCCD is for a different student', () => {
    expect(isAcceptedStudentLoginSecret('001305032556', '0984505735', 'other@example.com', 'student@example.com')).toBe(false);
  });

  it('keeps synthetic test student password behavior', () => {
    expect(isAcceptedStudentLoginSecret('001', '0984505735', 'test123', 'student@example.com')).toBe(true);
    expect(isAcceptedStudentLoginSecret('001', '0984505735', 'student@example.com', 'student@example.com')).toBe(false);
  });
});
