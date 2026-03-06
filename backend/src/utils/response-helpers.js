/**
 * Standardized response helpers for Hono routes
 *
 * Unified format:
 *   Success:    { success: true,  data: any,  meta?: { total, page, limit } }
 *   Error:      { success: false, error: { message: string, code: string } }
 *   Paginated:  { success: true,  data: any[], meta: { total, page, limit, totalPages } }
 *
 * Usage:
 *   import { successResponse, errorResponse, paginatedResponse } from '../utils/response-helpers.js';
 */

// ========================================
// SUCCESS RESPONSE
// ========================================

/**
 * Send a successful JSON response
 * @param {import('hono').Context} c
 * @param {any} data - response payload
 * @param {object|null} meta - optional metadata (total, page, limit, etc.)
 * @param {number} status - HTTP status code (default 200)
 * @returns {Response}
 */
export function successResponse(c, data, meta = null, status = 200) {
  const body = { success: true, data };

  if (meta !== null && typeof meta === 'object') {
    body.meta = meta;
  }

  return c.json(body, status);
}

/**
 * Send a 201 Created response
 * @param {import('hono').Context} c
 * @param {any} data
 * @param {object|null} meta
 * @returns {Response}
 */
export function createdResponse(c, data, meta = null) {
  return successResponse(c, data, meta, 201);
}

// ========================================
// PAGINATED RESPONSE
// ========================================

/**
 * Send a paginated list response
 * @param {import('hono').Context} c
 * @param {Array} data - array of items for current page
 * @param {number} total - total items across all pages
 * @param {number} page - current page (1-based)
 * @param {number} limit - items per page
 * @returns {Response}
 */
export function paginatedResponse(c, data, total, page, limit) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  return c.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }, 200);
}

// ========================================
// ERROR RESPONSE
// ========================================

/**
 * Send an error JSON response
 * @param {import('hono').Context} c
 * @param {string} message - user-facing error message
 * @param {number} statusCode - HTTP status code (default 400)
 * @param {string} code - machine-readable error code (default 'ERROR')
 * @returns {Response}
 */
export function errorResponse(c, message, statusCode = 400, code = 'ERROR') {
  return c.json({
    success: false,
    error: { message, code },
  }, statusCode);
}

/**
 * 404 Not Found shortcut
 * @param {import('hono').Context} c
 * @param {string} message
 * @returns {Response}
 */
export function notFoundResponse(c, message = 'Không tìm thấy tài nguyên') {
  return errorResponse(c, message, 404, 'NOT_FOUND');
}

/**
 * 401 Unauthorized shortcut
 * @param {import('hono').Context} c
 * @param {string} message
 * @returns {Response}
 */
export function unauthorizedResponse(c, message = 'Chưa xác thực') {
  return errorResponse(c, message, 401, 'UNAUTHORIZED');
}

/**
 * 403 Forbidden shortcut
 * @param {import('hono').Context} c
 * @param {string} message
 * @returns {Response}
 */
export function forbiddenResponse(c, message = 'Không có quyền truy cập') {
  return errorResponse(c, message, 403, 'FORBIDDEN');
}

/**
 * 422 Validation Error shortcut
 * @param {import('hono').Context} c
 * @param {string} message
 * @returns {Response}
 */
export function validationErrorResponse(c, message = 'Dữ liệu không hợp lệ') {
  return errorResponse(c, message, 422, 'VALIDATION_ERROR');
}

/**
 * 500 Server Error shortcut — sanitizes internal details automatically
 * @param {import('hono').Context} c
 * @param {Error|string} err - logs internally, never leaks to client
 * @returns {Response}
 */
export function serverErrorResponse(c, err = null) {
  if (err) {
    console.error('[SERVER_ERROR]', err instanceof Error ? err.stack : err);
  }
  return errorResponse(c, 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.', 500, 'INTERNAL_SERVER_ERROR');
}
