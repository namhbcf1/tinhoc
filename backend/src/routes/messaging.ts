import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  createConversation,
  getConversation,
  getConversationsByStudent,
  getConversationsByAdmin,
  createMessage,
  getMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
} from '../db/messaging-queries.js';

const messaging = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// ========================================
// GET /messaging/conversations - Get conversations
// ========================================
messaging.get('/conversations', async (c) => {
  try {
    const user = c.get('user') as any;
    
    if (!user) {
      return errorResponse('Chưa đăng nhập', 401);
    }
    
    let conversations;
    if (user.role) {
      // Admin
      conversations = await getConversationsByAdmin(c.env.DB, user.id);
    } else if (user.teacher_id) {
      // Teacher - use admin conversations API (teachers can see conversations with students)
      conversations = await getConversationsByAdmin(c.env.DB, user.teacher_id);
    } else {
      // Student
      conversations = await getConversationsByStudent(c.env.DB, user.id);
    }
    
    return jsonResponse({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy conversations: ' + error.message, 500);
  }
});

// ========================================
// POST /messaging/conversations - Create conversation
// ========================================
messaging.post('/conversations', async (c) => {
  try {
    const user = c.get('user') as any;
    const { student_id, admin_id, subject } = await c.req.json();
    
    if (!user) {
      return errorResponse('Chưa đăng nhập', 401);
    }
    
    // Students can create conversations, admins can assign to specific admin
    const studentId = user.role ? student_id : user.id;
    const adminId = user.role ? (admin_id || user.id) : null;
    
    const result = await createConversation(c.env.DB, studentId, adminId, subject);
    
    return jsonResponse({
      success: true,
      data: {
        id: result.meta.last_row_id,
      },
    }, 201);
  } catch (error: any) {
    return errorResponse('Lỗi tạo conversation: ' + error.message, 500);
  }
});

// ========================================
// GET /messaging/conversations/:id/messages - Get messages
// ========================================
messaging.get('/conversations/:id/messages', async (c) => {
  try {
    const user = c.get('user') as any;
    const { id } = c.req.param();
    const limit = parseInt(c.req.query('limit')) || 100;
    const offset = parseInt(c.req.query('offset')) || 0;
    
    if (!user) {
      return errorResponse('Chưa đăng nhập', 401);
    }
    
    // Verify user has access to this conversation
    const conversation = await getConversation(c.env.DB, parseInt(id));
    if (!conversation) {
      return errorResponse('Conversation không tồn tại', 404);
    }
    
    if (user.role || user.teacher_id) {
      // Admin or Teacher - can access if assigned or unassigned
      if (conversation.admin_id && conversation.admin_id !== user.id && conversation.admin_id !== user.teacher_id) {
        return errorResponse('Không có quyền truy cập', 403);
      }
    } else {
      // Student - can only access own conversations
      if (conversation.student_id !== user.id) {
        return errorResponse('Không có quyền truy cập', 403);
      }
    }
    
    const messages = await getMessages(c.env.DB, parseInt(id), limit, offset);
    
    // Mark messages as read
    const readerType = (user.role || user.teacher_id) ? 'admin' : 'student';
    await markMessagesAsRead(c.env.DB, parseInt(id), readerType);
    
    return jsonResponse({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy messages: ' + error.message, 500);
  }
});

// ========================================
// POST /messaging/conversations/:id/messages - Send message
// ========================================
messaging.post('/conversations/:id/messages', async (c) => {
  try {
    const user = c.get('user') as any;
    const { id } = c.req.param();
    const { message } = await c.req.json();
    
    if (!user || !message) {
      return errorResponse('Thiếu thông tin', 400);
    }
    
    // Verify user has access
    const conversation = await getConversation(c.env.DB, parseInt(id));
    if (!conversation) {
      return errorResponse('Conversation không tồn tại', 404);
    }
    
    const senderType = (user.role || user.teacher_id) ? 'admin' : 'student';
    const senderId = user.role ? user.id : (user.teacher_id || user.id);
    
    if (user.role || user.teacher_id) {
      // Admin or Teacher
      if (conversation.admin_id && conversation.admin_id !== user.id && conversation.admin_id !== user.teacher_id) {
        return errorResponse('Không có quyền gửi tin nhắn', 403);
      }
    } else {
      // Student
      if (conversation.student_id !== user.id) {
        return errorResponse('Không có quyền gửi tin nhắn', 403);
      }
    }
    
    const result = await createMessage(c.env.DB, parseInt(id), senderType, senderId, message);
    
    return jsonResponse({
      success: true,
      data: {
        id: result.meta.last_row_id,
      },
    }, 201);
  } catch (error: any) {
    return errorResponse('Lỗi gửi tin nhắn: ' + error.message, 500);
  }
});

// ========================================
// GET /messaging/unread-count - Get unread count
// ========================================
messaging.get('/unread-count', async (c) => {
  try {
    const user = c.get('user') as any;
    
    if (!user) {
      return errorResponse('Chưa đăng nhập', 401);
    }
    
    const userType = (user.role || user.teacher_id) ? 'admin' : 'student';
    const userId = user.role ? user.id : (user.teacher_id || user.id);
    const count = await getUnreadMessageCount(c.env.DB, userId, userType);
    
    return jsonResponse({
      success: true,
      unreadCount: count,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy unread count: ' + error.message, 500);
  }
});

export default messaging;






