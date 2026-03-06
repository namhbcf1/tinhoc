import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  markAttendance,
  getAttendanceByRegistration,
  getAttendanceByClass,
  getAttendanceStats,
} from '../db/attendance-queries.js';
import { createActivityLog } from '../db/admin-queries.js';

const attendance = new Hono();

// ========================================
// POST /attendance/batch - Mark attendance in batch
// ========================================
attendance.post('/batch', async (c) => {
  try {
    const user = c.get('user');
    
    if (!user) {
      return errorResponse('Chưa đăng nhập', 401);
    }
    
    // Allow both admin and teacher to mark attendance
    const allowedRoles = ['admin', 'super_admin', 'teacher'];
    if (!user.role || !allowedRoles.includes(user.role)) {
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
        
        const result = await markAttendance(
          c.env.DB,
          registration_id,
          class_id,
          attendance_date,
          status,
          notes || null,
          user.id,
          user.role === 'teacher' ? 'teacher' : 'admin'
        );

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
      } catch (error) {
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
      await createActivityLog(
        c.env.DB,
        user.id,
        'mark_attendance_batch',
        'attendance',
        null,
        `Marked attendance for ${results.length} students`,
        c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
        c.req.header('User-Agent')
      );
    }
    
    return jsonResponse({
      success: true,
      message: `Điểm danh thành công ${results.length}/${records.length} học viên`,
      data: {
        success_count: results.length,
        error_count: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      },
    }, 201);
  } catch (error) {
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
    const allowedRoles = ['admin', 'super_admin', 'teacher'];
    if (!user.role || !allowedRoles.includes(user.role)) {
      return errorResponse('Không có quyền điểm danh', 403);
    }
    
    const { registration_id, class_id, attendance_date, status, notes } = await c.req.json();
    
    if (!registration_id || !class_id || !attendance_date || !status) {
      return errorResponse('Thiếu thông tin bắt buộc', 400);
    }
    
    const result = await markAttendance(
      c.env.DB,
      registration_id,
      class_id,
      attendance_date,
      status,
      notes || null,
      user.id,
      user.role === 'teacher' ? 'teacher' : 'admin'
    );
    
    // Log activity
    await createActivityLog(
      c.env.DB,
      user.id,
      'mark_attendance',
      'attendance',
      result.meta.last_row_id,
      `Marked attendance: ${status} for registration ${registration_id}`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    );
    
    return jsonResponse({
      success: true,
      message: 'Điểm danh thành công',
      data: {
        id: result.meta.last_row_id,
      },
    }, 201);
  } catch (error) {
    return errorResponse('Lỗi điểm danh: ' + error.message, 500);
  }
});

// ========================================
// GET /attendance/registration/:id - Get attendance by registration
// ========================================
attendance.get('/registration/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const attendance = await getAttendanceByRegistration(c.env.DB, parseInt(id));
    
    return jsonResponse({
      success: true,
      data: attendance,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy điểm danh: ' + error.message, 500);
  }
});

// ========================================
// GET /attendance/class/:id - Get attendance by class
// ========================================
attendance.get('/class/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const date = c.req.query('date');
    
    const attendance = await getAttendanceByClass(c.env.DB, parseInt(id), date || null);
    const stats = await getAttendanceStats(c.env.DB, parseInt(id));
    
    return jsonResponse({
      success: true,
      data: attendance,
      stats,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy điểm danh: ' + error.message, 500);
  }
});

export default attendance;






