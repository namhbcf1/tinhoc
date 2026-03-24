// ========================================
// NOTIFICATION QUERIES
// ========================================

export async function createNotification(db: D1Database, notification: {
  user_id?: number | null;
  user_type?: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
}) {
  const {
    user_id = null,
    user_type = 'all',
    title,
    message,
    type = 'info',
    link = null,
  } = notification;

  const result = await db.prepare(`
    INSERT INTO notifications (user_id, user_type, title, message, type, link, source_site)
    VALUES (?, ?, ?, ?, ?, ?, 'edu')
  `).bind(user_id, user_type, title, message, type, link).run();

  return result;
}

export async function getNotifications(db: D1Database, options: {
  user_id?: number | null;
  user_type?: string | null;
  read?: boolean | null;
  limit?: number;
  offset?: number;
} = {}) {
  const {
    user_id = null,
    user_type = null,
    read = null,
    limit = 50,
    offset = 0,
  } = options;

  let query = `SELECT * FROM notifications WHERE source_site IN ('edu', 'system')`;
  const params: unknown[] = [];

  if (user_id !== null) {
    query += ' AND (user_id = ? OR user_type = "all")';
    params.push(user_id);
  } else if (user_type) {
    query += ' AND (user_type = ? OR user_type = "all")';
    params.push(user_type);
  }

  if (read !== null) {
    query += ' AND read = ?';
    params.push(read ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getUnreadCount(db: D1Database, user_id: number | null = null, user_type: string | null = null) {
  let query = `SELECT COUNT(*) as count FROM notifications WHERE read = 0 AND source_site IN ('edu', 'system')`;
  const params: unknown[] = [];

  if (user_id !== null) {
    query += ' AND (user_id = ? OR user_type = "all")';
    params.push(user_id);
  } else if (user_type) {
    query += ' AND (user_type = ? OR user_type = "all")';
    params.push(user_type);
  }

  const result = await db.prepare(query).bind(...params).first<{ count: number }>();
  return result?.count || 0;
}

export async function markAsRead(db: D1Database, notificationId: number) {
  const result = await db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ?
  `).bind(notificationId).run();

  return result;
}

export async function markAllAsRead(db: D1Database, user_id: number | null = null, user_type: string | null = null) {
  let query = 'UPDATE notifications SET read = 1 WHERE read = 0';
  const params: unknown[] = [];

  if (user_id !== null) {
    query += ' AND (user_id = ? OR user_type = "all")';
    params.push(user_id);
  } else if (user_type) {
    query += ' AND (user_type = ? OR user_type = "all")';
    params.push(user_type);
  }

  const result = await db.prepare(query).bind(...params).run();
  return result;
}

export async function deleteNotification(db: D1Database, notificationId: number) {
  const result = await db.prepare(`
    DELETE FROM notifications WHERE id = ?
  `).bind(notificationId).run();

  return result;
}
