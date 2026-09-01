import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { z } from 'zod';
import { createGetEndpoint, createPostEndpoint, createPutEndpoint, createDeleteEndpoint } from '../lib/api-templates.js';
import * as StudentService from '../services/student-service.js';
import { errorResponse } from '../utils/helpers.js';
import { requireAdmin, requireAdminOrTeacher, requireAuth } from '../middleware/auth-middleware.js';
import { loginRateLimiter } from '../utils/rate-limiter.js';

const students = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();
const STUDENT_LOGIN_IDENTIFIER_REGEX = /^(?:test123|[0-9\s\-.]{7,20}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

students.post('/upload-image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!file) return errorResponse('Thiếu file', 400);
    const result = await StudentService.uploadImage(c, file as any);
    return c.json({ success: true, ...result });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
});

students.get('/image/:key', async (c) => {
  const rawKey = c.req.param('key');
  let key = rawKey;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    key = rawKey;
  }

  const object = await c.env.R2.get(key);
  if (!object) return new Response('Image not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(object.body, { headers });
});

// Public: student login (rate limited — max 5 failed attempts per IP per 15 min)
students.post('/login', loginRateLimiter, createPostEndpoint({
  body: z.object({
    cccd: z.string(),
    sdt: z.string().regex(STUDENT_LOGIN_IDENTIFIER_REGEX, 'Thông tin đăng nhập không hợp lệ'),
  }),
  handler: (async (c: any, { body }: any) => {
    return await StudentService.loginStudent(c, body.cccd, body.sdt);
  }) as any
}));

// Public: student self-registration
students.post('/register', createPostEndpoint({
  body: z.object({
    cccd: z.string().min(9).max(20),
    ho: z.string().min(1).max(100),
    ten_dem: z.string().max(100).optional().default(''),
    ten: z.string().min(1).max(50),
    ngay_sinh: z.string(),
    gioi_tinh: z.string().optional(),
    dan_toc: z.string().optional(),
    quoc_tich: z.string().optional(),
    noi_sinh: z.string().optional(),
    sdt: z.string().min(7).max(15),
    email: z.string().email(),
    dia_chi: z.string().optional(),
    don_vi_cong_tac: z.string().optional(),
    nganh_dang_hoc: z.string().optional(),
    ngay_cap_cccd: z.string().optional(),
    noi_cap_cccd: z.string().optional(),
    cccd_front_image_id: z.string().optional(),
    cccd_back_image_id: z.string().optional(),
    photo_3x4_image_id: z.string().optional(),
  }).strict(),
  handler: (async (c: any, { body }: any) => {
    return await StudentService.registerStudent(c, body);
  }) as any
}));

// Protected: list students — admin or teacher only (server-side pagination)
students.get('/', requireAdminOrTeacher, createGetEndpoint({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
    q: z.string().optional(),
    status: z.string().optional(),
    registration_type: z.string().optional(),
    has_certificate: z.string().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional(),
    sort_by: z.string().optional(),
    sort_dir: z.string().optional(),
  }),
  handler: (async (c: any, { query }: any) => {
    const parsedLimit = parseInt(query.limit || '', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
    const page = Math.max(parseInt(query.page || '1'), 1);
    const offset = query.offset !== undefined
      ? parseInt(query.offset)
      : limit !== null
        ? (page - 1) * limit
        : 0;
    const filters = {
      q: query.q,
      status: query.status,
      registration_type: query.registration_type,
      has_certificate: query.has_certificate,
      created_from: query.created_from,
      created_to: query.created_to,
      sort_by: query.sort_by,
      sort_dir: query.sort_dir,
    };
    return await StudentService.getStudentsList(c, limit, offset, page, filters);
  }) as any
}));

// Protected: search students — admin or teacher only (used for internal lookup)
students.get('/search', requireAdminOrTeacher, createGetEndpoint({
  query: z.object({ q: z.string() }),
  handler: (async (c: any, { query }: any) => {
    return await StudentService.searchStudents(c, query.q);
  }) as any
}));

// Protected: admin preflight validation — admin only
students.post('/admin/validate', requireAdmin, createPostEndpoint({
  body: z.any(),
  handler: (async (c: any, { body }: any) => {
    return await StudentService.validateStudentAdmin(c, body);
  }) as any
}));

