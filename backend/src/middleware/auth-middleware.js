import { verifyJWT, errorResponse } from '../utils/helpers.js';

// ========================================
// SHARED AUTH MIDDLEWARE
// ========================================
// All routes MUST use these shared middlewares instead of copy-pasting inline auth.
// JWT exp is stored in SECONDS (JWT standard). Correct check: Math.floor(Date.now() / 1000) > payload.exp

/**
 * Verify JWT and attach payload to context as 'user'.
 * Returns 401 if token is missing/invalid/expired.
 */
export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return errorResponse('Thiếu token xác thực', 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401);
  }

  // verifyJWT already validates exp; double-check using seconds standard
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    return errorResponse('Token đã hết hạn', 401);
  }

  c.set('user', payload);
  await next();
};

/**
 * Require admin or super_admin role.
 */
export const requireAdmin = async (c, next) => {
  await authMiddleware(c, async () => {
    const user = c.get('user');
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('Không có quyền truy cập. Yêu cầu quyền admin.', 403);
    }
    await next();
  });
};

/**
 * Require admin, super_admin, or teacher role.
 */
export const requireAdminOrTeacher = async (c, next) => {
  await authMiddleware(c, async () => {
    const user = c.get('user');
    if (
      !user ||
      (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'teacher')
    ) {
      return errorResponse('Không có quyền truy cập. Yêu cầu quyền admin hoặc giáo viên.', 403);
    }
    await next();
  });
};

/**
 * Require teacher role only.
 */
export const requireTeacher = async (c, next) => {
  await authMiddleware(c, async () => {
    const user = c.get('user');
    if (!user || user.role !== 'teacher') {
      return errorResponse('Không có quyền truy cập. Yêu cầu quyền giáo viên.', 403);
    }
    // Some routes use c.get('teacher') — keep compatible
    c.set('teacher', user);
    await next();
  });
};

/**
 * Require authenticated user of any role (admin, teacher, or student).
 */
export const requireAuth = async (c, next) => {
  await authMiddleware(c, next);
};
