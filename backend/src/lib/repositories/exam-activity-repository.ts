// ========================================
// EXAM ACTIVITY REPOSITORY
// Handles: logExamActivity, getActivityLogs
// ========================================

interface ActivityData {
  attempt_id?: number | string | null;
  student_id: number | string;
  test_id: number | string;
  action: string;
  details?: any;
  ip_address?: string | null;
  user_agent?: string | null;
}

interface ActivityFilters {
  student_id?: number | string;
  test_id?: number | string;
  attempt_id?: number | string;
  action?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export async function logExamActivity(db: D1Database, data: ActivityData): Promise<any> {
  const {
    attempt_id, student_id, test_id, action, details,
    ip_address, user_agent
  } = data;

  const result = await db.prepare(`
    INSERT INTO exam_activity_logs (
      attempt_id, student_id, test_id, action, details, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    attempt_id || null,
    student_id,
    test_id,
    action,
    details ? JSON.stringify(details) : null,
    ip_address || null,
    user_agent || null
  ).run();

  return result;
}

export async function getActivityLogs(db: D1Database, filters: ActivityFilters = {}): Promise<any[]> {
  let query = `
    SELECT l.*,
           s.name as student_name, s.email as student_email,
           t.title as test_title,
           a.id as attempt_id, a.status as attempt_status
    FROM exam_activity_logs l
    JOIN students s ON l.student_id = s.id
    JOIN exam_tests t ON l.test_id = t.id
    LEFT JOIN exam_attempts a ON l.attempt_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.student_id) {
    query += ' AND l.student_id = ?';
    params.push(filters.student_id);
  }

  if (filters.test_id) {
    query += ' AND l.test_id = ?';
    params.push(filters.test_id);
  }

  if (filters.attempt_id) {
    query += ' AND l.attempt_id = ?';
    params.push(filters.attempt_id);
  }

  if (filters.action) {
    query += ' AND l.action = ?';
    params.push(filters.action);
  }

  if (filters.start_date) {
    query += ' AND DATE(l.created_at) >= ?';
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    query += ' AND DATE(l.created_at) <= ?';
    params.push(filters.end_date);
  }

  query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  params.push(filters.limit || 100, filters.offset || 0);

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}
