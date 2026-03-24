import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/utils/authRedirect.js', () => ({
  handleAuthFailureRedirect: vi.fn(),
  shouldHandleAuthFailureRedirect: vi.fn(() => true),
}));

import { executeRequest } from '../../src/services/api-request-engine';
import {
  handleAuthFailureRedirect,
  shouldHandleAuthFailureRedirect,
} from '../../src/utils/authRedirect.js';

function buildToken(role = 'student') {
  return `header.${btoa(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
}

describe('api-request-engine auth handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('triggers role-based redirect handling on 401 responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Token không hợp lệ hoặc đã hết hạn' }),
    });

    await expect(
      executeRequest(
        'https://example.com/api/homepage/settings',
        '/homepage/settings',
        { tokenType: 'student' },
        buildToken('student'),
        'student',
      ),
    ).rejects.toMatchObject({ status: 401 });

    expect(shouldHandleAuthFailureRedirect).toHaveBeenCalledWith({ role: 'student', hasToken: true });
    expect(handleAuthFailureRedirect).toHaveBeenCalledWith('student');
  });

  it('does not redirect on unrelated 403 permission errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Không có quyền truy cập' }),
    });

    await expect(
      executeRequest(
        'https://example.com/api/admins',
        '/admins',
        { tokenType: 'admin' },
        buildToken('admin'),
        'admin',
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(handleAuthFailureRedirect).not.toHaveBeenCalled();
  });
});
