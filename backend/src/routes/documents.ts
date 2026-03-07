import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { z } from 'zod';
import { createGetEndpoint, createPostEndpoint, createDeleteEndpoint } from '../lib/api-templates.js';
import * as DocService from '../services/document-service.js';
import * as DocRepo from '../repositories/document-repository.js';
import { errorResponse } from '../utils/helpers.js';
import { authMiddleware } from '../middleware/auth-middleware.js';

const documents = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

documents.post('/upload', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const form = Object.fromEntries(formData.entries());
    const res = await DocService.uploadDocument(c, form, file, c.get('user'));
    return c.json({ success: true, message: 'Upload thành công', ...res }, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
});

documents.get('/by-folder/:folderId', authMiddleware, createGetEndpoint({
  params: z.object({ folderId: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentsByFolderId(c.env.DB, params.folderId)
}));

documents.get('/:id/shares', authMiddleware, createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentShares(c.env.DB, params.id)
}));

documents.post('/:id/share', authMiddleware, createPostEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  body: z.object({ targets: z.array(z.any()) }),
  handler: async (c, { params, body }) => {
    await DocService.shareDocumentIntoClasses(c, params.id, body.targets, c.get('user'));
    return { message: 'Đã chia sẻ tài liệu' };
  }
}));

documents.post('/:id/unshare', authMiddleware, createPostEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  body: z.object({ type: z.string(), id: z.number().or(z.string().transform(Number)) }),
  handler: async (c, { params, body }) => {
    await DocService.unshareDocument(c, params.id, body.type, body.id);
    return { message: 'Đã thu hồi chia sẻ' };
  }
}));

documents.get('/for/online-class/:id', createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByOnlineClassShared(c.env.DB, params.id)
}));

documents.get('/for/offline-class/:id', createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByOfflineClassShared(c.env.DB, params.id)
}));

documents.get('/online-class/:classId', createGetEndpoint({
  params: z.object({ classId: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByOnlineClass(c.env.DB, params.classId)
}));

documents.post('/student', createPostEndpoint({
  body: z.object({ student_id: z.any(), class_ids: z.array(z.number()).optional() }),
  handler: async (c, { body }) => await DocService.getStudentDocuments(c, body.student_id, body.class_ids || [])
}));

documents.get('/cccd/:cccd', createGetEndpoint({
  params: z.object({ cccd: z.string() }),
  handler: async (c, { params }) => await DocService.getDocumentsByCCCD(c, params.cccd)
}));

documents.get('/class/:classId', createGetEndpoint({
  params: z.object({ classId: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocsByClass(c.env.DB, params.classId)
}));

documents.get('/:id/download', async (c) => {
  try {
    const { object, doc } = await DocService.processDocumentDownload(c, parseInt(c.req.param('id')), c.req.query('student_id'));
    const isMedia = doc.file_type?.match(/^(image|video|audio)\/|application\/pdf/);
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `${isMedia ? 'inline' : 'attachment'}; filename="${encodeURIComponent(doc.file_name)}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (err: any) { return errorResponse(err.message, 500); }
});

documents.get('/:id/view', async (c) => {
  try {
    const { object, doc } = await DocService.processDocumentDownload(c, parseInt(c.req.param('id')));
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.file_name)}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (err: any) { return errorResponse(err.message, 500); }
});

documents.get('/:id/stats', createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentDownloadStats(c.env.DB, params.id)
}));

documents.get('/:id/permissions', createGetEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => await DocRepo.getDocumentPermissions(c.env.DB, params.id)
}));

documents.get('/', createGetEndpoint({
  query: z.object({ limit: z.string().optional(), offset: z.string().optional() }),
  handler: async (c, { query }) => await DocRepo.getAllDocuments(c.env.DB, parseInt(query.limit || '100'), parseInt(query.offset || '0'))
}));

documents.delete('/:id', authMiddleware, createDeleteEndpoint({
  params: z.object({ id: z.string().transform(Number) }),
  handler: async (c, { params }) => {
    await DocService.deleteDocument(c, params.id);
    return { message: 'Xóa tài liệu thành công' };
  }
}));

export default documents;
