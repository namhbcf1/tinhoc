import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  createPayment,
  getPaymentsByRegistration,
  getPaymentById,
  updatePaymentStatus,
  getPaymentsByStudent,
  getPaymentStats,
} from '../db/payment-queries.js';
import { updateRegistrationStatus, getClassById } from '../db/queries.js';
import { notifyPaymentConfirmed, notifyAdminPaymentPending } from '../utils/notification-helper.js';

const payments = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// ========================================
// GET /payments - Lấy tất cả thanh toán (Admin only)
// ========================================
payments.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') as string) || 100;
    const offset = parseInt(c.req.query('offset') as string) || 0;
    const status = c.req.query('status');
    const classId = c.req.query('class_id');

    let query = `
      SELECT
        p.*,
        r.student_id,
        r.class_id,
        s.ho_ten_full,
        s.cccd,
        c.ten_lop,
        a.full_name as confirmed_by_name
      FROM payments p
      JOIN registrations r ON p.registration_id = r.id
      JOIN students s ON r.student_id = s.id
      JOIN classes c ON r.class_id = c.id
      LEFT JOIN admins a ON p.confirmed_by = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (classId) {
      query += ' AND r.class_id = ?';
      params.push(parseInt(classId));
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /payments/stats - Thống kê học phí (Admin only)
// ========================================
payments.get('/stats', async (c) => {
  try {
    const fromDate = c.req.query('from_date');
    const toDate = c.req.query('to_date');

    const stats = await getPaymentStats(c.env.DB, { from_date: fromDate, to_date: toDate });

    // Get pending count
    const pendingResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM payments WHERE status = 'pending'
    `).first();

    // Get overdue count (pending > 7 days)
    const overdueResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM payments
      WHERE status = 'pending'
        AND datetime(created_at) < datetime('now', '-7 days')
    `).first();

    // Map stats để frontend dễ sử dụng
    return jsonResponse({
      success: true,
      data: {
        totalRevenue: (stats as any)?.total_confirmed || 0, // Tổng doanh thu = tổng đã xác nhận
        paidAmount: (stats as any)?.total_confirmed || 0,    // Đã thu = tổng đã xác nhận
        unpaidAmount: (stats as any)?.total_pending || 0,   // Chưa thu = tổng đang chờ
        pendingCount: (pendingResult as any)?.count || 0,    // Số lượng chờ xử lý
        overdueCount: (overdueResult as any)?.count || 0,   // Số lượng quá hạn
        // Giữ lại các field gốc để tương thích
        total_confirmed: (stats as any)?.total_confirmed || 0,
        total_pending: (stats as any)?.total_pending || 0,
        total_rejected: (stats as any)?.total_rejected || 0,
        total_payments: (stats as any)?.total_payments || 0,
      },
    }, 200, {
      'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /payments/:id - Lấy chi tiết thanh toán
// ========================================
payments.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const payment = await getPaymentById(c.env.DB, id);

    if (!payment) {
      return errorResponse('Không tìm thấy thanh toán', 404);
    }

    return jsonResponse({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// POST /payments - Tạo thanh toán mới (Student/Admin)
// ========================================
payments.post('/', async (c) => {
  try {
    const data = await c.req.json() as any;
    const { registration_id, amount, method, transaction_code, receipt_image_url, notes } = data;

    if (!registration_id || !amount) {
      return errorResponse('Thiếu registration_id hoặc amount', 400);
    }

    const result = await createPayment(c.env.DB, {
      registration_id,
      amount,
      method: method || 'bank_transfer',
      transaction_code,
      receipt_image_url,
      notes,
    });

    // Get registration and student info for notification
    try {
      const registration = await c.env.DB.prepare(`
        SELECT r.*, s.id as student_id, s.ho_ten_full, c.ten_lop
        FROM registrations r
        JOIN students s ON r.student_id = s.id
        JOIN classes c ON r.class_id = c.id
        WHERE r.id = ?
      `).bind(registration_id).first();

      if (registration) {
        await notifyAdminPaymentPending(
          c.env.DB,
          (registration as any).ho_ten_full,
          amount,
          result.meta.last_row_id
        );
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    return jsonResponse({
      success: true,
      message: 'Tạo thanh toán thành công',
      payment_id: result.meta.last_row_id,
    }, 201);
  } catch (error: any) {
    return errorResponse('Lỗi tạo thanh toán: ' + error.message, 500);
  }
});

// ========================================
// PUT /payments/:id/confirm - Xác nhận thanh toán (Admin only)
// ========================================
payments.put('/:id/confirm', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user'); // From auth middleware

    const payment = await getPaymentById(c.env.DB, id);
    if (!payment) {
      return errorResponse('Không tìm thấy thanh toán', 404);
    }

    // Update payment status
    await updatePaymentStatus(c.env.DB, id, 'confirmed', (user as any)?.id);

    // *** AUTO UPDATE REGISTRATION STATUS TO 'STUDYING' ***
    // Khi học viên đã nộp học phí -> tự động cho vào học
    try {
      await updateRegistrationStatus(c.env.DB, (payment as any).registration_id, 'studying');
      console.log(`Auto-updated registration ${(payment as any).registration_id} to 'studying'`);
    } catch (statusError) {
      console.error('Error auto-updating registration status:', statusError);
      // Continue even if this fails - payment is still confirmed
    }

    // Get payment with student and class info for notification
    try {
      const paymentWithInfo = await c.env.DB.prepare(`
        SELECT p.*, r.student_id, s.ho_ten_full, c.ten_lop
        FROM payments p
        JOIN registrations r ON p.registration_id = r.id
        JOIN students s ON r.student_id = s.id
        JOIN classes c ON r.class_id = c.id
        WHERE p.id = ?
      `).bind(id).first();

      if (paymentWithInfo) {
        await notifyPaymentConfirmed(
          c.env.DB,
          (paymentWithInfo as any).student_id,
          (paymentWithInfo as any).amount,
          (paymentWithInfo as any).ten_lop
        );
      }
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    return jsonResponse({
      success: true,
      message: 'Xác nhận thanh toán thành công. Học viên đã được chuyển sang trạng thái Đang học.',
    });
  } catch (error: any) {
    return errorResponse('Lỗi xác nhận: ' + error.message, 500);
  }
});

// ========================================
// PUT /payments/:id/reject - Từ chối thanh toán (Admin only)
// ========================================
payments.put('/:id/reject', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const { reason } = await c.req.json() as any;
    const user = c.get('user');

    const payment = await getPaymentById(c.env.DB, id);
    if (!payment) {
      return errorResponse('Không tìm thấy thanh toán', 404);
    }

    await updatePaymentStatus(c.env.DB, id, 'rejected', (user as any)?.id);

    // Update notes with rejection reason
    await c.env.DB.prepare(`
      UPDATE payments SET notes = ? WHERE id = ?
    `).bind(reason || 'Thanh toán bị từ chối', id).run();

    return jsonResponse({
      success: true,
      message: 'Từ chối thanh toán thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi từ chối: ' + error.message, 500);
  }
});

// ========================================
// GET /payments/registration/:id - Lấy thanh toán theo đăng ký
// ========================================
payments.get('/registration/:id', async (c) => {
  try {
    const registrationId = parseInt(c.req.param('id'));
    const paymentsData = await getPaymentsByRegistration(c.env.DB, registrationId);

    return jsonResponse({
      success: true,
      data: paymentsData,
      count: paymentsData.length,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

export default payments;
