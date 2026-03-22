import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { hashPassword, jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  findAdminByTeacherCode,
  findAdminById,
  createTeacherAdmin,
  updateAdmin,
  getAllStaffTeachers,
  searchStaffTeachers,
} from '../db/admin-queries.js';
import { getAdminClasses, getAdminSchedule, getAdminExams } from '../db/admin-teaching-queries.js';
import { requireAdmin } from '../middleware/auth-middleware.js';

const teachers = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// ========================================
// AUTH MIDDLEWARES
// ========================================
const adminAuthMiddleware = async (c: any, next: any) => {
  await requireAdmin(c, async () => {
    c.set('admin', c.get('user'));
    await next();
  });
};

// ========================================
// TEACHER SELF-SERVICE ROUTES (for admin with role='teacher')
// ========================================

// GET /teachers/my-classes - Get teacher's classes (teacher role required)
teachers.get('/my-classes', adminAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;
    const classes = await getAdminClasses(c.env.DB, user.id);
    return jsonResponse({
      success: true,
      data: classes.results || [],
    });
  } catch (error: any) {
    console.error('Get teacher classes error:', error);
    return errorResponse('Lỗi lấy danh sách lớp học', 500);
  }
});

// GET /teachers/my-schedule - Get teacher's schedule
teachers.get('/my-schedule', adminAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;
    const week_start = c.req.query('week_start') || new Date().toISOString().split('T')[0];
    const schedule = await getAdminSchedule(c.env.DB, user.id, week_start);
    return jsonResponse({
      success: true,
      data: schedule.results || [],
      week_start,
    });
  } catch (error: any) {
    console.error('Get teacher schedule error:', error);
    return errorResponse('Lỗi lấy lịch học', 500);
  }
});

// GET /teachers/my-exams - Get teacher's exams
teachers.get('/my-exams', adminAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;
    const exams = await getAdminExams(c.env.DB, user.id);
    return jsonResponse({
      success: true,
      data: exams.results || [],
    });
  } catch (error: any) {
    console.error('Get teacher exams error:', error);
    return errorResponse('Lỗi lấy lịch thi', 500);
  }
});

// GET /teachers/profile - backward compat: get teacher profile from admins
teachers.get('/profile', adminAuthMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;
    const teacherData = await findAdminById(c.env.DB, user.id);
    if (!teacherData) {
      return errorResponse('Không tìm thấy thông tin giáo viên', 404);
    }
    return jsonResponse({
      success: true,
      data: teacherData,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy thông tin giáo viên', 500);
  }
});

// ========================================
// ADMIN CRUD ROUTES — manage teachers (admins with role='teacher')
// ========================================

// GET /teachers - Get all teachers (admin only)
teachers.get('/', adminAuthMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const keyword = c.req.query('keyword');

    let result;
    if (keyword) {
      result = await searchStaffTeachers(c.env.DB, keyword);
    } else {
      result = await getAllStaffTeachers(c.env.DB, limit, offset);
    }

    return jsonResponse({
      success: true,
      data: result.results || [],
      total: result.results?.length || 0,
    });
  } catch (error: any) {
    console.error('Get teachers error:', error);
    return errorResponse('Lỗi lấy danh sách giáo viên', 500);
  }
});

// POST /teachers - Create teacher (creates admin with role='teacher')
teachers.post('/', adminAuthMiddleware, async (c) => {
  try {
    const data = await c.req.json();
    const { teacher_code, ho, ten, email, sdt, password, department, position, status } = data;

    if (!teacher_code || !ho || !ten || !email || !sdt || !password) {
      return errorResponse('Thiếu thông tin bắt buộc', 400);
    }

    // Check if teacher_code already exists as admin username or teacher_code
    const existingByCode = await findAdminByTeacherCode(c.env.DB, teacher_code);
    if (existingByCode) {
      return errorResponse('Mã giáo viên đã tồn tại', 400);
    }

    const ten_dem = data.ten_dem || '';
    const ho_ten_full = `${ho} ${ten_dem} ${ten}`.trim();
    const password_hash = await hashPassword(password);

    const result = await createTeacherAdmin(c.env.DB, {
      teacher_code,
      ho,
      ten_dem,
      ten,
      ho_ten_full,
      email,
      sdt,
      password_hash,
      department: department || null,
      position: position || null,
      status: status || 'active',
    });

    const newTeacher = await findAdminById(c.env.DB, result.meta.last_row_id);

    return jsonResponse({
      success: true,
      data: newTeacher,
      message: 'Tạo giáo viên thành công',
    }, 201);
  } catch (error: any) {
    console.error('Create teacher error:', error);
    return errorResponse('Lỗi tạo giáo viên', 500);
  }
});

// PUT /teachers/:id - Update teacher (admin only)
teachers.put('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const data = await c.req.json();

    const allowedFields = ['ho', 'ten_dem', 'ten', 'ho_ten_full', 'email', 'sdt', 'department', 'position', 'status'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Update password if provided
    if (data.password) {
      updateData.password_hash = await hashPassword(data.password);
    }

    // Auto update ho_ten_full and full_name
    if (updateData.ho || updateData.ten_dem || updateData.ten) {
      const currentTeacher = await findAdminById(c.env.DB, id) as any;
      if (currentTeacher) {
        const ho = updateData.ho || currentTeacher.ho;
        const ten_dem = updateData.ten_dem !== undefined ? updateData.ten_dem : currentTeacher.ten_dem;
        const ten = updateData.ten || currentTeacher.ten;
        updateData.ho_ten_full = `${ho} ${ten_dem} ${ten}`.trim();
        updateData.full_name = updateData.ho_ten_full;
      }
    }

    await updateAdmin(c.env.DB, id, updateData);

    const updatedTeacher = await findAdminById(c.env.DB, id);

    return jsonResponse({
      success: true,
      data: updatedTeacher,
      message: 'Cập nhật giáo viên thành công',
    });
  } catch (error: any) {
    console.error('Update teacher error:', error);
    return errorResponse('Lỗi cập nhật giáo viên', 500);
  }
});

// DELETE /teachers/:id - Delete teacher (admin only, soft delete)
teachers.delete('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const teacher = await findAdminById(c.env.DB, id);
    if (!teacher) {
      return errorResponse('Không tìm thấy giáo viên', 404);
    }

    // Soft delete by setting status to inactive
    await updateAdmin(c.env.DB, id, { status: 'inactive' });

    return jsonResponse({
      success: true,
      message: 'Xóa giáo viên thành công',
    });
  } catch (error: any) {
    console.error('Delete teacher error:', error);
    return errorResponse('Lỗi xóa giáo viên', 500);
  }
});

export default teachers;
