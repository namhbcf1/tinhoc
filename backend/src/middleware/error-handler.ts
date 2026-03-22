/**
 * Global error handler middleware for Hono
 * - Logs full error internally
 * - Returns sanitized response to client (never exposes stack traces or SQL errors in production)
 * - In development: includes `debug` field with full error details
 */

import type { Context } from 'hono';
import type { Env } from '../types/env.js';

// ========================================
// ERROR CODE MAP — classify common errors
// ========================================

const DB_ERROR_PATTERNS = [
  /SQLITE_/i,
  /D1_/i,
  /no such table/i,
  /UNIQUE constraint/i,
  /FOREIGN KEY constraint/i,
  /NOT NULL constraint/i,
  /syntax error/i,
];

const AUTH_ERROR_PATTERNS = [
  /jwt/i,
  /token/i,
  /unauthorized/i,
  /forbidden/i,
];

// Extended Error type with optional AppError fields
interface AppErrorLike extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Classify error into a user-facing code
 */
function classifyError(err: AppErrorLike): string {
  const msg = err.message || '';

  if (err.statusCode === 400 || err.code === 'VALIDATION') return 'VALIDATION_ERROR';
  if (err.statusCode === 401 || err.code === 'UNAUTHORIZED') return 'UNAUTHORIZED';
  if (err.statusCode === 403 || err.code === 'FORBIDDEN') return 'FORBIDDEN';
  if (err.statusCode === 404 || err.code === 'NOT_FOUND') return 'NOT_FOUND';
  if (err.statusCode === 429 || err.code === 'RATE_LIMIT') return 'RATE_LIMIT_EXCEEDED';

  if (DB_ERROR_PATTERNS.some(p => p.test(msg))) return 'DATABASE_ERROR';
  if (AUTH_ERROR_PATTERNS.some(p => p.test(msg))) return 'AUTH_ERROR';

  return 'INTERNAL_SERVER_ERROR';
}

/**
 * Sanitize error message — never expose SQL/stack internals to client
 */
function sanitizeMessage(err: AppErrorLike, code: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return err.message || 'Dữ liệu đầu vào không hợp lệ.';
    case 'UNAUTHORIZED':
      return 'Bạn chưa đăng nhập hoặc token đã hết hạn.';
    case 'FORBIDDEN':
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 'NOT_FOUND':
      return err.message || 'Không tìm thấy tài nguyên.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    case 'DATABASE_ERROR':
      return 'Lỗi xử lý dữ liệu. Vui lòng thử lại.';
    case 'AUTH_ERROR':
      return 'Xác thực thất bại.';
    default:
      return 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.';
  }
}

/**
 * Map error code to HTTP status
 */
function resolveStatus(code: string, err: AppErrorLike): number {
  if (err.statusCode && typeof err.statusCode === 'number') return err.statusCode;

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMIT_EXCEEDED: 429,
    DATABASE_ERROR: 500,
    AUTH_ERROR: 401,
    INTERNAL_SERVER_ERROR: 500,
  };

  return statusMap[code] || 500;
}

// ========================================
// HONO onError HANDLER
// ========================================

/**
 * Global error handler to be registered via app.onError()
 *
 * Usage in index.js:
 *   import { globalErrorHandler } from './middleware/error-handler.js';
 *   app.onError(globalErrorHandler);
 */
export function globalErrorHandler(err: Error, c: Context<{ Bindings: Env }>): Response {
  const appErr = err as AppErrorLike;
  const isDev = (c.env?.ENVIRONMENT || 'production') === 'development';

  // Always log full error server-side
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });

  const code = classifyError(appErr);
  const status = resolveStatus(code, appErr);
  const message = sanitizeMessage(appErr, code);

  const body: {
    success: boolean;
    error: { message: string; code: string; debug?: { original: string; stack?: string } };
  } = {
    success: false,
    error: {
      message,
      code,
    },
  };

  // In development only: attach debug details
  if (isDev) {
    body.error.debug = {
      original: err.message,
      stack: err.stack,
    };
  }

  return c.json(body, status as Parameters<typeof c.json>[1]);
}

// ========================================
// TYPED APP ERRORS — throw these in routes/services
// ========================================

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Không được phép') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Lỗi cơ sở dữ liệu') {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}
