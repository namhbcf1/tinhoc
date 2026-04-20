import { Hono } from 'hono';
import { verifyPassword, hashPassword, verifyJWT, jsonResponse, errorResponse } from '../utils/helpers.js';
import { findAdminByUsername, updateAdminPassword, findAdminById, createPasswordResetToken, findPasswordResetToken, markPasswordResetTokenAsUsed, invalidateAllPasswordResetTokens, createAdmin } from '../db/queries.js';
import { updateAdminLastLogin, createActivityLog, getAdminCount, promoteLegacyTeacherAdmin, } from '../db/admin-queries.js';
import { loginRateLimiter } from '../utils/rate-limiter.js';
import { sendPasswordResetEmail } from '../utils/email-service.js';
import { authMiddleware } from '../middleware/auth-middleware.js';
import { issueSessionToken, revokeSessionBySid } from '../lib/auth/session-broker.js';
const auth = new Hono();
// ========================================
// POST /auth/login - Admin login
// ========================================
auth.post('/login', loginRateLimiter, async (c) => {
    try {
        let body;
        try {
            body = await c.req.json();
        }
        catch (jsonError) {
            return errorResponse('Invalid JSON in request body', 400);
        }
        const { username, password } = body;
        if (!username || !password) {
            return errorResponse('Thiếu username hoặc password', 400);
        }
        const admin = await findAdminByUsername(c.env.DB, username);
        if (!admin) {
            return errorResponse('Thông tin đăng nhập không chính xác', 401);
        }
        const isValid = await verifyPassword(password, admin.password_hash);
        if (!isValid) {
            return errorResponse('Thông tin đăng nhập không chính xác', 401);
        }
        await promoteLegacyTeacherAdmin(c.env.DB, Number(admin.id));
        const sessionRole = admin.role === 'super_admin' ? 'super_admin' : 'admin';
        // Update last login
        try {
            await updateAdminLastLogin(c.env.DB, admin.id);
        }
        catch (err) {
            console.error('Error updating last login:', err);
        }
        // Log activity (skip if table doesn't exist)
        try {
            await createActivityLog(c.env.DB, admin.id, 'login', 'auth', null, 'Admin logged in', c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        }
        catch (err) {
            console.error('Error logging activity:', err);
            // Continue without logging if table doesn't exist
        }
        const issued = await issueSessionToken(c.env.DB, c.env, {
            id: Number(admin.id),
            userType: 'admin',
            role: sessionRole,
            username: admin.username,
            teacherCode: admin.teacher_code || null,
            phone: admin.phone || admin.sdt || null,
            email: admin.email || null,
            displayName: admin.full_name || admin.ho_ten_full || admin.username,
        }, 'edu');
        return jsonResponse({
            success: true,
            token: issued.token,
            sid: issued.sid,
            expires_at: issued.expiresAt,
            admin: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name || admin.ho_ten_full,
                role: sessionRole,
                teacher_code: admin.teacher_code || undefined,
                department: admin.department || undefined,
                ho_ten_full: admin.ho_ten_full || undefined,
            },
        });
    }
    catch (error) {
        return errorResponse('Lỗi đăng nhập: ' + error.message, 500);
    }
});
// ========================================
// POST /auth/verify - Verify JWT token
// ========================================
auth.post('/verify', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader) {
            return errorResponse('Thiếu token', 401);
        }
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        if (!payload) {
            return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401);
        }
        return jsonResponse({ success: true, user: payload });
    }
    catch (error) {
        return errorResponse('Lỗi xác thực: ' + error.message, 500);
    }
});
auth.get('/session', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        return jsonResponse({
            success: true,
            user: {
                id: user.id,
                type: user.user_type || user.type,
                name: user.display_name || user.ho_ten || user.username || '',
                email: user.email || undefined,
                phone: user.phone || undefined,
                cccd: user.cccd || undefined,
                teacher_code: user.teacher_code || user.teacherCode || undefined,
                teacherCode: user.teacher_code || user.teacherCode || undefined,
            },
            session: {
                sid: user.sid || null,
                aud: user.aud || null,
                sub: user.sub || null,
                role: user.role || null,
            },
        });
    }
    catch (error) {
        return errorResponse('Không thể lấy session hiện tại', 500);
    }
});
auth.post('/logout-all', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        if (user?.sid) {
            await revokeSessionBySid(c.env.DB, user.sid);
        }
        return jsonResponse({
            success: true,
        }, 200, {
            'Set-Cookie': 'token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
        });
    }
    catch (error) {
        return errorResponse('Không thể đăng xuất toàn bộ phiên', 500);
    }
});
// ========================================
// POST /auth/create-admin - Create admin account (one-time setup)
// ========================================
auth.post('/create-admin', async (c) => {
    try {
        const { username, password, full_name, role } = await c.req.json();
        if (!username || !password || !full_name) {
            return errorResponse('Thiếu thông tin: username, password, full_name là bắt buộc', 400);
        }
        // Security check: Only allow creation if no admins exist (initial setup)
        const adminCount = await getAdminCount(c.env.DB);
        if (adminCount > 0) {
            return errorResponse('Chỉ được phép tạo admin khi chưa có tài khoản nào trong hệ thống', 403);
        }
        // Kiểm tra admin đã tồn tại chưa
        const existingAdmin = await findAdminByUsername(c.env.DB, username);
        if (existingAdmin) {
            return errorResponse('Tài khoản admin đã tồn tại', 400);
        }
        // Hash password
        const passwordHash = await hashPassword(password);
        // Tạo admin
        const result = await createAdmin(c.env.DB, username, passwordHash, full_name, role || 'admin');
        return jsonResponse({
            success: true,
            message: 'Tạo tài khoản admin thành công',
            admin: {
                id: result.meta.last_row_id,
                username,
                full_name,
                role: role === 'super_admin' ? 'super_admin' : 'admin'
            }
        });
    }
    catch (error) {
        return errorResponse('Lỗi tạo admin: ' + error.message, 500);
    }
});
// ========================================
// POST /auth/forgot-password - Request password reset
// ========================================
auth.post('/forgot-password', async (c) => {
    try {
        const { username } = await c.req.json();
        if (!username) {
            return errorResponse('Vui lòng nhập username', 400);
        }
        const admin = await findAdminByUsername(c.env.DB, username);
        if (!admin) {
            // Don't reveal if user exists (security best practice)
            return jsonResponse({
                success: true,
                message: 'Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.',
            });
        }
        // Generate reset token
        const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        // Invalidate all previous tokens
        await invalidateAllPasswordResetTokens(c.env.DB, admin.id);
        // Create new token
        await createPasswordResetToken(c.env.DB, admin.id, resetToken, expiresAt.toISOString());
        // Send email with reset link
        try {
            const frontendUrl = c.env.FRONTEND_URL || 'https://vantrangedu-3vg.pages.dev';
            const adminEmail = c.env.ADMIN_EMAIL || admin.username + '@sontrang.edu.vn';
            await sendPasswordResetEmail(adminEmail, resetToken, frontendUrl, c.env);
            return jsonResponse({
                success: true,
                message: 'Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.',
            });
        }
        catch (emailError) {
            console.error('Error sending email:', emailError);
            // Fallback: return token in development mode
            if (c.env.ENVIRONMENT === 'development') {
                return jsonResponse({
                    success: true,
                    message: 'Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.',
                    resetToken: resetToken, // Only in development
                });
            }
            return jsonResponse({
                success: true,
                message: 'Nếu tài khoản tồn tại, email đặt lại mật khẩu đã được gửi.',
            });
        }
    }
    catch (error) {
        console.error('Forgot password error:', error);
        return errorResponse('Lỗi xử lý yêu cầu: ' + error.message, 500);
    }
});
// ========================================
// POST /auth/reset-password - Reset password with token
// ========================================
auth.post('/reset-password', async (c) => {
    try {
        const { token, newPassword } = await c.req.json();
        if (!token || !newPassword) {
            return errorResponse('Thiếu token hoặc mật khẩu mới', 400);
        }
        if (newPassword.length < 8) {
            return errorResponse('Mật khẩu phải có ít nhất 8 ký tự', 400);
        }
        // Find token
        const resetToken = await findPasswordResetToken(c.env.DB, token);
        if (!resetToken) {
            return errorResponse('Token không hợp lệ hoặc đã hết hạn', 400);
        }
        // Hash new password
        const passwordHash = await hashPassword(newPassword);
        // Update password
        await updateAdminPassword(c.env.DB, resetToken.admin_id, passwordHash);
        // Mark token as used
        await markPasswordResetTokenAsUsed(c.env.DB, token);
        // Invalidate all sessions for this admin
        // Note: In production, you'd use Redis/KV to invalidate sessions
        // For now, we'll rely on JWT expiration
        return jsonResponse({
            success: true,
            message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        return errorResponse('Lỗi đặt lại mật khẩu: ' + error.message, 500);
    }
});
// ========================================
// POST /auth/change-password - Change password (requires auth)
// ========================================
auth.post('/change-password', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader) {
            return errorResponse('Thiếu token xác thực', 401);
        }
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        if (!payload) {
            return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401);
        }
        const { currentPassword, newPassword } = await c.req.json();
        if (!currentPassword || !newPassword) {
            return errorResponse('Thiếu mật khẩu hiện tại hoặc mật khẩu mới', 400);
        }
        if (newPassword.length < 8) {
            return errorResponse('Mật khẩu phải có ít nhất 8 ký tự', 400);
        }
        // Get admin
        const admin = await findAdminById(c.env.DB, payload.id);
        if (!admin) {
            return errorResponse('Không tìm thấy tài khoản', 404);
        }
        // Verify current password
        const isValid = await verifyPassword(currentPassword, admin.password_hash);
        if (!isValid) {
            return errorResponse('Mật khẩu hiện tại không đúng', 401);
        }
        // Hash new password
        const passwordHash = await hashPassword(newPassword);
        // Update password
        await updateAdminPassword(c.env.DB, admin.id, passwordHash);
        return jsonResponse({
            success: true,
            message: 'Đổi mật khẩu thành công',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        return errorResponse('Lỗi đổi mật khẩu: ' + error.message, 500);
    }
});
export default auth;
