import { getStorageScope, getStorageValue, setStorageValue, type StorageScope } from './browser-storage.js';

export const ADMIN_SESSION_UPDATED_EVENT = 'admin-session-updated';

export interface StoredAdminSession {
  role?: string | null;
  teacher_code?: string | null;
  teacherCode?: string | null;
  [key: string]: unknown;
}

function dispatchAdminSessionUpdated(admin: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_SESSION_UPDATED_EVENT, { detail: admin ?? null }));
}

export function getStoredAdminToken() {
  return getStorageValue('admin_token');
}

export function getStoredAdmin(): StoredAdminSession | null {
  const raw = getStorageValue('admin');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAdminSession;
  } catch {
    return null;
  }
}

function getTeacherCode(admin: StoredAdminSession | null | undefined) {
  const teacherCode = admin?.teacher_code ?? admin?.teacherCode;
  return typeof teacherCode === 'string' ? teacherCode.trim() : '';
}

export function canAccessExamFeeStatus(admin: StoredAdminSession | null | undefined) {
  const role = admin?.role;
  return (role === 'admin' || role === 'super_admin') && getTeacherCode(admin).length === 0;
}

export function persistAdminSession({
  token,
  admin,
  scope,
}: {
  token?: string | null;
  admin?: unknown;
  scope?: StorageScope | null;
}) {
  const resolvedScope = scope ?? getStorageScope('admin_token') ?? getStorageScope('admin') ?? 'local';

  if (typeof token === 'string' && token.length > 0) {
    setStorageValue('admin_token', token, resolvedScope);
  }

  if (typeof admin !== 'undefined') {
    setStorageValue('admin', JSON.stringify(admin), resolvedScope);
    dispatchAdminSessionUpdated(admin);
  }
}
