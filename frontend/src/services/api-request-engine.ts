// @ts-nocheck
// ========================================
// API REQUEST ENGINE
// Core fetch logic: token injection, role validation, retry, cache write
// Imported and used exclusively by api-client-core.js
// ========================================

import {
  handleAuthFailureRedirect,
  shouldHandleAuthFailureRedirect,
} from '../utils/authRedirect.js';

/** Public endpoints that never require an Authorization header */
const PUBLIC_ENDPOINTS = [
  '/students/register',
  '/students/login',
  '/classes/open',
  '/certificates/lookup',
  '/documents/cccd/',
  '/documents/download',
  '/auth/login',
  '/sso/exchange',
  '/teachers/login',
  '/exam-categories',
  '/exam-types',
  '/program-organizers',
  '/programs',
  '/program-levels',
  '/templates',
  '/public/student-feedbacks',
];

/** Protected path prefixes that warrant a console warning when token missing */
const PROTECTED_PATTERNS = [
  '/admin', '/payments', '/reports', '/admins',
  '/backup', '/activity-logs', '/teachers',
];

/**
 * Validate that a token's embedded role matches the expected tokenType.
 * Returns null if the token is mismatched; original token otherwise.
 */
export function validateTokenRole(token, expected) {
  if (!token || !expected) return token;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    const role = payload?.role;
    if (!role) return token; // Legacy token without role claim — keep it
    const validForAdmin = expected === 'admin' && (role === 'admin' || role === 'super_admin' || role === 'teacher');
    if (
      (expected === 'student' && role !== 'student') ||
      (expected === 'admin' && !validForAdmin)
    ) {
      return null; // Mismatched — drop to prevent wrong-role 403s
    }
    return token;
  } catch (e) {
    return null; // Undecipherable token — treat as unauthenticated
  }
}

/**
 * Core fetch with retry, error normalisation and response caching.
 * `this` is bound to the ApiClient instance.
 */
export async function executeRequest(url, endpoint, options, token, authRole = null) {
  const fetchOptions = { ...(options || {}) };
  const method = String(fetchOptions.method || 'GET').toUpperCase();
  const maxRetries = fetchOptions.retries || 0;
  const timeoutMs = Number(fetchOptions.timeoutMs) > 0 ? Number(fetchOptions.timeoutMs) : 30000;
  delete fetchOptions.retries;
  delete fetchOptions.timeoutMs;
  delete fetchOptions.cacheTTL;
  delete fetchOptions.cacheKey;
  delete fetchOptions.useCache;
  const isFormDataBody =
    typeof FormData !== 'undefined' && fetchOptions?.body instanceof FormData;

  const headers = {
    ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
    ...fetchOptions.headers,
  };

  const isPublicEndpoint = method === 'GET' && PUBLIC_ENDPOINTS.some(p => endpoint.includes(p));

  if (token && !isPublicEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (!isPublicEndpoint) {
    if (PROTECTED_PATTERNS.some(p => endpoint.includes(p))) {
      console.warn('No token found for protected endpoint:', endpoint);
    }
  }

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        let errMessage = 'Request failed';
        if (error.error) {
          if (typeof error.error === 'string') {
            errMessage = error.error;
          } else {
            // Zod validation error — trích xuất field names từ details
            errMessage = error.error.message || errMessage;
            if (error.error.details) {
              const fieldErrors = Object.entries(error.error.details)
                .filter(([k, v]) => k !== '_errors' && v?._errors?.length)
                .map(([field, v]) => `${field}: ${v._errors.join(', ')}`)
                .join(' | ');
              if (fieldErrors) errMessage += ` — ${fieldErrors}`;
            }
          }
        } else if (error.message) {
          errMessage = error.message;
        }
        const err = new Error(errMessage);
        err.status = response.status;
        err.code = error?.code || error?.error?.code || null;
        err.details = error?.details || error?.error?.details || null;

        // Auth errors — log token payload, redirect out of protected areas, and do not retry
        if (response.status === 401 || response.status === 403) {
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              console.error('Auth error - Token payload:', payload);
            } catch (e) {
              console.error('Could not decode token');
            }
          }

          const normalizedMessage = String(errMessage || '').toLowerCase();
          const isSessionExpiryError =
            response.status === 401 ||
            /token|hết hạn|het han|unauthorized|thiếu token|thieu token|đăng nhập|dang nhap/.test(normalizedMessage);

          if (
            isSessionExpiryError &&
            shouldHandleAuthFailureRedirect({ role: authRole, hasToken: Boolean(token) })
          ) {
            handleAuthFailureRedirect(authRole);
          }

          throw err;
        }

        // Retry on 5xx
        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          lastError = err;
          continue;
        }

        throw err;
      }

      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      // Timeout — surface a user-friendly message and do not retry
      if (error.name === 'AbortError') {
        throw new Error(`Yêu cầu quá thời gian sau ${Math.round(timeoutMs / 1000)} giây. Vui lòng thử lại.`);
      }
      // Network-level errors — retry
      if ((error.message.includes('fetch') || error.message.includes('Network')) && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Request failed after retries');
}
