import { Hono } from 'hono';
import { verifyPassword, hashPassword, generateJWT, jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  findTeacherByCode,
  findTeacherById,
  createTeacher,
  updateTeacher,
  getAllTeachers,
  searchTeachers,
  getTeacherClasses,
  getTeacherSchedule,
  getTeacherExams
} from '../db/teacher-queries.js';
import { loginRateLimiter } from '../utils/rate-limiter.js';
import { requireAdmin, requireTeacher } from '../middleware/auth-middleware.js';

const teachers = new Hono();

// ========================================
// AUTH MIDDLEWARES — use shared from auth-middleware.js
// ========================================
// teacherAuthMiddleware: sets c.get('teacher') for backward compat
const teacherAuthMiddleware = requireTeacher;

// adminAuthMiddleware: sets c.get('admin') for backward compat
const adminAuthMiddleware = async (c, next) => {
  await requireAdmin(c, async () => {
    c.set('admin', c.get('user'));
    await next();
  });
};

// ========================================
// POST /teachers/login - Teacher login
// ========================================
teachers.post('/login', loginRateLimiter, async (c) => {
  try {
    let body;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    const { teacher_code, password } = body;
    
    if (!teacher_code || !password) {
      return errorResponse('Thiếu mã giáo viên hoặc mật khẩu', 400);
    }
    
    const teacher = await findTeacherByCode(c.env.DB, teacher_code);
    
    if (!teacher) {
      return errorResponse('Thông tin đăng nhập không chính xác', 401);
    }

    if (teacher.status !== 'active') {
      return errorResponse('Tài khoản giáo viên đã bị khóa hoặc không hoạt động', 403);
    }

    const isValidPassword = await verifyPassword(password, teacher.password_hash);

    if (!isValidPassword) {
      return errorResponse('Thông tin đăng nhập không chính xác', 401);
    }
    
    // Update last_login
    await updateTeacher(c.env.DB, teacher.id, { last_login: new Date().toISOString() });
    
    // Generate JWT token with 24h expiry
    const token = await generateJWT(
      {
        id: teacher.id,
        teacher_code: teacher.teacher_code,
        role: 'teacher',
        email: teacher.email,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      },
      c.env.JWT_SECRET
    );
    
    // Return teacher data (without password_hash)
    const { password_hash, ...teacherData } = teacher;
    
    return jsonResponse({
      success: true,
      token,
      teacher: teacherData,
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    return errorResponse('Lỗi đăng nhập', 500);
  }
});

// ========================================
// GET /teachers/profile - Get teacher profile (auth required)
// ========================================
teachers.get('/profile', teacherAuthMiddleware, async (c) => {
  try {
    const teacher = c.get('teacher');
    const teacherData = await findTeacherById(c.env.DB, teacher.id);
    
    if (!teacherData) {
      return errorResponse('Không tìm thấy thông tin giáo viên', 404);
    }
    
    return jsonResponse({
      success: true,
      data: teacherData,
    });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    return errorResponse('Lỗi lấy thông tin giáo viên', 500);
  }
});

// ========================================
// PUT /teachers/profile - Update teacher profile (auth required)
// ========================================
teachers.put('/profile', teacherAuthMiddleware, async (c) => {
  try {
    const teacher = c.get('teacher');
    const data = await c.req.json();
    
    // Không cho phép thay đổi teacher_code, password_hash, status
    const allowedFields = ['ho', 'ten_dem', 'ten', 'ho_ten_full', 'email', 'sdt', 'department', 'position'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    
    // Tự động cập nhật ho_ten_full nếu có thay đổi tên
    if (updateData.ho || updateData.ten_dem || updateData.ten) {
      const currentTeacher = await findTeacherById(c.env.DB, teacher.id);
      const ho = updateData.ho || currentTeacher.ho;
      const ten_dem = updateData.ten_dem !== undefined ? updateData.ten_dem : currentTeacher.ten_dem;
      const ten = updateData.ten || currentTeacher.ten;
      updateData.ho_ten_full = `${ho} ${ten_dem} ${ten}`.trim();
    }
    
    await updateTeacher(c.env.DB, teacher.id, updateData);
    
    const updatedTeacher = await findTeacherById(c.env.DB, teacher.id);
    
    return jsonResponse({
      success: true,
      data: updatedTeacher,
      message: 'Cập nhật thông tin thành công',
    });
  } catch (error) {
    console.error('Update teacher profile error:', error);
    return errorResponse('Lỗi cập nhật thông tin', 500);
  }
});

// ========================================
// POST /teachers/change-password - Change password (auth required)
// ========================================
teachers.post('/change-password', teacherAuthMiddleware, async (c) => {
  try {
    const teacher = c.get('teacher');
    const { old_password, new_password } = await c.req.json();
    
    if (!old_password || !new_password) {
      return errorResponse('Thiếu mật khẩu cũ hoặc mật khẩu mới', 400);
    }
    
    if (new_password.length < 6) {
      return errorResponse('Mật khẩu mới phải có ít nhất 6 ký tự', 400);
    }
    
    const currentTeacher = await findTeacherByCode(c.env.DB, teacher.teacher_code);
    
    const isValidPassword = await verifyPassword(old_password, currentTeacher.password_hash);
    
    if (!isValidPassword) {
      return errorResponse('Mật khẩu cũ không đúng', 401);
    }
    
    const newPasswordHash = await hashPassword(new_password);
    await updateTeacher(c.env.DB, teacher.id, { password_hash: newPasswordHash });
    
    return jsonResponse({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse('Lỗi đổi mật khẩu', 500);
  }
});

// ========================================
// GET /teachers/my-classes - Get teacher's classes (auth required)
// ========================================
teachers.get('/my-classes', teacherAuthMiddleware, async (c) => {
  try {
    const teacher = c.get('teacher');
    const classes = await getTeacherClasses(c.env.DB, teacher.id);
    
    return jsonResponse({
      success: true,
      data: classes.results || [],
    });
  } catch (error) {
    console.error('Get teacher classes error:', error);
    return errorResponse('Lỗi lấy danh sách lớp học', 500);
  }
});

// ========================================
// GET /teachers/my-schedule - Get teacher's schedule (auth required)
// ========================================
teachers.get('/my-schedule', teacherAuthMiddleware, async (c) => {
  try {
    const teacher = c.get('teacher');
    const week_start = c.req.query('week_start') || new Date().toISOString().split('T')[0];
    
    const schedule = await getTeacherSchedule(c.env.DB, teacher.id, week_start);
    
    return jsonResponse({
      success: true,
      data: schedule.results || [],
      week_start,
    });
  } catch (error) {
    console.error('Get teacher schedule error:', error);
    return errorResponse('Lỗi lấy lịch học', 500);
  }
});

// ========================================
// GET /teachers/my-exams - Get teacher's exams (auth required)
// ========================================
teachers.get('/my-exams', teacherAuthMiddleware, async (c) => {
  try {
    const teacher = c.get('teacher');
    const exams = await getTeacherExams(c.env.DB, teacher.id);
    
    return jsonResponse({
      success: true,
      data: exams.results || [],
    });
  } catch (error) {
    console.error('Get teacher exams error:', error);
    return errorResponse('Lỗi lấy lịch thi', 500);
  }
});

// ========================================
// ADMIN ONLY ROUTES
// ========================================

// adminAuthMiddleware already defined above

// ========================================
// GET /teachers - Get all teachers (admin only)
// ========================================
teachers.get('/', adminAuthMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const keyword = c.req.query('keyword');
    
    let result;
    if (keyword) {
      result = await searchTeachers(c.env.DB, keyword);
    } else {
      result = await getAllTeachers(c.env.DB, limit, offset);
    }
    
    return jsonResponse({
      success: true,
      data: result.results || [],
      total: result.results?.length || 0,
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    return errorResponse('Lỗi lấy danh sách giáo viên', 500);
  }
});

// ========================================
// POST /teachers - Create teacher (admin only)
// ========================================
teachers.post('/', adminAuthMiddleware, async (c) => {
  try {
    const data = await c.req.json();
    const { teacher_code, ho, ten, email, sdt, password, department, position, status } = data;
    
    if (!teacher_code || !ho || !ten || !email || !sdt || !password) {
      return errorResponse('Thiếu thông tin bắt buộc', 400);
    }
    
    // Check if teacher_code or email already exists
    const existingByCode = await findTeacherByCode(c.env.DB, teacher_code);
    if (existingByCode) {
      return errorResponse('Mã giáo viên đã tồn tại', 400);
    }
    
    const existingByEmail = await findTeacherByCode(c.env.DB, email);
    if (existingByEmail) {
      return errorResponse('Email đã tồn tại', 400);
    }
    
    const ten_dem = data.ten_dem || '';
    const ho_ten_full = `${ho} ${ten_dem} ${ten}`.trim();
    const password_hash = await hashPassword(password);
    
    const result = await createTeacher(c.env.DB, {
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
    
    const newTeacher = await findTeacherById(c.env.DB, result.meta.last_row_id);
    
    return jsonResponse({
      success: true,
      data: newTeacher,
      message: 'Tạo giáo viên thành công',
    }, 201);
  } catch (error) {
    console.error('Create teacher error:', error);
    return errorResponse('Lỗi tạo giáo viên', 500);
  }
});

// ========================================
// PUT /teachers/:id - Update teacher (admin only)
// ========================================
teachers.put('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const data = await c.req.json();
    
    const allowedFields = ['ho', 'ten_dem', 'ten', 'ho_ten_full', 'email', 'sdt', 'department', 'position', 'status'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    
    // Update password if provided
    if (data.password) {
      updateData.password_hash = await hashPassword(data.password);
    }
    
    // Auto update ho_ten_full
    if (updateData.ho || updateData.ten_dem || updateData.ten) {
      const currentTeacher = await findTeacherById(c.env.DB, id);
      if (currentTeacher) {
        const ho = updateData.ho || currentTeacher.ho;
        const ten_dem = updateData.ten_dem !== undefined ? updateData.ten_dem : currentTeacher.ten_dem;
        const ten = updateData.ten || currentTeacher.ten;
        updateData.ho_ten_full = `${ho} ${ten_dem} ${ten}`.trim();
      }
    }
    
    await updateTeacher(c.env.DB, id, updateData);
    
    const updatedTeacher = await findTeacherById(c.env.DB, id);
    
    return jsonResponse({
      success: true,
      data: updatedTeacher,
      message: 'Cập nhật giáo viên thành công',
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return errorResponse('Lỗi cập nhật giáo viên', 500);
  }
});

// ========================================
// DELETE /teachers/:id - Delete teacher (admin only)
// ========================================
teachers.delete('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    // Check if teacher exists
    const teacher = await findTeacherById(c.env.DB, id);
    if (!teacher) {
      return errorResponse('Không tìm thấy giáo viên', 404);
    }
    
    // Soft delete by setting status to inactive
    await updateTeacher(c.env.DB, id, { status: 'inactive' });
    
    return jsonResponse({
      success: true,
      message: 'Xóa giáo viên thành công',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return errorResponse('Lỗi xóa giáo viên', 500);
  }
});

export default teachers;
