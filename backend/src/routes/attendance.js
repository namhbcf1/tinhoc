import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { markAttendance, getAttendanceByRegistration, getAttendanceByClass, getAttendanceStats, getOnlineAttendanceByStudent, } from '../db/attendance-queries.js';
import { createActivityLog } from '../db/admin-queries.js';
const attendance = new Hono();
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'teacher']);
function isStaffUser(user) {
    if (!user) {
        return false;
    }
    return (ADMIN_ROLES.has(String(user.role || ''))
        || user.type === 'admin'
        || user.user_type === 'admin');
}
function getUserId(user) {
    const value = Number(user?.id ?? user?.userId ?? user?.sub);
    return Number.isFinite(value) && value > 0 ? value : null;
}
async function getRegistrationOwnerStudentId(db, registrationId) {
    if (registrationId < 0) {
        return Math.abs(registrationId);
    }
    const row = await db.prepare(`
    SELECT student_id
    FROM registrations
    WHERE id = ?
    LIMIT 1
  `).bind(registrationId).first();
    const ownerId = Number(row?.student_id);
    return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
}
// ========================================
// POST /attendance/batch - Mark attendance in batch
// ========================================
attendance.post('/batch', async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        if (!user || !['admin', 'super_admin'].includes(String(user.role || ''))) {
            return errorResponse('Không có quyền điểm danh', 403);
        }
        const { records } = await c.req.json();
        if (!Array.isArray(records) || records.length === 0) {
            return errorResponse('Thiếu danh sách điểm danh', 400);
        }
        const results = [];
        const errors = [];
        // Process all records in parallel
        const promises = records.map(async (record) => {
            const { registration_id, class_id, attendance_date, status, notes } = record;
            if (!registration_id || !class_id || !attendance_date || !status) {
                const errorMsg = `Thiếu thông tin: registration_id=${registration_id}, class_id=${class_id}, date=${attendance_date}, status=${status}`;
                console.error('[Attendance Batch] Validation error:', errorMsg);
                errors.push({ record, error: errorMsg });
                return null;
            }
            try {
                console.log(`[Attendance Batch] Processing: registration_id=${registration_id}, class_id=${class_id}, date=${attendance_date}, status=${status}, marked_by=${user.id}, role=${user.role}`);
                const result = await markAttendance(c.env.DB, registration_id, class_id, attendance_date, status, notes || null, user.id, 'admin');
                if (!result || !result.meta) {
                    throw new Error('markAttendance returned invalid result');
                }
                console.log(`[Attendance Batch] Success: registration_id=${registration_id}, last_row_id=${result.meta.last_row_id}`);
                results.push({
                    registration_id,
                    id: result.meta.last_row_id,
                    success: true,
                });
                return result.meta.last_row_id;
            }
            catch (error) {
                const errorMsg = error.message || String(error);
                console.error(`[Attendance Batch] Error for registration_id=${registration_id}:`, errorMsg, error);
                errors.push({
                    record,
                    error: errorMsg,
                    details: error.stack || String(error)
                });
                return null;
            }
        });
        await Promise.all(promises);
        // Log activity for batch
        if (results.length > 0) {
            await createActivityLog(c.env.DB, user.id, 'mark_attendance_batch', 'attendance', null, `Marked attendance for ${results.length} students`, c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        }
        const hasErrors = errors.length > 0;
        const hasSuccess = results.length > 0;
        const statusCode = hasErrors ? (hasSuccess ? 207 : 400) : 201;
        return jsonResponse({
            success: !hasErrors,
            message: hasErrors
                ? `Điểm danh thành công ${results.length}/${records.length} học viên`
                : `Điểm danh thành công ${results.length}/${records.length} học viên`,
            data: {
                success_count: results.length,
                error_count: errors.length,
                results,
                errors: errors.length > 0 ? errors : undefined,
            },
        }, statusCode);
    }
    catch (error) {
        return errorResponse('Lỗi điểm danh hàng loạt: ' + error.message, 500);
    }
});
// ========================================
// POST /attendance - Mark attendance
// ========================================
attendance.post('/', async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        // Allow both admin and teacher to mark attendance
        if (!isStaffUser(user)) {
            return errorResponse('Không có quyền điểm danh', 403);
        }
        const { registration_id, class_id, attendance_date, status, notes } = await c.req.json();
        if (!registration_id || !class_id || !attendance_date || !status) {
            return errorResponse('Thiếu thông tin bắt buộc', 400);
        }
        const result = await markAttendance(c.env.DB, registration_id, class_id, attendance_date, status, notes || null, user.id, 'admin');
        // Log activity
        await createActivityLog(c.env.DB, user.id, 'mark_attendance', 'attendance', result.meta.last_row_id, `Marked attendance: ${status} for registration ${registration_id}`, c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'), c.req.header('User-Agent'));
        return jsonResponse({
            success: true,
            message: 'Điểm danh thành công',
            data: {
                id: result.meta.last_row_id,
            },
        }, 201);
    }
    catch (error) {
        return errorResponse('Lỗi điểm danh: ' + error.message, 500);
    }
});
// ========================================
// GET /attendance/student/:id/online - Get online attendance summary by student
// ========================================
attendance.get('/student/:id/online', async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        const studentId = parseInt(c.req.param('id'));
        if (!Number.isFinite(studentId) || studentId <= 0) {
            return errorResponse('studentId không hợp lệ', 400);
        }
        if (!isStaffUser(user)) {
            const userId = getUserId(user);
            if (!userId || userId !== studentId) {
                return errorResponse('Không có quyền xem điểm danh online này', 403);
            }
        }
        const onlineAttendance = await getOnlineAttendanceByStudent(c.env.DB, studentId);
        return jsonResponse({
            success: true,
            data: onlineAttendance,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy điểm danh online: ' + error.message, 500);
    }
});
// ========================================
// GET /attendance/registration/:id - Get attendance by registration
// ========================================
attendance.get('/registration/:id', async (c) => {
    try {
        const user = c.get('user');
        if (!user) {
            return errorResponse('Chưa đăng nhập', 401);
        }
        const { id } = c.req.param();
        const registrationId = parseInt(id);
        if (!Number.isFinite(registrationId)) {
            return errorResponse('registrationId không hợp lệ', 400);
        }
        if (!isStaffUser(user)) {
            const userId = getUserId(user);
            const ownerStudentId = await getRegistrationOwnerStudentId(c.env.DB, registrationId);
            if (!userId || !ownerStudentId) {
                return errorResponse('Không tìm thấy dữ liệu điểm danh', 404);
            }
            if (userId !== ownerStudentId) {
                return errorResponse('Không có quyền xem điểm danh này', 403);
            }
        }
        const attendance = await getAttendanceByRegistration(c.env.DB, registrationId);
        return jsonResponse({
            success: true,
            data: attendance,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy điểm danh: ' + error.message, 500);
    }
});
// ========================================
// GET /attendance/class/:id - Get attendance by class
// ========================================
attendance.get('/class/:id', async (c) => {
    try {
        const user = c.get('user');
        if (!isStaffUser(user)) {
            return errorResponse('Không có quyền xem danh sách điểm danh lớp', 403);
        }
        const { id } = c.req.param();
        const date = c.req.query('date');
        const attendance = await getAttendanceByClass(c.env.DB, parseInt(id), date || null);
        const stats = await getAttendanceStats(c.env.DB, parseInt(id));
        return jsonResponse({
            success: true,
            data: attendance,
            stats,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy điểm danh: ' + error.message, 500);
    }
});
export default attendance;
