import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { z } from 'zod';
import { createGetEndpoint, createPostEndpoint, createPutEndpoint, createDeleteEndpoint } from '../lib/api-templates.js';
import * as StudentService from '../services/student-service.js';
import { errorResponse } from '../utils/helpers.js';
import { requireAdmin, requireAdminOrTeacher, requireAuth } from '../middleware/auth-middleware.js';
import { loginRateLimiter } from '../utils/rate-limiter.js';

const students = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

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
  const object = await c.env.R2.get(c.req.param('key'));
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
  body: z.object({ cccd: z.string(), sdt: z.string() }),
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
    // Legacy offset-based params kept for backward compat
    offset: z.string().optional(),
  }),
  handler: (async (c: any, { query }: any) => {
    const limit = Math.min(parseInt(query.limit || '20'), 100); // cap at 100
    const page = Math.max(parseInt(query.page || '1'), 1);
    const offset = query.offset !== undefined
      ? parseInt(query.offset)
      : (page - 1) * limit;
    return await StudentService.getStudentsList(c, limit, offset, page);
  }) as any
}));

// Protected: search students — admin or teacher only (used for internal lookup)
students.get('/search', requireAdminOrTeacher, createGetEndpoint({
  query: z.object({ q: z.string() }),
  handler: (async (c: any, { query }: any) => {
    return await StudentService.searchStudents(c, query.q);
  }) as any
}));

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

export default students;
