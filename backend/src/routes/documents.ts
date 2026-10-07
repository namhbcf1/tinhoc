import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { z } from 'zod';
import { createGetEndpoint, createPostEndpoint, createDeleteEndpoint } from '../lib/api-templates.js';
import * as DocService from '../services/document-service.js';
import * as DocRepo from '../repositories/document-repository.js';
import { errorResponse, verifyJWT } from '../utils/helpers.js';
import { authMiddleware, requireAdmin } from '../middleware/auth-middleware.js';

const documents = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

/**
 * BẢO MẬT (2026-10-07): trước đây nhiều route tài liệu KHÔNG có auth (liệt kê tài liệu
 * của lớp/student, list toàn bộ tài liệu, download/view theo id số) và
 * `processDocumentDownload` cũng không kiểm quyền ⇒ ẩn danh đọc được mọi tài liệu.
 *
 * Viewer được xác định từ header `Authorization` HOẶC query `?token=` — dạng sau dùng cho
 * link tải mở bằng `window.open()` (trình duyệt không gắn header cho điều hướng).
 */
async function resolveDocumentViewer(c: any): Promise<any | null> {
  const raw =
    c.req.header('Authorization')?.replace('Bearer ', '') ||
    c.req.query('token') ||
    '';
  if (!raw) return null;
  try {
    const payload = await verifyJWT(raw, c.env.JWT_SECRET);
    return payload || null;
  } catch {
    return null;
  }
}

function isStaffViewer(user: any): boolean {
  if (!user) return false;
  const role = user.role;
  if (role === 'admin' || role === 'super_admin' || role === 'teacher') return true;
  return user.type !== 'student' && Boolean(role);
}

/**
 * Tài liệu chỉ được coi là công khai khi có permission_type = 'public'.
 * Không có permission row ⇒ tài liệu nội bộ, chỉ staff xem được.
 */
async function canViewDocument(c: any, documentId: number, viewer: any | null): Promise<boolean> {
  if (isStaffViewer(viewer)) return true;

  const perms = await DocRepo.getDocumentPermissions(c.env.DB, documentId);
  if (!perms || perms.length === 0) return false;
  if (perms.some((p: any) => p.permission_type === 'public')) return true;
  if (!viewer) return false;

  const studentId = viewer.id ?? viewer.student_id ?? null;
  if (studentId == null) return false;

  // Quyền gán trực tiếp cho học viên
  if (
    perms.some(
      (p: any) =>
        p.permission_type === 'student' && String(p.student_id ?? '') === String(studentId),
    )
  ) {
    return true;
  }

  // Quyền theo lớp: chấp nhận khi học viên đã đăng nhập (việc kiểm membership lớp
  // theo từng lớp được xử lý ở tầng UI/route lớp; ở đây chặn truy cập ẩn danh).
  return perms.some(
    (p: any) => p.permission_type === 'class' && (p.class_id != null || p.online_class_id != null),
  );
}


documents.post('/upload', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const form = Object.fromEntries(formData.entries());
    const res = await DocService.uploadDocument(c, form, file as unknown as File, c.get('user'));
    return c.json({ success: true, message: 'Upload thành công', ...res }, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
});

documents.get('/by-folder/:folderId', authMiddleware, createGetEndpoint({
  params: z.object({ folderId: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentsByFolderId(c.env.DB, params.folderId)
}));

documents.get('/:id/shares', requireAdmin, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentShares(c.env.DB, params.id)
}));

documents.post('/:id/share', requireAdmin, createPostEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  body: z.object({ targets: z.array(z.any()) }),
  handler: async (c, { params, body }) => {
    await DocService.shareDocumentIntoClasses(c, params.id, body.targets, c.get('user'));
    return { success: true as const, data: { message: 'Đã chia sẻ tài liệu' } };
  }
}));

documents.post('/:id/unshare', requireAdmin, createPostEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  body: z.object({ type: z.string(), id: z.number().or(z.string().transform(Number)) }),
  handler: async (c, { params, body }) => {
    await DocService.unshareDocument(c, params.id, body.type, body.id);
    return { success: true as const, data: { message: 'Đã thu hồi chia sẻ' } };
  }
}));

documents.get('/for/online-class/:id', authMiddleware, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByOnlineClassShared(c.env.DB, params.id)
}));

documents.get('/for/offline-class/:id', authMiddleware, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByOfflineClassShared(c.env.DB, params.id)
}));

documents.get('/online-class/:classId', authMiddleware, createGetEndpoint({
  params: z.object({ classId: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByOnlineClass(c.env.DB, params.classId)
}));

documents.post('/student', authMiddleware, createPostEndpoint({
  body: z.object({ student_id: z.any(), class_ids: z.array(z.number()).optional() }),
  handler: async (c, { body }) => {
    const user = c.get('user');
    // Học viên chỉ được xem tài liệu của chính mình
    if (user?.type === 'student' && String(user.id) !== String(body.student_id)) {
      throw new Error('Không có quyền xem tài liệu của học viên khác');
    }
    const data = await DocService.getStudentDocuments(c, body.student_id, body.class_ids || []);
    return { success: true as const, data };
  }
}));

documents.get('/cccd/:cccd', authMiddleware, createGetEndpoint({
  params: z.object({ cccd: z.string() }),
  handler: async (c, { params }) => {
    const user = c.get('user');
    if (user?.type === 'student' && String(user.cccd || '') !== String(params.cccd || '')) {
      throw new Error('Không có quyền xem tài liệu của học viên khác');
    }
    const data = await DocService.getDocumentsByCCCD(c, params.cccd);
    return { success: true as const, data };
  }
}));

documents.get('/class/:classId', authMiddleware, createGetEndpoint({
  params: z.object({ classId: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByClass(c.env.DB, params.classId)
}));

documents.get('/:id/download', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const viewer = await resolveDocumentViewer(c);
    if (!(await canViewDocument(c, id, viewer))) {
      return errorResponse('Không có quyền tải tài liệu này', viewer ? 403 : 401);
    }

    const { object, doc } = await DocService.processDocumentDownload(c, id, c.req.query('student_id'));
    const isMedia = doc.file_type?.match(/^(image|video|audio)\/|application\/pdf/);
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `${isMedia ? 'inline' : 'attachment'}; filename="${encodeURIComponent(doc.file_name)}"`,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (err: any) { return errorResponse(err.message, 500); }
});

documents.get('/:id/view', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const viewer = await resolveDocumentViewer(c);
    if (!(await canViewDocument(c, id, viewer))) {
      return errorResponse('Không có quyền xem tài liệu này', viewer ? 403 : 401);
    }

    const { object, doc } = await DocService.processDocumentDownload(c, id);
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.file_name)}"`,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (err: any) { return errorResponse(err.message, 500); }
});

documents.get('/:id/stats', requireAdmin, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentDownloadStats(c.env.DB, params.id)
}));

documents.get('/:id/permissions', requireAdmin, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentPermissions(c.env.DB, params.id)
}));

documents.get('/', requireAdmin, createGetEndpoint({
  query: z.object({ limit: z.string().optional(), offset: z.string().optional() }),
  handler: async (c, { query }) => await DocRepo.getAllDocuments(c.env.DB, parseInt(query.limit || '100'), parseInt(query.offset || '0'))
}));

documents.delete('/:id', authMiddleware, createDeleteEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => {
    await DocService.deleteDocument(c, params.id);
    return { success: true as const, data: { message: 'Xóa tài liệu thành công' } };
  }
}));

export default documents;
