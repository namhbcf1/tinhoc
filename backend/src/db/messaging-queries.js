// ========================================
// MESSAGING QUERIES
// ========================================

export async function createConversation(db, studentId, adminId, subject = null) {
  const result = await db.prepare(`
    INSERT INTO conversations (student_id, admin_id, subject)
    VALUES (?, ?, ?)
  `).bind(studentId, adminId, subject).run();
  return result;
}

export async function getConversation(db, conversationId) {
  const result = await db.prepare(`
    SELECT c.*, 
           s.ho_ten_full as student_name,
           a.full_name as admin_name
    FROM conversations c
    LEFT JOIN students s ON c.student_id = s.id
    LEFT JOIN admins a ON c.admin_id = a.id
    WHERE c.id = ?
  `).bind(conversationId).first();
  return result;
}

export async function getConversationsByStudent(db, studentId) {
  const result = await db.prepare(`
    SELECT c.*, 
           a.full_name as admin_name,
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = 0 AND m.sender_type = 'admin') as unread_count,
           (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
    FROM conversations c
    LEFT JOIN admins a ON c.admin_id = a.id
    WHERE c.student_id = ?
    ORDER BY c.last_message_at DESC
  `).bind(studentId).all();
  return result.results || [];
}

export async function getConversationsByAdmin(db, adminId) {
  const result = await db.prepare(`
    SELECT c.*, 
           s.ho_ten_full as student_name,
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.read = 0 AND m.sender_type = 'student') as unread_count,
           (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
    FROM conversations c
    LEFT JOIN students s ON c.student_id = s.id
    WHERE c.admin_id = ? OR c.admin_id IS NULL
    ORDER BY c.last_message_at DESC
  `).bind(adminId).all();
  return result.results || [];
}

export async function createMessage(db, conversationId, senderType, senderId, message) {
  const result = await db.prepare(`
    INSERT INTO messages (conversation_id, sender_type, sender_id, message)
    VALUES (?, ?, ?, ?)
  `).bind(conversationId, senderType, senderId, message).run();
  
  // Update conversation last_message_at
  await db.prepare(`
    UPDATE conversations 
    SET last_message_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(conversationId).run();
  
  return result;
}

export async function getMessages(db, conversationId, limit = 100, offset = 0) {
  const result = await db.prepare(`
    SELECT m.*,
           CASE 
             WHEN m.sender_type = 'student' THEN s.ho_ten_full
             WHEN m.sender_type = 'admin' THEN a.full_name
           END as sender_name
    FROM messages m
    LEFT JOIN students s ON m.sender_type = 'student' AND m.sender_id = s.id
    LEFT JOIN admins a ON m.sender_type = 'admin' AND m.sender_id = a.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(conversationId, limit, offset).all();
  return result.results || [];
}

export async function markMessagesAsRead(db, conversationId, readerType) {
  // Mark messages from the other party as read
  const otherType = readerType === 'student' ? 'admin' : 'student';
  const result = await db.prepare(`
    UPDATE messages 
    SET read = 1 
    WHERE conversation_id = ? AND sender_type = ? AND read = 0
  `).bind(conversationId, otherType).run();
  return result;
}

export async function getUnreadMessageCount(db, userId, userType) {
  if (userType === 'student') {
    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.student_id = ? AND m.sender_type = 'admin' AND m.read = 0
    `).bind(userId).first();
    return result?.count || 0;
  } else {
    const result = await db.prepare(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE (c.admin_id = ? OR c.admin_id IS NULL) AND m.sender_type = 'student' AND m.read = 0
    `).bind(userId).first();
    return result?.count || 0;
  }
}






