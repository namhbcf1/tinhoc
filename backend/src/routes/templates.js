import { Hono } from 'hono';
import { errorResponse } from '../utils/helpers.js';
const templatesRoute = new Hono();
// ========================================
// GET /templates - Lấy danh sách templates
// ========================================
templatesRoute.get('/', async (c) => {
    try {
        const templates = await c.env.DB.prepare('SELECT id, name, display_name, is_active FROM excel_templates WHERE is_active = 1 ORDER BY display_name').all();
        return c.json({
            success: true,
            data: templates.results || []
        });
    }
    catch (error) {
        console.error('Get templates error:', error);
        return errorResponse('Lỗi lấy danh sách template: ' + error.message, 500);
    }
});
// ========================================
// GET /templates/:id - Lấy chi tiết template
// ========================================
templatesRoute.get('/:id', async (c) => {
    try {
        const id = parseInt(c.req.param('id'));
        const template = await c.env.DB.prepare('SELECT * FROM excel_templates WHERE id = ?').bind(id).first();
        if (!template) {
            return errorResponse('Template không tồn tại', 404);
        }
        return c.json({
            success: true,
            data: template
        });
    }
    catch (error) {
        return errorResponse('Lỗi server: ' + error.message, 500);
    }
});
export default templatesRoute;
