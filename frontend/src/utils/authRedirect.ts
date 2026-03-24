import { removeStorageValue } from './browser-storage.js';
import { clearAllCache } from './cache.js';
import { ADMIN_SESSION_UPDATED_EVENT } from './adminSession.js';
import { STUDENT_SESSION_UPDATED_EVENT } from './studentDataLoader.js';

export type AuthRole = 'admin' | 'student';

const AUTH_REDIRECT_GUARD_KEY = 'auth_redirect_guard_v1';
const AUTH_REDIRECT_GUARD_TTL_MS = 2000;

export function getLoginPathForRole(role: AuthRole): string {
  return role === 'admin' ? '/admin/login' : '/login';
}

export function normalizeAuthRole(role?: string | null): AuthRole | null {
  if (role === 'admin' || role === 'teacher') return 'admin';
  if (role === 'student') return 'student';

  if (typeof window === 'undefined') return null;

  const path = window.location.pathname || '';
  if (path.startsWith('/admin') || path.startsWith('/teacher')) return 'admin';
  if (path.startsWith('/dashboard')) return 'student';
  return null;
}

export function isProtectedAuthPath(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  return path.startsWith('/admin') || path.startsWith('/teacher') || path.startsWith('/dashboard');
}

export function shouldHandleAuthFailureRedirect({
  role,
  hasToken,
}: {
  role?: string | null;
  hasToken?: boolean;
}): boolean {
  const normalizedRole = normalizeAuthRole(role);
  if (!normalizedRole || typeof window === 'undefined') return false;
  return Boolean(hasToken) || isProtectedAuthPath();
}

export function clearAuthSession(role: AuthRole) {
  clearAllCache();

  if (role === 'admin') {
    ['admin_token', 'admin', 'teacher'].forEach(removeStorageValue);
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_UPDATED_EVENT, { detail: null }));
    return;
  }

  ['student_token', 'student_cccd', 'student_sdt', 'student_data', 'studentCCCD'].forEach(removeStorageValue);
  window.dispatchEvent(new CustomEvent(STUDENT_SESSION_UPDATED_EVENT, { detail: null }));
}

export function redirectToLoginPath(path: string) {
  window.location.replace(path);
}

function recentlyRedirected(role: AuthRole): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.sessionStorage.getItem(AUTH_REDIRECT_GUARD_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as { role?: string; at?: number } | null;
    if (!parsed?.at || !parsed?.role) return false;

    return parsed.role === role && Date.now() - parsed.at < AUTH_REDIRECT_GUARD_TTL_MS;
  } catch {
    return false;
  }
}

function markRedirect(role: AuthRole) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(
    AUTH_REDIRECT_GUARD_KEY,
    JSON.stringify({ role, at: Date.now() }),
  );
}

export function handleAuthFailureRedirect(
  role?: string | null,
  redirect: (path: string) => void = redirectToLoginPath,
): boolean {
  const normalizedRole = normalizeAuthRole(role);
  if (!normalizedRole || typeof window === 'undefined') return false;

  clearAuthSession(normalizedRole);

  const loginPath = getLoginPathForRole(normalizedRole);
  if (window.location.pathname === loginPath || recentlyRedirected(normalizedRole)) {
    return true;
  }

  markRedirect(normalizedRole);
  redirect(loginPath);
  return true;
}
