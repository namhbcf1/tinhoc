import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import { requireAdmin } from '../middleware/auth-middleware.js';
import {
  createCertificate,
  getCertificateById,
  updateCertificateStatus,
} from '../db/certificate-queries.js';
import {
  createCertificateShipment,
  getLatestShipmentByCertificate,
  getOpenShipmentByCertificate,
  updateCertificateShipment,
} from '../db/certificate-shipment-queries.js';
import { generateCertificateHTML, generateQRCodeDataURL } from '../utils/pdf-generator.js';
import { notifyCertificateIssued } from '../utils/notification-helper.js';
import { createViettelPostShipment, getViettelPostErrorMessage } from '../services/viettel-post.js';
import { isVietnamesePhoneNumber } from '../services/viettel-post-address.js';

const certificates = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

function parsePositiveInteger(value: unknown) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isIssuedCertificateStatus(status: unknown) {
  return status === 'active' || status === 'issued';
}

function parseJsonField(value: unknown, fallback: unknown) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function hydrateShipment(shipment: any) {
  if (!shipment) return null;
  return {
    ...shipment,
    warnings: parseJsonField(shipment.warnings_json, []),
    service_add_codes: parseJsonField(shipment.service_add_codes_json, []),
    raw_request: parseJsonField(shipment.raw_request_json, null),
    raw_response: parseJsonField(shipment.raw_response_json, null),
  };
}

async function getClassInfo(db: D1Database, classId: number) {
  return db.prepare('SELECT * FROM classes WHERE id = ?').bind(classId).first();
}

