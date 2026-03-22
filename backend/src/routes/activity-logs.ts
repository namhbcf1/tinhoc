import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  getActivityLogs,
  getActivityLogCount,
} from '../db/admin-queries.js';

const activityLogs = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

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
    const adminId = (user as any).role === 'super_admin'
      ? (c.req.query('admin_id') ? parseInt(c.req.query('admin_id') as string) : null)
      : (user as any).id;

    const limit = parseInt(c.req.query('limit') as string) || 100;
    const offset = parseInt(c.req.query('offset') as string) || 0;

    const logs = await getActivityLogs(c.env.DB, adminId, limit, offset);
    const count = await getActivityLogCount(c.env.DB, adminId);

    return jsonResponse({
      success: true,
      data: logs,
      count,
      limit,
      offset,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy activity logs: ' + error.message, 500);
  }
});

export default activityLogs;
