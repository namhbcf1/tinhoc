import { Hono } from 'hono';
import type { Env } from '../types/env.js';
import { z } from 'zod';
import {
  createGetEndpoint,
  createPostEndpoint,
  createPutEndpoint,
  createDeleteEndpoint
} from '../lib/api-templates.js';
import * as ClassService from '../lib/services/classes.js';
import {
  createClassSession,
  deleteClassSession,
  listClassSessions,
  updateClassSession,
} from '../db/class-session-queries.js';

const classes = new Hono<{ Bindings: Env }>();

const classSessionBodySchema = z.object({
  session_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  session_type: z.enum(['lesson', 'exam', 'final_assessment', 'assignment_review', 'other']).optional(),
  title: z.string().optional(),
  content_outline: z.string().optional(),
  period_count: z.number().int().nullable().optional(),
  teacher_id: z.number().int().nullable().optional(),
  room: z.string().nullable().optional(),
  meeting_link: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().int().nullable().optional(),
});

// ========================================
// GET /classes - Lấy tất cả lớp
// ========================================
classes.get('/', createGetEndpoint({
  cacheControl: 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
  handler: async (c) => {
    return await ClassService.fetchAllClasses(c.env.DB);
  }
}));

// ========================================
// GET /classes/open - Lấy lớp đang mở đăng ký
// ========================================
classes.get('/open', createGetEndpoint({
  cacheControl: 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
  handler: async (c) => {
    return await ClassService.fetchOpenClasses(c.env.DB);
  }
}));

// ========================================
// GET /classes/:id/available-students - Lấy danh sách học sinh có thể thêm vào lớp
// ========================================
classes.get('/:id/available-students', createGetEndpoint({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10))
  }),
  query: z.object({
    q: z.string().optional()
  }),
  handler: async (c, { params, query }) => {
    return await ClassService.fetchAvailableStudents(c.env.DB, params.id, query.q as string);
  }
}));

// ========================================
// GET /classes/:id/sessions - Lấy danh sách buổi học linh hoạt
// ========================================
classes.get('/:id/sessions', createGetEndpoint({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10))
  }),
  handler: async (c, { params }) => {
    return await listClassSessions(c.env.DB, params.id);
  }
}));

// ========================================
// POST /classes/:id/sessions - Tạo buổi học mới
// ========================================
classes.post('/:id/sessions', createPostEndpoint({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10))
  }),
  body: classSessionBodySchema,
  handler: async (c, { params, body }) => {
    return await createClassSession(c.env.DB, params.id, body);
  }
}));

// ========================================
// PUT /classes/:id/sessions/:sessionId - Cập nhật buổi học
// ========================================
classes.put('/:id/sessions/:sessionId', createPutEndpoint({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)),
    sessionId: z.string().transform((val) => parseInt(val, 10))
  }),
  body: classSessionBodySchema,
  handler: async (c, { params, body }) => {
    return await updateClassSession(c.env.DB, params.id, params.sessionId, body);
  }
}));

// ========================================
// DELETE /classes/:id/sessions/:sessionId - Xóa buổi học
// ========================================
classes.delete('/:id/sessions/:sessionId', createDeleteEndpoint({
  params: z.object({
    id: z.string().transform((val) => parseInt(val, 10)),
    sessionId: z.string().transform((val) => parseInt(val, 10))
  }),
  handler: async (c, { params }) => {
    return await deleteClassSession(c.env.DB, params.id, params.sessionId);
  }
}));

// ========================================
// POST /classes/:id/students - Thêm học sinh vào lớp (Admin only)
// ========================================
classes.post('/:id/students', createPostEndpoint({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10))
  }),
  body: z.object({
    student_id: z.number()
  }),
  handler: async (c, { params, body }) => {
    return await ClassService.addStudentToClass(c.env.DB, params.id, body.student_id);
  }
}));

// ========================================
// GET /classes/:id - Lấy chi tiết lớp
// ========================================
classes.get('/:id', createGetEndpoint({
  cacheControl: 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10))
  }),
  handler: async (c, { params }) => {
    return await ClassService.fetchClassById(c.env.DB, params.id);
  }
}));

// ========================================
// POST /classes - Tạo lớp mới (Admin only)
// ========================================
classes.post('/', createPostEndpoint({
  body: z.any(),
  handler: async (c, { body }) => {
    return await ClassService.addClass(c.env.DB, body);
  }
}));

// ========================================
// PUT /classes/:id - Cập nhật lớp (Admin only)
// ========================================
classes.put('/:id', createPutEndpoint({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10))
  }),
  body: z.any(),
  handler: async (c, { params, body }) => {
    return await ClassService.modifyClass(c.env, params.id, body);
  }
}));

// ========================================
// DELETE /classes/:id - Xóa lớp (Admin only)
// ========================================
classes.delete('/:id', createDeleteEndpoint({
  params: z.object({
    id: z.string().transform(val => parseInt(val, 10))
  }),
  handler: async (c, { params }) => {
    return await ClassService.removeClass(c.env, params.id);
  }
}));

export default classes;