async function buildCertificateNumber(db: D1Database, classId: number) {
  const certCount = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM certificates
    WHERE class_id = ?
  `).bind(classId).first();

  const count = Number((certCount as any)?.count || 0);
  return `VT-${new Date().getFullYear()}-${classId}-${String(count + 1).padStart(4, '0')}`;
}

async function issueCertificateForStudent(
  env: Env,
  classId: number,
  studentId: number,
  issuedBy: number | null,
  options: { skipExisting?: boolean } = {},
) {
  const classInfo = await getClassInfo(env.DB, classId);
  if (!classInfo) {
    throw new Error('Không tìm thấy lớp.');
  }

  const existing = await env.DB.prepare(`
    SELECT id, certificate_number
    FROM certificates
    WHERE student_id = ? AND class_id = ? AND status IN ('active', 'issued')
    LIMIT 1
  `).bind(studentId, classId).first();

  if (existing) {
    if (options.skipExisting) {
      return null;
    }
    throw new Error('Học viên này đã có chứng chỉ cho lớp đã chọn.');
  }

  const certificateNumber = await buildCertificateNumber(env.DB, classId);
  const result = await createCertificate(env.DB, {
    student_id: studentId,
    class_id: classId,
    certificate_number: certificateNumber,
    title: `Chứng chỉ hoàn thành ${(classInfo as any).ten_lop}`,
    issued_by: issuedBy,
  });

  try {
    await notifyCertificateIssued(env.DB, String(studentId), certificateNumber, (classInfo as any).ten_lop);
  } catch (notifError) {
    console.error('Error creating certificate notification:', notifError);
  }

  return {
    certificate_id: result.meta.last_row_id,
    certificate_number: certificateNumber,
    student_id: studentId,
    class_id: classId,
    class_name: (classInfo as any).ten_lop,
  };
}

// ========================================
// GET /certificates/lookup - Public certificate lookup
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
      LEFT JOIN classes c ON cert.class_id = c.id
      WHERE cert.status IN ('active', 'issued')
    `;
    const params: any[] = [];

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
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/:id/download - Download certificate HTML
// ========================================
certificates.get('/:id/download', async (c) => {
  try {
    const { id } = c.req.param();
    const format = c.req.query('format') || 'html';
    const cert = await getCertificateById(c.env.DB, Number.parseInt(id, 10));

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    const frontendUrl = (c.env as any).FRONTEND_URL || 'https://vantrangedu-3vg.pages.dev';
    const lookupUrl = `${frontendUrl}/certificate/lookup?certificate_number=${(cert as any).certificate_number}&cccd=${(cert as any).cccd}`;
    const qrCodeUrl = await generateQRCodeDataURL(lookupUrl);

    const certificateData = {
      certificateNumber: (cert as any).certificate_number,
      studentName: (cert as any).ho_ten_full,
      cccd: (cert as any).cccd,
      className: (cert as any).ten_lop,
      issuedDate: (cert as any).issued_date,
      title: (cert as any).title || 'Chứng chỉ hoàn thành khóa học',
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

    return new Response(generateCertificateHTML(certificateData), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error downloading certificate:', error);
    return errorResponse('Lỗi tải chứng chỉ: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/:id/qr-code
// ========================================
certificates.get('/:id/qr-code', async (c) => {
  try {
    const { id } = c.req.param();
    const cert = await getCertificateById(c.env.DB, Number.parseInt(id, 10));

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    const frontendUrl = (c.env as any).FRONTEND_URL || 'https://vantrangedu-3vg.pages.dev';
    const lookupUrl = `${frontendUrl}/certificate/lookup?certificate_number=${(cert as any).certificate_number}&cccd=${(cert as any).cccd}`;
    const qrCodeUrl = await generateQRCodeDataURL(lookupUrl);

    return jsonResponse({
      success: true,
      qrCodeUrl,
      lookupUrl,
      certificateNumber: (cert as any).certificate_number,
    });
  } catch (error: any) {
    console.error('Error generating QR code:', error);
    return errorResponse('Lỗi tạo QR code: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates - Admin list with shipment summary
// ========================================
certificates.get('/', requireAdmin, async (c) => {
  try {
    const rawLimit = Number.parseInt(c.req.query('limit') as string, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 100;
    const rawOffset = Number.parseInt(c.req.query('offset') as string, 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const classId = parsePositiveInteger(c.req.query('class_id'));
    const studentId = parsePositiveInteger(c.req.query('student_id'));
    const status = c.req.query('status');

    let query = `
      SELECT
        cert.*,
        s.id AS student_id,
        s.ho_ten_full,
        s.cccd,
        s.sdt,
        s.dia_chi,
        c.ten_lop,
        a.full_name AS issued_by_name,
        (
          SELECT cs.status
          FROM certificate_shipments cs
          WHERE cs.certificate_id = cert.id
            AND cs.status IN ('draft', 'quoted', 'created', 'in_transit')
          ORDER BY cs.created_at DESC, cs.id DESC
          LIMIT 1
        ) AS shipment_status,
        (
          SELECT cs.carrier_tracking_number
          FROM certificate_shipments cs
          WHERE cs.certificate_id = cert.id
            AND cs.status IN ('draft', 'quoted', 'created', 'in_transit')
          ORDER BY cs.created_at DESC, cs.id DESC
          LIMIT 1
        ) AS shipment_tracking_number,
        (
          SELECT cs.normalized_full_address
          FROM certificate_shipments cs
          WHERE cs.certificate_id = cert.id
            AND cs.status IN ('draft', 'quoted', 'created', 'in_transit')
          ORDER BY cs.created_at DESC, cs.id DESC
          LIMIT 1
        ) AS shipment_normalized_address,
        (
          SELECT cs.resolution_status
          FROM certificate_shipments cs
          WHERE cs.certificate_id = cert.id
            AND cs.status IN ('draft', 'quoted', 'created', 'in_transit')
          ORDER BY cs.created_at DESC, cs.id DESC
          LIMIT 1
        ) AS shipment_resolution_status
      FROM certificates cert
      JOIN students s ON cert.student_id = s.id
      LEFT JOIN classes c ON cert.class_id = c.id
      LEFT JOIN admins a ON cert.issued_by = a.id
      WHERE 1 = 1
    `;
    const params: any[] = [];

    if (classId) {
      query += ' AND cert.class_id = ?';
      params.push(classId);
    }

    if (studentId) {
      query += ' AND cert.student_id = ?';
      params.push(studentId);
    }

    if (status) {
      query += ' AND cert.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cert.issued_date DESC, cert.id DESC LIMIT ? OFFSET ?';
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
// GET /certificates/class/:id/eligible
// ========================================
certificates.get('/class/:id/eligible', requireAdmin, async (c) => {
  try {
    const classId = Number.parseInt(c.req.param('id'), 10);
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
            WHERE cert.student_id = s.id
              AND cert.class_id = r.class_id
              AND cert.status IN ('active', 'issued')
          ) THEN 1 ELSE 0
        END AS has_certificate
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      WHERE r.class_id = ?
      ORDER BY s.ho_ten_full ASC
    `).bind(classId).all();

    const eligibleStudents = (result.results || []).map((row: any) => ({
      ...row,
      has_paid: row.has_paid === 1,
      has_certificate: row.has_certificate === 1,
    }));

    return jsonResponse({
      success: true,
      data: eligibleStudents,
      count: eligibleStudents.length,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// POST /certificates - Issue a single certificate
// ========================================
certificates.post('/', requireAdmin, async (c) => {
  try {
    const { class_id, student_id } = await c.req.json() as any;
    const classId = parsePositiveInteger(class_id);
    const studentId = parsePositiveInteger(student_id);
    const user = c.get('user');

    if (!classId || !studentId) {
      return errorResponse('Thiếu class_id hoặc student_id hợp lệ', 400);
    }

    const created = await issueCertificateForStudent(c.env, classId, studentId, Number(user?.id) || null);
    return jsonResponse({
      success: true,
      message: 'Cấp chứng chỉ thành công',
      data: created,
    }, 201);
  } catch (error: any) {
    return errorResponse('Lỗi cấp chứng chỉ: ' + error.message, 500);
  }
});

// ========================================
// POST /certificates/bulk - Bulk issue certificates
// ========================================
certificates.post('/bulk', requireAdmin, async (c) => {
  try {
    const { class_id, student_ids } = await c.req.json() as any;
    const classId = parsePositiveInteger(class_id);
    const user = c.get('user');

    if (!classId || !Array.isArray(student_ids) || !student_ids.length) {
      return errorResponse('Thiếu class_id hoặc student_ids', 400);
    }

    const issuedCertificates: any[] = [];
    for (const studentId of student_ids) {
      const normalizedStudentId = parsePositiveInteger(studentId);
      if (!normalizedStudentId) continue;

      const created = await issueCertificateForStudent(
        c.env,
        classId,
        normalizedStudentId,
        Number(user?.id) || null,
        { skipExisting: true },
      );

      if (created) {
        issuedCertificates.push(created);
      }
    }

    return jsonResponse({
      success: true,
      message: `Đã cấp ${issuedCertificates.length} chứng chỉ`,
      data: issuedCertificates,
    }, 201);
  } catch (error: any) {
    return errorResponse('Lỗi cấp chứng chỉ: ' + error.message, 500);
  }
});

// ========================================
// GET /certificates/:id/shipment - Current shipment
// ========================================
certificates.get('/:id/shipment', requireAdmin, async (c) => {
  try {
    const certificateId = Number.parseInt(c.req.param('id'), 10);
    const cert = await getCertificateById(c.env.DB, certificateId);

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    const shipment = await getOpenShipmentByCertificate(c.env.DB, certificateId)
      || await getLatestShipmentByCertificate(c.env.DB, certificateId);

    return jsonResponse({
      success: true,
      data: hydrateShipment(shipment),
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy vận đơn: ' + error.message, 500);
  }
});

// ========================================
// POST /certificates/:id/shipment - Create Viettel Post shipment
// ========================================
certificates.post('/:id/shipment', requireAdmin, async (c) => {
  const certificateId = Number.parseInt(c.req.param('id'), 10);
  let draftShipmentId: number | null = null;

  try {
    const cert = await getCertificateById(c.env.DB, certificateId);
    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }
    if (!isIssuedCertificateStatus((cert as any).status)) {
      return errorResponse('Chỉ được tạo vận đơn cho chứng chỉ đã cấp.', 400);
    }

    const body = await c.req.json();
    const user = c.get('user');
    const receiverName = String(body?.receiver_name || '').trim();
    const receiverPhone = String(body?.receiver_phone || '').trim();
    const rawAddress = String(body?.raw_address || '').trim();
    const addressLine = String(body?.address_line || '').trim();
    const normalizedFullAddress = String(body?.normalized_full_address || '').trim();
    const resolutionStatus = String(body?.resolution_status || '').trim();
    const provinceId = parsePositiveInteger(body?.province_id);
    const districtId = parsePositiveInteger(body?.district_id);
    const wardId = parsePositiveInteger(body?.ward_id);
    const serviceCode = String(body?.service_code || '').trim();
    const serviceName = String(body?.service_name || '').trim();
    const productWeight = parsePositiveInteger(body?.product_weight_grams) || 250;
    const serviceAddCodes = Array.isArray(body?.service_add_codes)
      ? body.service_add_codes.map((value: unknown) => String(value || '').trim()).filter(Boolean)
      : [];
    const warnings = Array.isArray(body?.warnings) ? body.warnings : [];

    if (!receiverName) {
      return errorResponse('Thiếu receiver_name.', 400);
    }
    if (!receiverPhone || !isVietnamesePhoneNumber(receiverPhone)) {
      return errorResponse('Số điện thoại người nhận chưa hợp lệ.', 400);
    }
    if (!rawAddress || !addressLine || !provinceId || !districtId || !wardId) {
      return errorResponse('Địa chỉ vận chuyển chưa đầy đủ.', 400);
    }
    if (resolutionStatus !== 'resolved') {
      return errorResponse('Địa chỉ chưa được chuẩn hóa rõ ràng, chưa thể tạo vận đơn.', 400);
    }
    if (!serviceCode) {
      return errorResponse('Thiếu service_code để tạo vận đơn.', 400);
    }

    const openShipment = await getOpenShipmentByCertificate(c.env.DB, certificateId);
    if (openShipment && openShipment.status !== 'draft') {
      return errorResponse('Chứng chỉ này đã có vận đơn đang hoạt động.', 409);
    }

    const draftPayload = {
      certificate_id: certificateId,
      student_id: Number((cert as any).student_id),
      carrier: 'viettel_post',
      status: 'draft',
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      address_raw: rawAddress,
      address_line: addressLine,
      province_id: provinceId,
      province_name: body?.province_name || null,
      district_id: districtId,
      district_name: body?.district_name || null,
      ward_id: wardId,
      ward_name: body?.ward_name || null,
      normalized_full_address: normalizedFullAddress,
      resolution_status: resolutionStatus,
      warnings_json: warnings,
      service_code: serviceCode,
      service_name: serviceName || null,
      service_add_codes_json: serviceAddCodes,
      product_name: 'Chứng chỉ',
      product_description: 'Chứng chỉ, tài liệu',
      product_weight_grams: productWeight,
      declared_value: 0,
      created_by: Number(user?.id) || null,
      raw_request_json: {
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        raw_address: rawAddress,
        address_line: addressLine,
        province_id: provinceId,
        district_id: districtId,
        ward_id: wardId,
        service_code: serviceCode,
        service_add_codes: serviceAddCodes,
        product_weight_grams: productWeight,
      },
    };

    if (openShipment?.id) {
      draftShipmentId = Number(openShipment.id);
      await updateCertificateShipment(c.env.DB, draftShipmentId, draftPayload);
    } else {
      const draftResult = await createCertificateShipment(c.env.DB, draftPayload);
      draftShipmentId = Number(draftResult.meta.last_row_id);
    }

    const partnerOrderNumber = `CERT-${certificateId}-${draftShipmentId}-${Date.now()}`;
    const carrierResult = await createViettelPostShipment(c.env, {
      order_number: partnerOrderNumber,
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      raw_address: rawAddress,
      address_line: addressLine,
      province_id: provinceId,
      district_id: districtId,
      ward_id: wardId,
      service_code: serviceCode,
      service_name: serviceName || null,
      service_add_codes: serviceAddCodes,
      product_weight_grams: productWeight,
      product_name: 'Chứng chỉ',
      product_description: 'Chứng chỉ, tài liệu',
      declared_value: 0,
    });

    await updateCertificateShipment(c.env.DB, draftShipmentId, {
      status: 'created',
      carrier_order_number: carrierResult.carrier_order_number,
      carrier_tracking_number: carrierResult.carrier_tracking_number,
      shipping_fee: carrierResult.shipping_fee,
      raw_request_json: carrierResult.request_payload,
      raw_response_json: carrierResult.raw,
    });

    const shipment = await getLatestShipmentByCertificate(c.env.DB, certificateId);
    return jsonResponse({
      success: true,
      message: 'Tạo vận đơn Viettel Post thành công',
      data: hydrateShipment(shipment),
    }, 201);
  } catch (error: any) {
    const message = getViettelPostErrorMessage(error);
    const status = Number((error as any)?.status) || 502;

    if (draftShipmentId) {
      await updateCertificateShipment(c.env.DB, draftShipmentId, {
        status: 'draft',
        raw_response_json: {
          message,
          details: (error as any)?.details || null,
        },
      });
    }

    return errorResponse(message, status);
  }
});

// ========================================
// GET /certificates/:id - Detail
// ========================================
certificates.get('/:id', async (c) => {
  try {
    const id = Number.parseInt(c.req.param('id'), 10);
    const cert = await getCertificateById(c.env.DB, id);

    if (!cert) {
      return errorResponse('Không tìm thấy chứng chỉ', 404);
    }

    return jsonResponse({
      success: true,
      data: cert,
    });
  } catch (error: any) {
    return errorResponse('Lỗi server: ' + error.message, 500);
  }
});

// ========================================
// PUT /certificates/:id/revoke
// ========================================
certificates.put('/:id/revoke', requireAdmin, async (c) => {
  try {
    const id = Number.parseInt(c.req.param('id'), 10);
    if (!Number.isFinite(id) || id <= 0) return errorResponse('ID không hợp lệ', 400);
    const existing = await getCertificateById(c.env.DB, id);
    if (!existing) return errorResponse('Không tìm thấy chứng chỉ', 404);
    await updateCertificateStatus(c.env.DB, id, 'revoked');

    return jsonResponse({
      success: true,
      message: 'Thu hồi chứng chỉ thành công',
    });
  } catch (error: any) {
    return errorResponse('Lỗi thu hồi: ' + error.message, 500);
  }
});

export default certificates;
