import { type MiddlewareHandler, type Next } from 'hono';
import { verifyJWT, errorResponse } from '../utils/helpers.js';
import type { Env, JWTPayload } from '../types/env.js';
import { getActiveSessionBySid, touchSession } from '../lib/auth/session-broker.js';

// ========================================
// SHARED AUTH MIDDLEWARE
// ========================================
// All routes MUST use these shared middlewares instead of copy-pasting inline auth.
// JWT exp is stored in SECONDS (JWT standard). Correct check: Math.floor(Date.now() / 1000) > payload.exp
// NOTE: Teaching staff is modeled as admin with teacher_code.

type AuthContext = { Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } };

/**
 * Verify JWT and attach payload to context as 'user'.
 * Returns 401 if token is missing/invalid/expired.
 */
export const authMiddleware: MiddlewareHandler<AuthContext> = async (c, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const cookieToken = c.req.header('Cookie')?.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

  if (!authHeader && !cookieToken) {
    return errorResponse('Thiếu token xác thực', 401) as Response;
  }

  const token = authHeader ? authHeader.replace('Bearer ', '') : cookieToken || '';
  const raw = await verifyJWT(token, c.env.JWT_SECRET);
  const payload = raw as JWTPayload | null;

  if (!payload) {
    return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401) as Response;
  }

  // verifyJWT already validates exp; double-check using seconds standard
  if (payload.exp && Math.floor(Date.now() / 1000) > (payload.exp as number)) {
    return errorResponse('Token đã hết hạn', 401) as Response;
  }

  // Enforce 90-day max session lifetime for student tokens (JWT exp might be far future)
  if (payload.sid && payload.role === 'student') {
    const issuedAt = Math.floor(payload.iat as number);
    const nowSec = Math.floor(Date.now() / 1000);
    const ninetyDays = 90 * 24 * 60 * 60;
    if (nowSec - issuedAt > ninetyDays) {
      return errorResponse('Session quá cũ, vui lòng đăng nhập lại', 401) as Response;
    }
  }

  if (payload.sid) {
    const session = await getActiveSessionBySid(c.env.DB, payload.sid);
    if (!session) {
      return errorResponse('Session đã bị thu hồi hoặc không còn hiệu lực', 401) as Response;
    }
    await touchSession(c.env.DB, session.sid);
  }

  c.set('user', payload);
  await next();
};

/**
 * Require admin-level access.
 * Legacy `teacher` sessions are still accepted for backward compatibility.
 */
export const requireAdmin: MiddlewareHandler<AuthContext> = async (c, next: Next) => {
  return authMiddleware(c, (async () => {
    const user = c.get('user');
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'teacher')) {
      return errorResponse('Không có quyền truy cập. Yêu cầu quyền admin.', 403);
    }
    if (user.teacher_code || user.teacherCode || user.role === 'teacher') {
      c.set('teacher', user);
    }
    await next();
  }) as Next);
};

/**
 * Alias for requireAdmin — teacher is admin now.
 * @deprecated Use requireAdmin instead
 */
export const requireAdminOrTeacher = requireAdmin;

/**
 * Require teaching-staff access.
 * Accepts admin sessions that carry teacher_code, plus legacy teacher sessions.
 */
export const requireTeacher: MiddlewareHandler<AuthContext> = async (c, next: Next) => {
  return authMiddleware(c, (async () => {
    const user = c.get('user');
    const hasTeacherAccess = Boolean(user && (user.teacher_code || user.teacherCode || user.role === 'teacher'));
    if (!hasTeacherAccess) {
      return errorResponse('Không có quyền truy cập. Yêu cầu quyền giáo viên.', 403);
    }
    c.set('teacher', user);
    await next();
  }) as Next);
};

/**
 * Require authenticated user of any role.
 */
export const requireAuth: MiddlewareHandler<AuthContext> = async (c, next: Next) => {
  return authMiddleware(c, next);
};
