import { describe, expect, it } from 'vitest';

import { canAccessExamFeeStatus } from './adminSession';

describe('canAccessExamFeeStatus', () => {
  it('allows admin without teacher_code', () => {
    expect(canAccessExamFeeStatus({ role: 'admin' })).toBe(true);
  });

  it('allows super admin without teacher_code', () => {
    expect(canAccessExamFeeStatus({ role: 'super_admin' })).toBe(true);
  });

  it('blocks teacher-code admins', () => {
    expect(canAccessExamFeeStatus({ role: 'admin', teacher_code: 'GV001' })).toBe(false);
    expect(canAccessExamFeeStatus({ role: 'super_admin', teacherCode: 'GV002' })).toBe(false);
  });

  it('blocks missing or unsupported roles', () => {
    expect(canAccessExamFeeStatus(null)).toBe(false);
    expect(canAccessExamFeeStatus({ role: 'teacher' })).toBe(false);
  });
});
