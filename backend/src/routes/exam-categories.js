// ========================================
// EXAM CATEGORIES ROUTE
// Proxy exam_categories từ DB chung (vantrangexam + vantrangedu dùng chung DB)
// Teacher bên vantrangexam tạo/sửa category → admin thongtin thấy để chọn exam_type
// ========================================
import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { authMiddleware } from '../middleware/auth-middleware.js';

const examCategories = new Hono();

// GET /exam-categories — public, trả danh sách để admin chọn exam_type
examCategories.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT id, name, code, description, icon, color
      FROM exam_categories
      ORDER BY name ASC
    `).all();

    return jsonResponse({
      success: true,
      data: result.results || [],
    });
  } catch (error) {
    return errorResponse('Lỗi lấy danh sách thể loại thi: ' + error.message, 500);
  }
});

export default examCategories;
