import { Hono } from 'hono';
import { z } from 'zod';
import { 
  createGetEndpoint, 
  createPostEndpoint, 
  createPutEndpoint, 
  createDeleteEndpoint 
} from '../lib/api-templates.js';
import * as ClassService from '../lib/services/classes.js';

const classes = new Hono();

// ========================================
// GET /classes - Lấy tất cả lớp
// ========================================
classes.get('/', createGetEndpoint({
  handler: async (c) => {
    return await ClassService.fetchAllClasses(c.env.DB);
  }
}));

// ========================================
// GET /classes/open - Lấy lớp đang mở đăng ký
// ========================================
classes.get('/open', createGetEndpoint({
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
    return await ClassService.fetchAvailableStudents(c.env.DB, params.id, query.q);
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
