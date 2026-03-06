import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';

const reports = new Hono();

// ========================================
// GET /reports/payments - Báo cáo học phí theo tháng/năm
// ========================================
reports.get('/payments', async (c) => {
  try {
    const year = parseInt(c.req.query('year')) || new Date().getFullYear();
    const month = c.req.query('month') ? parseInt(c.req.query('month')) : null;

    let query = `
      SELECT 
        strftime('%Y-%m', p.confirmed_at) as month,
        COUNT(*) as count,
        SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.status = 'confirmed'
        AND strftime('%Y', p.confirmed_at) = ?
    `;
    const params = [String(year)];

    if (month) {
      query += " AND strftime('%m', p.confirmed_at) = ?";
      params.push(String(month).padStart(2, '0'));
    }

    query += " GROUP BY strftime('%Y-%m', p.confirmed_at) ORDER BY month";

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      success: true,
      data: result.results || [],
      year,
      month,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy báo cáo học phí: ' + error.message, 500);
  }
});

// ========================================
// GET /reports/registrations - Báo cáo số lượng đăng ký
// ========================================
reports.get('/registrations', async (c) => {
  try {
    const year = parseInt(c.req.query('year')) || new Date().getFullYear();
    const groupBy = c.req.query('group_by') || 'month'; // month, class

    if (groupBy === 'month') {
      const query = `
        SELECT 
          strftime('%Y-%m', r.created_at) as month,
          COUNT(*) as count
        FROM registrations r
        WHERE strftime('%Y', r.created_at) = ?
        GROUP BY strftime('%Y-%m', r.created_at)
        ORDER BY month
      `;

      const result = await c.env.DB.prepare(query).bind(String(year)).all();

      return jsonResponse({
        success: true,
        data: result.results || [],
        year,
        groupBy: 'month',
      });
    } else if (groupBy === 'class') {
      const query = `
        SELECT 
          c.id as class_id,
          c.ten_lop as class_name,
          COUNT(*) as count
        FROM registrations r
        JOIN classes c ON r.class_id = c.id
        WHERE strftime('%Y', r.created_at) = ?
        GROUP BY c.id, c.ten_lop
        ORDER BY count DESC
      `;

      const result = await c.env.DB.prepare(query).bind(String(year)).all();

      return jsonResponse({
        success: true,
        data: result.results || [],
        year,
        groupBy: 'class',
      });
    }

    return errorResponse('Invalid group_by parameter', 400);
  } catch (error) {
    return errorResponse('Lỗi lấy báo cáo đăng ký: ' + error.message, 500);
  }
});

// ========================================
// GET /reports/certificates - Báo cáo số chứng chỉ đã cấp
// ========================================
reports.get('/certificates', async (c) => {
  try {
    const year = parseInt(c.req.query('year')) || new Date().getFullYear();
    const groupBy = c.req.query('group_by') || 'month'; // month, class

    if (groupBy === 'month') {
      const query = `
        SELECT 
          strftime('%Y-%m', cert.issued_date) as month,
          COUNT(*) as count
        FROM certificates cert
        WHERE cert.status = 'issued'
          AND strftime('%Y', cert.issued_date) = ?
        GROUP BY strftime('%Y-%m', cert.issued_date)
        ORDER BY month
      `;

      const result = await c.env.DB.prepare(query).bind(String(year)).all();

      return jsonResponse({
        success: true,
        data: result.results || [],
        year,
        groupBy: 'month',
      });
    } else if (groupBy === 'class') {
      const query = `
        SELECT 
          c.id as class_id,
          c.ten_lop as class_name,
          COUNT(*) as count
        FROM certificates cert
        JOIN classes c ON cert.class_id = c.id
        WHERE cert.status = 'issued'
          AND strftime('%Y', cert.issued_date) = ?
        GROUP BY c.id, c.ten_lop
        ORDER BY count DESC
      `;

      const result = await c.env.DB.prepare(query).bind(String(year)).all();

      return jsonResponse({
        success: true,
        data: result.results || [],
        year,
        groupBy: 'class',
      });
    }

    return errorResponse('Invalid group_by parameter', 400);
  } catch (error) {
    return errorResponse('Lỗi lấy báo cáo chứng chỉ: ' + error.message, 500);
  }
});

// ========================================
// GET /reports/students-by-class - Báo cáo học viên theo lớp
// ========================================
reports.get('/students-by-class', async (c) => {
  try {
    const classId = c.req.query('class_id');

    let query = `
      SELECT 
        c.id as class_id,
        c.ten_lop as class_name,
        COUNT(DISTINCT r.student_id) as student_count,
        COUNT(DISTINCT CASE WHEN p.status = 'confirmed' THEN r.student_id END) as paid_count,
        COUNT(DISTINCT cert.id) as certificate_count
      FROM classes c
      LEFT JOIN registrations r ON c.id = r.class_id
      LEFT JOIN payments p ON r.id = p.registration_id
      LEFT JOIN certificates cert ON r.student_id = cert.student_id AND r.class_id = cert.class_id
    `;
    const params = [];

    if (classId) {
      query += ' WHERE c.id = ?';
      params.push(parseInt(classId));
    }

    query += ' GROUP BY c.id, c.ten_lop ORDER BY c.ten_lop';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    return errorResponse('Lỗi lấy báo cáo học viên: ' + error.message, 500);
  }
});

// ========================================
// GET /reports/summary - Tổng hợp báo cáo
// ========================================
reports.get('/summary', async (c) => {
  try {
    const year = parseInt(c.req.query('year')) || new Date().getFullYear();

    // Total students
    const studentsResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM students
    `).first();

    // Total classes
    const classesResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM classes
    `).first();

    // Total registrations this year
    const registrationsResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM registrations
      WHERE strftime('%Y', created_at) = ?
    `).bind(String(year)).first();

    // Total revenue this year
    const revenueResult = await c.env.DB.prepare(`
      SELECT SUM(amount) as total FROM payments
      WHERE status = 'confirmed' AND strftime('%Y', confirmed_at) = ?
    `).bind(String(year)).first();

    // Total certificates issued this year
    const certificatesResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM certificates
      WHERE status = 'issued' AND strftime('%Y', issued_date) = ?
    `).bind(String(year)).first();

    return jsonResponse({
      success: true,
      data: {
        totalStudents: studentsResult?.count || 0,
        totalClasses: classesResult?.count || 0,
        totalRegistrations: registrationsResult?.count || 0,
        totalRevenue: revenueResult?.total || 0,
        totalCertificates: certificatesResult?.count || 0,
        year,
      },
    });
  } catch (error) {
    return errorResponse('Lỗi lấy tổng hợp: ' + error.message, 500);
  }
});

export default reports;
