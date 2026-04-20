import { Hono } from 'hono';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { createNotification, getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, } from '../db/notification-queries.js';
const notifications = new Hono();
// ========================================
// GET /notifications - Get notifications
// ========================================
notifications.get('/', async (c) => {
    try {
        const user = c.get('user');
        const read = c.req.query('read');
        const limit = parseInt(c.req.query('limit')) || 50;
        const offset = parseInt(c.req.query('offset')) || 0;
        let user_id = null;
        let user_type = null;
        if (user) {
            // Admin or student
            if (user.role) {
                user_type = 'admin';
            }
            else {
                user_id = user.id;
                user_type = 'student';
            }
        }
        else {
            // Public - only 'all' notifications
            user_type = 'all';
        }
        const notificationsData = await getNotifications(c.env.DB, {
            user_id,
            user_type,
            read: read === 'true' ? true : read === 'false' ? false : null,
            limit,
            offset,
        });
        const unreadCount = await getUnreadCount(c.env.DB, user_id, user_type);
        return jsonResponse({
            success: true,
            data: notificationsData,
            unreadCount,
            count: notificationsData.length,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy thông báo: ' + error.message, 500);
    }
});
// ========================================
// GET /notifications/unread-count - Get unread count
// ========================================
notifications.get('/unread-count', async (c) => {
    try {
        const user = c.get('user');
        let user_id = null;
        let user_type = null;
        if (user) {
            if (user.role) {
                user_type = 'admin';
            }
            else {
                user_id = user.id;
                user_type = 'student';
            }
        }
        else {
            user_type = 'all';
        }
        const count = await getUnreadCount(c.env.DB, user_id, user_type);
        return jsonResponse({
            success: true,
            unreadCount: count,
        });
    }
    catch (error) {
        return errorResponse('Lỗi lấy số thông báo: ' + error.message, 500);
    }
});
// ========================================
// POST /notifications - Create notification (Admin only)
// ========================================
notifications.post('/', async (c) => {
    try {
        const { user_id, user_type, title, message, type, link } = await c.req.json();
        if (!title || !message) {
            return errorResponse('Thiếu title hoặc message', 400);
        }
        const result = await createNotification(c.env.DB, {
            user_id: user_id || null,
            user_type: user_type || 'all',
            title,
            message,
            type: type || 'info',
            link: link || null,
        });
        return jsonResponse({
            success: true,
            message: 'Tạo thông báo thành công',
            data: {
                id: result.meta.last_row_id,
            },
        }, 201);
    }
    catch (error) {
        return errorResponse('Lỗi tạo thông báo: ' + error.message, 500);
    }
});
// ========================================
// PUT /notifications/:id/read - Mark as read
// ========================================
notifications.put('/:id/read', async (c) => {
    try {
        const { id } = c.req.param();
        await markAsRead(c.env.DB, parseInt(id));
        return jsonResponse({
            success: true,
            message: 'Đã đánh dấu đã đọc',
        });
    }
    catch (error) {
        return errorResponse('Lỗi cập nhật: ' + error.message, 500);
    }
});
// ========================================
// PUT /notifications/read-all - Mark all as read
// ========================================
notifications.put('/read-all', async (c) => {
    try {
        const user = c.get('user');
        let user_id = null;
        let user_type = null;
        if (user) {
            if (user.role) {
                user_type = 'admin';
            }
            else {
                user_id = user.id;
                user_type = 'student';
            }
        }
        else {
            user_type = 'all';
        }
        await markAllAsRead(c.env.DB, user_id, user_type);
        return jsonResponse({
            success: true,
            message: 'Đã đánh dấu tất cả đã đọc',
        });
    }
    catch (error) {
        return errorResponse('Lỗi cập nhật: ' + error.message, 500);
    }
});
// ========================================
// DELETE /notifications/:id - Delete notification
// ========================================
notifications.delete('/:id', async (c) => {
    try {
        const { id } = c.req.param();
        await deleteNotification(c.env.DB, parseInt(id));
        return jsonResponse({
            success: true,
            message: 'Xóa thông báo thành công',
        });
    }
    catch (error) {
        return errorResponse('Lỗi xóa thông báo: ' + error.message, 500);
    }
});
export default notifications;
