import { verifyJWT, errorResponse } from '../utils/helpers.js';
import { getActiveSessionBySid, touchSession } from '../lib/auth/session-broker.js';
/**
 * Verify JWT and attach payload to context as 'user'.
 * Returns 401 if token is missing/invalid/expired.
 */
export const authMiddleware = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const cookieToken = c.req.header('Cookie')?.match(/(?:^|;\s*)token=([^;]+)/)?.[1];
    if (!authHeader && !cookieToken) {
        return errorResponse('Thiếu token xác thực', 401);
    }
    const token = authHeader ? authHeader.replace('Bearer ', '') : cookieToken || '';
    const raw = await verifyJWT(token, c.env.JWT_SECRET);
    const payload = raw;
    if (!payload) {
        return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401);
    }
    // verifyJWT already validates exp; double-check using seconds standard
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
        return errorResponse('Token đã hết hạn', 401);
    }
    if (payload.sid) {
        const session = await getActiveSessionBySid(c.env.DB, payload.sid);
        if (!session) {
            return errorResponse('Session đã bị thu hồi hoặc không còn hiệu lực', 401);
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
export const requireAdmin = async (c, next) => {
    return authMiddleware(c, (async () => {
        const user = c.get('user');
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'teacher')) {
            return errorResponse('Không có quyền truy cập. Yêu cầu quyền admin.', 403);
        }
        if (user.teacher_code || user.teacherCode || user.role === 'teacher') {
            c.set('teacher', user);
        }
        await next();
    }));
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
export const requireTeacher = async (c, next) => {
    return authMiddleware(c, (async () => {
        const user = c.get('user');
        const hasTeacherAccess = Boolean(user && (user.teacher_code || user.teacherCode || user.role === 'teacher'));
        if (!hasTeacherAccess) {
            return errorResponse('Không có quyền truy cập. Yêu cầu quyền giáo viên.', 403);
        }
        c.set('teacher', user);
        await next();
    }));
};
/**
 * Require authenticated user of any role.
 */
export const requireAuth = async (c, next) => {
    return authMiddleware(c, next);
};
