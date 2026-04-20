import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { getAllAdmins, getAdminCount, findAdminById, createAdmin, updateAdmin, deleteAdmin, findAdminByUsername, promoteLegacyTeacherAdmins, } from '../db/admin-queries.js';
import { hashPassword } from '../utils/helpers.js';
import { createActivityLog } from '../db/admin-queries.js';
const admins = new Hono();
// ========================================
// GET /admins - Get all admins
// ========================================
admins.get('/', async (c) => {
    try {
        const user = c.get('user');
        // Check permission - only super_admin can view all admins
        if (!user || user.role !== 'super_admin') {
            return errorResponse('Không có quyền truy cập', 403);
        }
        const limit = parseInt(c.req.query('limit')) || 100;
        const offset = parseInt(c.req.query('offset')) || 0;
        await promoteLegacyTeacherAdmins(c.env.DB);
        const adminsList = await getAllAdmins(c.env.DB, limit, offset);
        const count = await getAdminCount(c.env.DB);
        // Log activity
        await createActivityLog(c.env.DB, user.id, 'view_admins', 'admins', null, `Viewed ${adminsList.length} admins`, c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        return jsonResponse({
            success: true,
            data: adminsList,
            count,
            limit,
            offset,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy danh sách admin: ' + error.message, 500);
    }
});
// ========================================
// GET /admins/:id - Get admin by ID
// ========================================
admins.get('/:id', async (c) => {
    try {
        const user = c.get('user');
        const { id } = c.req.param();
        // Check permission
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        // Users can view their own profile, super_admin can view all
        if (user.id !== parseInt(id) && user.role !== 'super_admin') {
            return errorResponse('Không có quyền truy cập', 403);
        }
        const admin = await findAdminById(c.env.DB, parseInt(id));
        if (!admin) {
            return errorResponse('Không tìm thấy admin', 404);
        }
        return jsonResponse({
            success: true,
            data: admin,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy thông tin admin: ' + error.message, 500);
    }
});
// ========================================
// POST /admins - Create admin
// ========================================
admins.post('/', async (c) => {
    try {
        const user = c.get('user');
        // Only super_admin can create admins
        if (!user || user.role !== 'super_admin') {
            return errorResponse('Chỉ super admin mới có quyền tạo admin', 403);
        }
        const { username, password, full_name, role, email, phone } = await c.req.json();
        if (!username || !password || !full_name) {
            return errorResponse('Thiếu thông tin: username, password, full_name là bắt buộc', 400);
        }
        if (password.length < 6) {
            return errorResponse('Mật khẩu phải có ít nhất 6 ký tự', 400);
        }
        // Check if username exists
        const existing = await findAdminByUsername(c.env.DB, username);
        if (existing) {
            return errorResponse('Username đã tồn tại', 400);
        }
        // Hash password
        const passwordHash = await hashPassword(password);
        // Create admin
        const result = await createAdmin(c.env.DB, username, passwordHash, full_name, role || 'admin', email || null, phone || null, user.id);
        // Log activity
        await createActivityLog(c.env.DB, user.id, 'create_admin', 'admins', result.meta.last_row_id, `Created admin: ${username}`, c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        return jsonResponse({
            success: true,
            message: 'Tạo admin thành công',
            data: {
                id: result.meta.last_row_id,
                username,
                full_name,
                role: role === 'super_admin' ? 'super_admin' : 'admin',
            },
        }, 201);
    }
    catch (error) {
        return errorResponse('Lỗi tạo admin: ' + error.message, 500);
    }
});
// ========================================
// PUT /admins/:id - Update admin
// ========================================
admins.put('/:id', async (c) => {
    try {
        const user = c.get('user');
        const { id } = c.req.param();
        const updateData = await c.req.json();
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        const adminId = parseInt(id);
        // Check permission
        // Users can update their own profile (except role), super_admin can update all
        if (user.id !== adminId && user.role !== 'super_admin') {
            return errorResponse('Không có quyền cập nhật', 403);
        }
        // Only super_admin can change role
        if (updateData.role && user.role !== 'super_admin') {
            return errorResponse('Chỉ super admin mới có quyền thay đổi role', 403);
        }
        // Only super_admin can activate/deactivate
        if (updateData.active !== undefined && user.role !== 'super_admin') {
            return errorResponse('Chỉ super admin mới có quyền kích hoạt/vô hiệu hóa', 403);
        }
        await updateAdmin(c.env.DB, adminId, updateData);
        // Log activity
        await createActivityLog(c.env.DB, user.id, 'update_admin', 'admins', adminId, `Updated admin: ${JSON.stringify(updateData)}`, c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        return jsonResponse({
            success: true,
            message: 'Cập nhật admin thành công',
        });
    }
    catch (error) {
        return errorResponse('Lỗi cập nhật admin: ' + error.message, 500);
    }
});
// ========================================
// DELETE /admins/:id - Delete admin
// ========================================
admins.delete('/:id', async (c) => {
    try {
        const user = c.get('user');
        const { id } = c.req.param();
        // Only super_admin can delete admins
        if (!user || user.role !== 'super_admin') {
            return errorResponse('Chỉ super admin mới có quyền xóa admin', 403);
        }
        const adminId = parseInt(id);
        // Cannot delete yourself
        if (user.id === adminId) {
            return errorResponse('Không thể xóa chính mình', 400);
        }
        await deleteAdmin(c.env.DB, adminId);
        // Log activity
        await createActivityLog(c.env.DB, user.id, 'delete_admin', 'admins', adminId, `Deleted admin ID: ${adminId}`, c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        return jsonResponse({
            success: true,
            message: 'Xóa admin thành công',
        });
    }
    catch (error) {
        return errorResponse('Lỗi xóa admin: ' + error.message, 500);
    }
});
export default admins;
