// ========================================
// API CLIENT CORE
// Base class: constructor, token management, request/cachedRequest, auth methods
// Heavy fetch logic lives in api-request-engine.js
// ========================================

import { cachedFetch } from '../utils/cache.js';
import { validateTokenRole, executeRequest } from './api-request-engine.js';

// Auto-detect API base URL for local dev vs Cloudflare Pages vs custom domain
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' &&
    (window.location.hostname.includes('pages.dev') ||
      window.location.hostname.includes('cloudflare') ||
      window.location.hostname.includes('vantrangedu.com'))) {
    return 'https://vantrangedu-api.bangachieu2.workers.dev';
  }
  return '/api';
};

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
    if (path.startsWith('/teacher')) return 'teacher';
    return 'student';
  }

  /** Get token from localStorage for a specific role */
  getTokenByRole(role) {
    const keyMap = { admin: 'admin_token', teacher: 'teacher_token', student: 'student_token' };
    return localStorage.getItem(keyMap[role] || 'student_token');
  }

  /**
   * Get token — uses explicit type or auto-detects role from URL path.
   */
  getToken(type = null) {
    if (type === 'student') return localStorage.getItem('student_token');
    if (type === 'teacher') return localStorage.getItem('teacher_token');
    if (type === 'admin') return localStorage.getItem('admin_token');
    return this.getTokenByRole(this.getCurrentRole());
  }

  /**
   * Persist token in localStorage for a role.
   * Passing null clears only that role's token — does NOT touch other roles.
   */
  setToken(token, type = 'admin') {
    const storageKey = type === 'student' ? 'student_token' :
      type === 'teacher' ? 'teacher_token' : 'admin_token';
    if (token) {
      localStorage.setItem(storageKey, token);
    } else {
      localStorage.removeItem(storageKey);
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
    let token = this.getToken(options.tokenType);

    // Drop token if it belongs to a different role than expected
    token = validateTokenRole(token, options.tokenType);

    // Warn about nearing-expiry tokens (informational only — backend may not enforce)
    if (token && this.isTokenExpired(token)) {
      console.warn('Token may be expired but continuing request (backend may not enforce expiration)');
    }

    return executeRequest(url, endpoint, options, token);
  }

  /** Cached GET wrapper — skips cache for non-GET or when useCache=false */
  async cachedRequest(endpoint, options = {}, useCache = true) {
    if (options.method && options.method !== 'GET') {
      return this.request(endpoint, options);
    }
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    return cachedFetch(cacheKey, () => this.request(endpoint, options), useCache);
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

  /** Logout ALL roles — clears tokens and stored user data from both storages */
  logout() {
    const keys = ['admin_token', 'teacher_token', 'student_token',
      'student_cccd', 'student_sdt', 'student_data', 'studentCCCD',
      'teacher', 'admin'];
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  /** Logout a single role — keeps other roles' sessions intact */
  logoutRole(role) {
    const tokenKeyMap = { admin: 'admin_token', teacher: 'teacher_token', student: 'student_token' };
    const dataKeyMap = {
      admin: ['admin'],
      teacher: ['teacher'],
      student: ['student_cccd', 'student_sdt', 'student_data', 'studentCCCD'],
    };
    const tokenKey = tokenKeyMap[role];
    if (tokenKey) {
      localStorage.removeItem(tokenKey);
      sessionStorage.removeItem(tokenKey);
    }
    (dataKeyMap[role] || []).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}
