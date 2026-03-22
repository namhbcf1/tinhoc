import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  assignTeacherToClass,
  removeTeacherAssignmentById,
  getClassTeachers,
} from '../db/class-teacher-queries.js';
import { findAdminById } from '../db/admin-queries.js';
import { requireAdmin } from '../middleware/auth-middleware.js';

const classTeachers = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// ========================================
// ADMIN AUTH MIDDLEWARE — use shared requireAdmin
// ========================================
const adminAuthMiddleware = async (c: any, next: any) => {
  await requireAdmin(c, async () => {
    c.set('admin', c.get('user'));
    await next();
  });
};

// ========================================
// GET /class-teachers/class/:class_id - Get teachers for a class (public)
// ========================================
classTeachers.get('/class/:class_id', async (c) => {
  try {
    const class_id = parseInt(c.req.param('class_id'));

    if (isNaN(class_id)) {
      return errorResponse('ID lớp học không hợp lệ', 400);
    }

    const teachers = await getClassTeachers(c.env.DB, class_id);

    return jsonResponse({
      success: true,
      data: teachers.results || [],
    });
  } catch (error: any) {
    console.error('Get class teachers error:', error);
    return errorResponse('Lỗi lấy danh sách giáo viên', 500);
  }
});

// ========================================
// POST /class-teachers - Assign teacher to class (admin only)
// Now accepts admin_id (admin with role='teacher')
// ========================================
classTeachers.post('/', adminAuthMiddleware, async (c) => {
  try {
    const data = await c.req.json();
    // Accept both admin_id and teacher_id for backward compat
    const class_id = data.class_id;
    const admin_id = data.admin_id || data.teacher_id;
    const role = data.role || 'teacher';

    if (!class_id || !admin_id) {
      return errorResponse('Thiếu class_id hoặc admin_id', 400);
    }

    if (!['teacher', 'assistant', 'coordinator'].includes(role)) {
      return errorResponse('Role không hợp lệ (teacher, assistant, coordinator)', 400);
    }

    // Check if class exists
    const classCheck = await c.env.DB.prepare('SELECT id FROM classes WHERE id = ?').bind(parseInt(class_id)).first();
    if (!classCheck) {
      return errorResponse('Lớp học không tồn tại', 404);
    }

    // Check if admin exists and has teacher role or any staff role
    const admin = await findAdminById(c.env.DB, parseInt(admin_id)) as any;
    if (!admin) {
      return errorResponse('Giáo viên không tồn tại', 404);
    }

    // Check if active
    if (admin.status && admin.status !== 'active') {
      return errorResponse('Giáo viên không hoạt động', 400);
    }

    try {
      const result = await assignTeacherToClass(c.env.DB, parseInt(class_id), parseInt(admin_id), role);

      // Get updated list
      const teachers = await getClassTeachers(c.env.DB, parseInt(class_id));
      const assigned = (teachers.results as any[])?.find((t: any) => t.assignment_id === result.meta.last_row_id);

      return jsonResponse({
        success: true,
        data: assigned,
        message: 'Gán giáo viên cho lớp thành công',
      }, 201);
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE constraint')) {
        return errorResponse('Giáo viên đã được gán cho lớp này', 400);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Assign teacher to class error:', error);
    return errorResponse('Lỗi gán giáo viên cho lớp', 500);
  }
});

// ========================================
// DELETE /class-teachers/:id - Remove teacher from class (admin only)
// ========================================
classTeachers.delete('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return errorResponse('ID không hợp lệ', 400);
    }

    await removeTeacherAssignmentById(c.env.DB, id);

    return jsonResponse({
      success: true,
      message: 'Gỡ giáo viên khỏi lớp thành công',
    });
  } catch (error: any) {
    console.error('Remove teacher from class error:', error);
    return errorResponse('Lỗi gỡ giáo viên khỏi lớp', 500);
  }
});

export default classTeachers;
