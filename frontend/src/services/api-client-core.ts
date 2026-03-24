// ========================================
// API CLIENT CORE
// Base class: constructor, token management, request/cachedRequest, auth methods
// Heavy fetch logic lives in api-request-engine.js
// ========================================

import { cachedFetch, clearAllCache, clearCacheByPrefix } from '../utils/cache.js';
import { getApiBaseUrl } from '../utils/api-base-url.js';
import { getStorageValue, removeStorageValue, setStorageValue } from '../utils/browser-storage.js';
import { validateTokenRole, executeRequest } from './api-request-engine.js';

export { getApiBaseUrl } from '../utils/api-base-url.js';

export class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    // Token is never stored on the instance — always read from localStorage per-request
    // to avoid cross-role token conflicts between admin/teacher/student sessions.
    this.token = null;
  }

  /** Auto-detect current role from the browser URL path */
  getCurrentRole() {
    if (typeof window === 'undefined') return 'student';
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    // Teacher routes now redirect to admin
    if (path.startsWith('/teacher')) return 'admin';
    return 'student';
  }

  /** Get token from localStorage for a specific role */
  getTokenByRole(role) {
    // teacher token is now admin token
    const keyMap = { admin: 'admin_token', teacher: 'admin_token', student: 'student_token' };
    return getStorageValue(keyMap[role] || 'student_token');
  }

  /**
   * Get token — uses explicit type or auto-detects role from URL path.
   */
  getToken(type = null) {
    if (type === 'student') return getStorageValue('student_token');
    if (type === 'admin' || type === 'teacher') return getStorageValue('admin_token');
    return this.getTokenByRole(this.getCurrentRole());
  }

  /**
   * Persist token in localStorage for a role.
   * Passing null clears only that role's token — does NOT touch other roles.
   */
  setToken(token, type = 'admin') {
    // teacher token now stored as admin_token
    const storageKey = type === 'student' ? 'student_token' : 'admin_token';
    if (token) {
      setStorageValue(storageKey, token);
    } else {
      removeStorageValue(storageKey);
    }
  }

  /** True if the JWT is expired or will expire within 5 minutes */
  isTokenExpired(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload.exp) {
        return payload.exp * 1000 - Date.now() < 5 * 60 * 1000;
      }
      return false; // No exp claim → treat as permanent
    } catch (e) {
      return false;
    }
  }

  /** Main request method — resolves token, validates role, then delegates to engine */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const explicitRole = options.tokenType === 'teacher' ? 'admin' : options.tokenType;
    const authRole = explicitRole || this.getCurrentRole();
    let token = this.getToken(options.tokenType);

    // Drop token if it belongs to a different role than expected
    token = validateTokenRole(token, options.tokenType);

    // Warn about nearing-expiry tokens (informational only — backend may not enforce)
    if (token && this.isTokenExpired(token)) {
      console.warn('Token may be expired but continuing request (backend may not enforce expiration)');
    }

    return executeRequest(url, endpoint, options, token, authRole);
  }

  /** Cached GET wrapper — skips cache for non-GET or when useCache=false */
  async cachedRequest(endpoint, options = {}, useCache = true) {
    if (options.method && options.method !== 'GET') {
      return this.request(endpoint, options);
    }
    const cacheOptions = typeof useCache === 'object'
      ? { enabled: useCache.enabled !== false, ttlMs: useCache.ttlMs }
      : { enabled: useCache !== false };
    const { retries, headers, signal, ...requestOptions } = options || {};
    const tokenForKey = this.getToken(options?.tokenType);
    const cacheIdentity = tokenForKey ? tokenForKey.slice(-16) : 'anonymous';
    const cacheKey = `${endpoint}::${cacheIdentity}::${JSON.stringify({
      ...requestOptions,
      headers: headers || {},
    })}`;
    return cachedFetch(
      cacheKey,
      () => this.request(endpoint, options),
      cacheOptions
    );
  }

  invalidateCache(prefixes = []) {
    prefixes.forEach(prefix => clearCacheByPrefix(prefix));
  }

  // ---- Auth ----

  /** Admin login — stores returned token */
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async exchangeSsoTicket(ticket, targetApp = 'edu') {
    return this.request('/sso/exchange', {
      method: 'POST',
      body: JSON.stringify({
        ticket,
        target_app: targetApp,
      }),
    });
  }

  /** Logout ALL roles — clears tokens and stored user data from both storages */
  logout() {
    const adminToken = this.getToken('admin');
    const studentToken = this.getToken('student');
    const revokeToken = adminToken || studentToken;

    if (revokeToken) {
      void fetch(`${this.baseURL}/auth/logout-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${revokeToken}`,
        },
      }).catch(() => null);
    }

    clearAllCache();
    const keys = ['admin_token', 'student_token',
      'student_cccd', 'student_sdt', 'student_data', 'studentCCCD',
      'teacher', 'admin'];
    keys.forEach(key => {
      removeStorageValue(key);
    });
  }

  /** Logout a single role — keeps other roles' sessions intact */
  logoutRole(role) {
    const token = this.getToken(role);
    if (token) {
      void fetch(`${this.baseURL}/auth/logout-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);
    }

    clearAllCache();
    // teacher uses admin token now
    const tokenKeyMap = { admin: 'admin_token', teacher: 'admin_token', student: 'student_token' };
    const dataKeyMap = {
      admin: ['admin', 'teacher'],
      teacher: ['admin', 'teacher'],
      student: ['student_cccd', 'student_sdt', 'student_data', 'studentCCCD'],
    };
    const tokenKey = tokenKeyMap[role];
    if (tokenKey) {
      removeStorageValue(tokenKey);
    }
    (dataKeyMap[role] || []).forEach(key => {
      removeStorageValue(key);
    });
  }
}
