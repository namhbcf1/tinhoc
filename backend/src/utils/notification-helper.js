// ========================================
// NOTIFICATION HELPER - Tự động tạo thông báo
// ========================================

import { createNotification } from '../db/notification-queries.js';

/**
 * Create notification when registration is successful
 */
export async function notifyRegistrationSuccess(db, studentId, className) {
  await createNotification(db, {
    user_id: studentId,
    user_type: 'student',
    title: 'Đăng ký lớp thành công',
    message: `Bạn đã đăng ký lớp "${className}" thành công. Vui lòng thanh toán học phí để hoàn tất đăng ký.`,
    type: 'success',
    link: '/dashboard/my-classes',
  });
}

/**
 * Create notification when payment is confirmed
 */
export async function notifyPaymentConfirmed(db, studentId, amount, className) {
  await createNotification(db, {
    user_id: studentId,
    user_type: 'student',
    title: 'Thanh toán được xác nhận',
    message: `Thanh toán học phí ${amount.toLocaleString('vi-VN')} VNĐ cho lớp "${className}" đã được xác nhận.`,
    type: 'payment',
    link: '/dashboard/payment',
  });
}

/**
 * Create notification when certificate is issued
 */
export async function notifyCertificateIssued(db, studentId, certificateNumber, className) {
  await createNotification(db, {
    user_id: studentId,
    user_type: 'student',
    title: 'Chứng chỉ đã được cấp',
    message: `Chứng chỉ số ${certificateNumber} cho lớp "${className}" đã được cấp. Bạn có thể tải về trong mục Chứng chỉ.`,
    type: 'certificate',
    link: '/dashboard/certificates',
  });
}

/**
 * Create notification when new class opens for registration
 */
export async function notifyNewClassOpen(db, className, classId) {
  await createNotification(db, {
    user_id: null,
    user_type: 'all',
    title: 'Lớp mới mở đăng ký',
    message: `Lớp "${className}" đã mở đăng ký. Đăng ký ngay để không bỏ lỡ cơ hội!`,
    type: 'class',
    link: `/dashboard/register-class?class_id=${classId}`,
  });
}

/**
 * Create notification for admin when payment needs confirmation
 */
export async function notifyAdminPaymentPending(db, studentName, amount, paymentId) {
  await createNotification(db, {
    user_id: null,
    user_type: 'admin',
    title: 'Thanh toán cần xác nhận',
    message: `${studentName} đã thanh toán ${amount.toLocaleString('vi-VN')} VNĐ. Vui lòng xác nhận thanh toán.`,
    type: 'payment',
    link: `/admin/dashboard/payments?payment_id=${paymentId}`,
  });
}
