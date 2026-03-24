import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStorageValue, setStorageValue } from '../../src/utils/browser-storage';
import {
  getLoginPathForRole,
  handleAuthFailureRedirect,
  shouldHandleAuthFailureRedirect,
} from '../../src/utils/authRedirect';

describe('authRedirect', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('returns the correct login path for each role', () => {
    expect(getLoginPathForRole('admin')).toBe('/admin/login');
    expect(getLoginPathForRole('student')).toBe('/login');
  });

  it('redirects student sessions to /login and clears student storage', () => {
    setStorageValue('student_token', 'student-token');
    setStorageValue('student_data', JSON.stringify({ cccd: '012345678901' }));
    window.history.replaceState({}, '', '/dashboard/exams');

    const redirect = vi.fn();
    const handled = handleAuthFailureRedirect('student', redirect);

    expect(handled).toBe(true);
    expect(redirect).toHaveBeenCalledWith('/login');
    expect(getStorageValue('student_token')).toBeNull();
    expect(getStorageValue('student_data')).toBeNull();
  });

  it('redirects admin sessions to /admin/login and clears admin storage', () => {
    setStorageValue('admin_token', 'admin-token');
    setStorageValue('admin', JSON.stringify({ id: 1 }));
    window.history.replaceState({}, '', '/admin/dashboard');

    const redirect = vi.fn();
    const handled = handleAuthFailureRedirect('admin', redirect);

    expect(handled).toBe(true);
    expect(redirect).toHaveBeenCalledWith('/admin/login');
    expect(getStorageValue('admin_token')).toBeNull();
    expect(getStorageValue('admin')).toBeNull();
  });

  it('treats protected dashboard routes without a token as redirect candidates', () => {
    window.history.replaceState({}, '', '/dashboard/profile');

    expect(shouldHandleAuthFailureRedirect({ role: 'student', hasToken: false })).toBe(true);
  });
});
