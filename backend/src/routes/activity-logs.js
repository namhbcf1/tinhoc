import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { getActivityLogs, getActivityLogCount, } from '../db/admin-queries.js';
const activityLogs = new Hono();
// ========================================
// GET /activity-logs - Get activity logs
// ========================================
activityLogs.get('/', async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        // Only super_admin can view all logs, others can only view their own
        const adminId = user.role === 'super_admin'
            ? (c.req.query('admin_id') ? parseInt(c.req.query('admin_id')) : null)
            : user.id;
        const limit = parseInt(c.req.query('limit')) || 100;
        const offset = parseInt(c.req.query('offset')) || 0;
        const logs = await getActivityLogs(c.env.DB, adminId, limit, offset);
        const count = await getActivityLogCount(c.env.DB, adminId);
        return jsonResponse({
            success: true,
            data: logs,
            count,
            limit,
            offset,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy activity logs: ' + error.message, 500);
    }
});
export default activityLogs;