// Protected: import students from Excel — admin only
students.post('/import-excel', requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return errorResponse('Thiếu file Excel', 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return errorResponse('File quá lớn. Kích thước tối đa là 5MB', 400);
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls'].includes(ext)) {
      return errorResponse('Chỉ hỗ trợ file .xlsx hoặc .xls', 400);
    }

    const { parseAndValidateStudents } = await import('../utils/excel-student-import.js');
    const { normalizeText, formatDate } = await import('../utils/helpers.js');
    const { normalizeStudentGender } = await import('../services/student-service.js');
    const StudentRepo = await import('../repositories/student-repository.js');

    const buffer = await file.arrayBuffer();
    const result = parseAndValidateStudents(buffer);

    if (result.preview.length === 0) {
      return c.json({ success: true, data: result });
    }

    // Check existing CCCDs in DB
    const cccds = result.preview.map(s => s.cccd);
    const existingMap = new Map<string, boolean>();
    for (const cccd of cccds) {
      const existing = await StudentRepo.findStudentByCCCD(c.env.DB, cccd);
      if (existing) existingMap.set(cccd, true);
    }

    const finalStudents = [];
    for (const student of result.preview) {
      if (existingMap.has(student.cccd)) {
        result.skipped++;
        result.errors.push({
          row: 0,
          field: 'cccd',
          message: `CCCD ${student.cccd} đã tồn tại trong hệ thống — bỏ qua`,
        });
        continue;
      }
      finalStudents.push(student);
    }

    // Create students
    let created = 0;
    for (const student of finalStudents) {
      try {
        const ho = student.ho.toLocaleUpperCase('vi-VN').trim();
        const tenDem = (student.ten_dem || '').toLocaleUpperCase('vi-VN').trim();
        const ten = student.ten.toLocaleUpperCase('vi-VN').trim();
        const ho_ten_full = [ho, tenDem, ten].filter(Boolean).join(' ');
        const ho_ten_normalized = normalizeText(ho_ten_full);

        let gioi_tinh = 'Nam';
        if (student.gioi_tinh) {
          try { gioi_tinh = normalizeStudentGender(student.gioi_tinh); } catch {}
        }

        await StudentRepo.createStudent(c.env.DB, {
          cccd: student.cccd,
          ho,
          ten_dem: tenDem,
          ten,
          ho_ten_full,
          ho_ten_normalized,
          ngay_sinh: student.ngay_sinh || null,
          noi_sinh: student.noi_sinh || '',
          gioi_tinh,
          dan_toc: student.dan_toc || 'KINH',
          quoc_tich: student.quoc_tich || 'VIỆT NAM',
          email: student.email || null,
          sdt: student.sdt || null,
          dia_chi: student.dia_chi || null,
          ngay_cap_cccd: student.ngay_cap_cccd || null,
          don_vi_cong_tac: student.don_vi_cong_tac || null,
        });
        created++;
      } catch (err: any) {
        result.errors.push({
          row: 0,
          field: 'general',
          message: `CCCD ${student.cccd}: ${err.message}`,
        });
      }
    }

    result.created = created;
    result.valid_rows = finalStudents.length;

    return c.json({ success: true, data: result });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
});

// Protected: edit history — admin or teacher only
students.get('/:id/history', requireAdminOrTeacher, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  query: z.object({ limit: z.string().optional(), offset: z.string().optional() }),
  handler: (async (c: any, { params, query }: any) => {
    return await StudentService.getStudentEditHistory(c, params.id, parseInt(query.limit || '100'), parseInt(query.offset || '0'));
  }) as any
}));

// Protected: get student by CCCD — authenticated users only (admin/teacher full; student self-access)
students.get('/:cccd', requireAuth, createGetEndpoint({
  params: z.object({ cccd: z.string() }),
  handler: (async (c: any, { params }: any) => {
    return await StudentService.getStudentByCCCD(c, params.cccd);
  }) as any
}));

// Protected: student self-update by CCCD (or admin update)
// Students may only update their own record (CCCD must match token); admins can update any
students.put('/update-by-cccd', requireAuth, createPutEndpoint({
  body: z.any(),
  handler: (async (c: any, { body }: any) => {
    const user = c.get('user');
    const currentCCCD = String(body.current_cccd || body.cccd || '').trim();
    // If caller is a student, enforce they can only update their own record
    if (user?.type === 'student' && user.cccd !== currentCCCD) {
      throw new Error('Không có quyền cập nhật thông tin học viên khác');
    }
    return await StudentService.updateStudentByCCCD(c, body);
  }) as any
}));

// Protected: admin update by numeric ID — admin only
students.put('/:id', requireAdmin, createPutEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  body: z.any(),
  handler: (async (c: any, { params, body }: any) => {
    return await StudentService.updateStudentAdmin(c, params.id, body);
  }) as any
}));

// Protected: delete student — admin only
students.delete('/:id', requireAdmin, createDeleteEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: (async (c: any, { params }: any) => {
    return await StudentService.deleteStudentAdmin(c, params.id);
  }) as any
}));

// Protected: admin-side registration — admin only
students.post('/admin', requireAdmin, createPostEndpoint({
  body: z.any(),
  handler: (async (c: any, { body }: any) => {
    const res = await StudentService.registerStudent(c, body);
    return { student_id: res.student_id };
  }) as any
}));

// Protected: normalize legacy student data to uppercase (except email) — admin only
students.post('/admin/normalize-uppercase', requireAdmin, createPostEndpoint({
  body: z.any().optional(),
  handler: (async (c: any, { body }: any) => {
    return await StudentService.normalizeAllStudentsUppercase(c, Boolean(body?.dry_run));
  }) as any
}));

export default students;
