import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  findStudentByCCCD,
  getClassById,
  findRegistration,
  createRegistration,
  updateRegistrationStatus,
  getRegistrationsByClass,
  getStudentRegistrations,
  updateSoPhach,
  deleteRegistration,
} from '../db/queries.js';
import { notifyRegistrationSuccess } from '../utils/notification-helper.js';

const registrations = new Hono<{ Bindings: Env }>();

// ========================================
// POST /registrations - Đăng ký thi
// ========================================
registrations.post('/', async (c) => {
  try {
    const { cccd, class_id } = await c.req.json() as any;

    if (!cccd || !class_id) {
      return errorResponse('Thiếu CCCD hoặc class_id', 400);
    }

    // 1. Kiểm tra sinh viên tồn tại
    const student = await findStudentByCCCD(c.env.DB, cccd) as any;
    if (!student) {
      return errorResponse('Sinh viên chưa đăng ký thông tin. Vui lòng đăng ký trước.', 404);
    }

    // 2. Kiểm tra lớp tồn tại và đang mở
    const classInfo = await getClassById(c.env.DB, class_id) as any;
    if (!classInfo) {
      return errorResponse('Lớp không tồn tại', 404);
    }

    if (classInfo.status !== 'open') {
      return errorResponse('Lớp đã đóng đăng ký', 400);
    }

    // Check time range
    const now = new Date();
    const openAt = new Date(classInfo.open_at);
    const closeAt = new Date(classInfo.close_at);

    if (now < openAt) {
      return errorResponse('Lớp chưa mở đăng ký', 400);
    }

    if (now > closeAt) {
      return errorResponse('Lớp đã hết hạn đăng ký', 400);
    }

    // 3. Kiểm tra đã đăng ký chưa
    const existing = await findRegistration(c.env.DB, student.id, class_id);
    if (existing) {
      return errorResponse('Bạn đã đăng ký lớp này rồi', 409);
    }

    // 4. Tạo đăng ký
    const result = await createRegistration(c.env.DB, student.id, class_id) as any;

    if (!result.success) {
      return errorResponse('Lỗi tạo đăng ký: ' + result.error, 500);
    }

    // 5. Tạo thông báo
    try {
      await notifyRegistrationSuccess(c.env.DB, student.id, classInfo.ten_lop);
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail registration if notification fails
    }

    return jsonResponse({
      success: true,
      message: 'Đăng ký thành công',
      registration_id: result.meta.last_row_id,
    }, 201);

  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /registrations - Danh sách đăng ký theo sinh viên (query: student_cccd)
// ========================================
registrations.get('/', async (c) => {
  try {
    const studentCCCD = c.req.query('student_cccd');

    if (!studentCCCD) {
      return errorResponse('Thiếu student_cccd trong query', 400);
    }

    // Tìm sinh viên
    const student = await findStudentByCCCD(c.env.DB, studentCCCD) as any;
    if (!student) {
      return errorResponse('Sinh viên không tồn tại', 404);
    }

    // Lấy danh sách đăng ký
    const list = await getStudentRegistrations(c.env.DB, student.id) as any[];

    return jsonResponse({
      success: true,
      data: list,
      count: list.length,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /registrations/class/:class_id - Danh sách đăng ký theo lớp
// ========================================
registrations.get('/class/:class_id', async (c) => {
  try {
    const classId = parseInt(c.req.param('class_id'));

    const list = await getRegistrationsByClass(c.env.DB, classId) as any[];

    return jsonResponse({
      success: true,
      data: list,
      count: list.length,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// PUT /registrations/:id/status - Cập nhật trạng thái (Admin only)
// ========================================
registrations.put('/:id/status', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const { status, payment_status } = await c.req.json() as any;

    // Lưu ý: payment_status đã được tách ra bảng payments riêng
    // Chỉ update status của registration
    if (!status) {
      return errorResponse('Thiếu status', 400);
    }

    const result = await updateRegistrationStatus(
      c.env.DB,
      id,
      status,
      payment_status // Giữ lại để tương thích nhưng không sử dụng
    );

    if (!result.success) {
      return errorResponse('Lỗi cập nhật: ' + result.error, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Cập nhật trạng thái thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// PUT /registrations/:id/so-phach - Gán số phách (Admin only)
// ========================================
registrations.put('/:id/so-phach', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const { so_phach } = await c.req.json() as any;

    // Cho phép so_phach rỗng để xóa số phách
    const result = await updateSoPhach(c.env.DB, id, so_phach || null);

    if (!result.success) {
      return errorResponse('Lỗi cập nhật: ' + result.error, 500);
    }

    return jsonResponse({
      success: true,
      message: so_phach ? 'Gán số phách thành công' : 'Xóa số phách thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// DELETE /registrations/:id - Xóa đăng ký (Admin only)
// ========================================
registrations.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const result = await deleteRegistration(c.env.DB, id);

    if (!result.success) {
      const msg = result.error || 'Không tìm thấy đăng ký';
      // If not found, return 404 instead of 500
      if (String(msg).toLowerCase().includes('not found') || String(msg).toLowerCase().includes('không tìm thấy')) {
        return errorResponse(msg, 404);
      }
      return errorResponse('Lỗi xóa đăng ký: ' + msg, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Xóa đăng ký thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

export default registrations;
