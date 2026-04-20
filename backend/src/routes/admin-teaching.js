import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { getAdminClasses, getAdminSchedule, getAdminExams } from '../db/admin-teaching-queries.js';
import { requireAdmin } from '../middleware/auth-middleware.js';
const adminTeaching = new Hono();
// All routes require admin auth (teacher is admin with role='teacher')
adminTeaching.use('*', requireAdmin);
// ========================================
// GET /admin-teaching/my-classes
// ========================================
adminTeaching.get('/my-classes', async (c) => {
    try {
        const user = c.get('user');
        const classes = await getAdminClasses(c.env.DB, user.id);
        return jsonResponse({
            success: true,
            data: classes.results || [],
        });
    }
    catch (error) {
        console.error('Get admin classes error:', error);
        return errorResponse('Lỗi lấy danh sách lớp học', 500);
    }
});
// ========================================
// GET /admin-teaching/my-schedule
// ========================================
adminTeaching.get('/my-schedule', async (c) => {
    try {
        const user = c.get('user');
        const week_start = c.req.query('week_start') || new Date().toISOString().split('T')[0];
        const schedule = await getAdminSchedule(c.env.DB, user.id, week_start);
        return jsonResponse({
            success: true,
            data: schedule.results || [],
            week_start,
        });
    }
    catch (error) {
        console.error('Get admin schedule error:', error);
        return errorResponse('Lỗi lấy lịch học', 500);
    }
});
// ========================================
// GET /admin-teaching/my-exams
// ========================================
adminTeaching.get('/my-exams', async (c) => {
    try {
        const user = c.get('user');
        const exams = await getAdminExams(c.env.DB, user.id);
        return jsonResponse({
            success: true,
            data: exams.results || [],
        });
    }
    catch (error) {
        console.error('Get admin exams error:', error);
        return errorResponse('Lỗi lấy lịch thi', 500);
    }
});
export default adminTeaching;
