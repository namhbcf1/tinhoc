import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  createCertificate,
  getCertificatesByClass,
  getCertificatesByStudent,
  getCertificateById,
  getCertificateByNumber,
  updateCertificateStatus,
} from '../db/certificate-queries.js';
// getRegistrationsByClass and getPaymentsByRegistration removed — replaced by single JOIN query in /eligible
import { generateCertificateHTML, generateQRCodeDataURL } from '../utils/pdf-generator.js';
import { notifyCertificateIssued } from '../utils/notification-helper.js';

const certificates = new Hono();

// ========================================
// GET /certificates/lookup - Tra cứu chứng chỉ công khai (MUST BE BEFORE /:id)
// ========================================
certificates.get('/lookup', async (c) => {
  try {
    const cccd = c.req.query('cccd');
    const certificateNumber = c.req.query('certificate_number');

    if (!cccd && !certificateNumber) {
      return errorResponse('Vui lòng nhập CCCD hoặc số chứng chỉ', 400);
    }

    let query = `
      SELECT
        cert.*,
        s.ho_ten_full,
        s.cccd,
        c.ten_lop,
        c.ngay_thi
      FROM certificates cert
      JOIN students s ON cert.student_id = s.id
      JOIN classes c ON cert.class_id = c.id
      WHERE cert.status = 'issued'
    `;
    const params = [];

    if (cccd) {
      query += ' AND s.cccd = ?';
      params.push(cccd);
    }

    if (certificateNumber) {
      query += ' AND cert.certificate_number = ?';
      params.push(certificateNumber);
    }

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/:id/download - Download certificate PDF/HTML
// ========================================
certificates.get('/:id/download', async (c) => {
  try {
    const { id } = c.req.param();
    const format = c.req.query('format') || 'html'; // 'html' or 'json'

    const cert = await getCertificateById(c.env.DB, parseInt(id));

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    // Generate lookup URL for QR code
    const frontendUrl = c.env.FRONTEND_URL || 'https://vantrangedu-3vg.pages.dev';
    const lookupUrl = `${frontendUrl}/certificate/lookup?certificate_number=${cert.certificate_number}&cccd=${cert.cccd}`;
    
    // Generate QR code URL using external API service
    const qrCodeUrl = await generateQRCodeDataURL(lookupUrl);

    const certificateData = {
      certificateNumber: cert.certificate_number,
      studentName: cert.ho_ten_full,
      cccd: cert.cccd,
      className: cert.ten_lop,
      issuedDate: cert.issued_date,
      title: cert.title || 'Chứng chỉ hoàn thành khóa học',
      qrCodeUrl,
      lookupUrl,
    };

    if (format === 'json') {
      return jsonResponse({
        success: true,
        data: cert,
        certificateData,
      });
    }

    // Generate HTML certificate
    const html = generateCertificateHTML(certificateData);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error downloading certificate:', error);
    return errorResponse('Lỗi tải chứng chỉ: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/:id/qr-code - Get QR code for certificate
// ========================================
certificates.get('/:id/qr-code', async (c) => {
  try {
    const { id } = c.req.param();

    const cert = await getCertificateById(c.env.DB, parseInt(id));

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    const frontendUrl = c.env.FRONTEND_URL || 'https://your-frontend-url.com';
    const lookupUrl = `${frontendUrl}/certificate/lookup?certificate_number=${cert.certificate_number}&cccd=${cert.cccd}`;

    // Return QR code data URL or URL to QR code service
    const qrCodeUrl = await generateQRCodeDataURL(lookupUrl);

    return jsonResponse({
      success: true,
      qrCodeUrl,
      lookupUrl,
      certificateNumber: cert.certificate_number,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return errorResponse('Lỗi tạo QR code: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates - Lấy tất cả chứng chỉ (Admin only)
// ========================================
certificates.get('/', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit')) || 100;
    const offset = parseInt(c.req.query('offset')) || 0;
    const classId = c.req.query('class_id');
    const studentId = c.req.query('student_id');
    const status = c.req.query('status');

    let query = `
      SELECT 
        cert.*,
        s.ho_ten_full,
        s.cccd,
        c.ten_lop,
        a.full_name as issued_by_name
      FROM certificates cert
      JOIN students s ON cert.student_id = s.id
      JOIN classes c ON cert.class_id = c.id
      LEFT JOIN admins a ON cert.issued_by = a.id
      WHERE 1=1
    `;
    const params = [];

    if (classId) {
      query += ' AND cert.class_id = ?';
      params.push(parseInt(classId));
    }

    if (studentId) {
      query += ' AND cert.student_id = ?';
      params.push(parseInt(studentId));
    }

    if (status) {
      query += ' AND cert.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cert.issued_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      success: true,
      data: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (error) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/class/:id/eligible - Lấy danh sách học viên đủ điều kiện cấp chứng chỉ
// Single JOIN query thay thế N+1 loop (200+ queries → 1 query)
// ========================================
certificates.get('/class/:id/eligible', async (c) => {
  try {
    const classId = parseInt(c.req.param('id'));

    // Single query: JOIN registrations + students + payment status + certificate status
    // Eliminates N+1 loop that previously ran 2 queries per student
    const result = await c.env.DB.prepare(`
      SELECT
        r.id AS registration_id,
        r.so_phach,
        r.status,
        r.created_at,
        s.*,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM payments p
            WHERE p.registration_id = r.id AND p.status = 'confirmed'
          ) THEN 1 ELSE 0
        END AS has_paid,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM certificates cert
            WHERE cert.student_id = s.id AND cert.class_id = r.class_id
          ) THEN 1 ELSE 0
        END AS has_certificate
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      WHERE r.class_id = ?
      ORDER BY s.ho_ten_full ASC
    `).bind(classId).all();

    const eligibleStudents = (result.results || []).map(row => ({
      ...row,
      has_paid: row.has_paid === 1,
      has_certificate: row.has_certificate === 1,
    }));

    return jsonResponse({
      success: true,
      data: eligibleStudents,
      count: eligibleStudents.length,
    });
  } catch (error) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// POST /certificates/bulk - Cấp chứng chỉ hàng loạt (Admin only)
// ========================================
certificates.post('/bulk', async (c) => {
  try {
    const { class_id, student_ids } = await c.req.json();
    const user = c.get('user');

    if (!class_id || !student_ids || student_ids.length === 0) {
      return errorResponse('Thiếu class_id hoặc student_ids', 400);
    }

    // Get class info
    const classInfo = await c.env.DB.prepare(
      'SELECT * FROM classes WHERE id = ?'
    ).bind(class_id).first();

    if (!classInfo) {
      return errorResponse('Không tìm thấy lớp', 404);
    }

    const issuedCertificates = [];

    for (const studentId of student_ids) {
      // Check if already has certificate
      const existing = await c.env.DB.prepare(`
        SELECT id FROM certificates 
        WHERE student_id = ? AND class_id = ?
      `).bind(studentId, class_id).first();

      if (existing) {
        continue; // Skip if already has certificate
      }

      // Generate certificate number
      const certCount = await c.env.DB.prepare(`
        SELECT COUNT(*) as count FROM certificates WHERE class_id = ?
      `).bind(class_id).first();

      const count = certCount?.count || 0;
      const certNumber = `VT-${new Date().getFullYear()}-${class_id}-${String(count + 1).padStart(4, '0')}`;

      // Create certificate
      const result = await createCertificate(c.env.DB, {
        student_id: studentId,
        class_id: class_id,
        certificate_number: certNumber,
        title: `Chứng chỉ hoàn thành ${classInfo.ten_lop}`,
        issued_by: user?.id || null,
      });

      // Create notification
      try {
        await notifyCertificateIssued(
          c.env.DB,
          studentId,
          certNumber,
          classInfo.ten_lop
        );
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }

      issuedCertificates.push({
        certificate_id: result.meta.last_row_id,
        certificate_number: certNumber,
        student_id: studentId,
      });
    }

    return jsonResponse({
      success: true,
      message: `Đã cấp ${issuedCertificates.length} chứng chỉ`,
      data: issuedCertificates,
    }, 201);
  } catch (error) {
    return errorResponse('Lỗi cấp chứng chỉ: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/:id - Lấy chi tiết chứng chỉ
// ========================================
certificates.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const cert = await getCertificateById(c.env.DB, id);

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    return jsonResponse({
      success: true,
      data: cert,
    });
  } catch (error) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// PUT /certificates/:id/revoke - Thu hồi chứng chỉ (Admin only)
// ========================================
certificates.put('/:id/revoke', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    await updateCertificateStatus(c.env.DB, id, 'revoked');

    return jsonResponse({
      success: true,
      message: 'Thu hồi chứng chỉ thành công',
    });
  } catch (error) {
    return errorResponse('Lỗi thu hồi: ' + error.message, 500);
  }
});

export default certificates;
