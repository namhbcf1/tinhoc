function normalizeAdminRoleValue(role: unknown) {
  return role === 'teacher' ? 'admin' : role;
}

function normalizeAdminRecord<T extends Record<string, any> | null>(record: T): T {
  if (!record) {
    return record;
  }

  return {
    ...record,
    role: normalizeAdminRoleValue(record.role),
  } as T;
}

// ========================================
// ADMIN MANAGEMENT QUERIES
// ========================================

export async function getAllAdmins(db: D1Database, limit = 100, offset = 0) {
  const result = await db.prepare(
    'SELECT id, username, full_name, role, email, phone, teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status, last_login, created_at FROM admins ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();
  return (result.results || []).map((row) => normalizeAdminRecord(row));
}

export async function getAdminCount(db: D1Database) {
  const result = await db.prepare('SELECT COUNT(*) as count FROM admins').first<{ count: number }>();
  return result?.count || 0;
}

export async function findAdminByUsername(db: D1Database, username: string) {
  const result = await db.prepare(
    'SELECT * FROM admins WHERE username = ?'
  ).bind(username).first();
  return normalizeAdminRecord(result);
}

export async function findAdminByTeacherCode(db: D1Database, teacherCode: string) {
  const result = await db.prepare(
    'SELECT * FROM admins WHERE teacher_code = ?'
  ).bind(teacherCode).first();
  return normalizeAdminRecord(result);
}

export async function findAdminById(db: D1Database, id: number) {
  const result = await db.prepare(
    'SELECT id, username, full_name, role, email, phone, teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status, last_login, created_at FROM admins WHERE id = ?'
  ).bind(id).first();
  return normalizeAdminRecord(result);
}

export async function createAdmin(db: D1Database, username: string, passwordHash: string, fullName: string, role = 'admin', email: string | null = null, phone: string | null = null, createdBy: number | null = null) {
  const normalizedRole = normalizeAdminRoleValue(role) || 'admin';
  const result = await db.prepare(`
    INSERT INTO admins (username, password_hash, full_name, role, email, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(username, passwordHash, fullName, normalizedRole, email, phone).run();
  return result;
}

export async function createTeacherAdmin(db: D1Database, data: Record<string, any>) {
  const { teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, password_hash, department, position, status = 'active' } = data;

  const result = await db.prepare(
    `INSERT INTO admins
     (username, password_hash, full_name, role, email, phone,
      teacher_code, ho, ten_dem, ten, ho_ten_full, sdt, department, position, status)
     VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    teacher_code, password_hash, ho_ten_full, email, sdt,
    teacher_code, ho, ten_dem || '', ten, ho_ten_full, sdt, department || null, position || null, status
  ).run();

  return result;
}

export async function updateAdmin(db: D1Database, id: number, data: Record<string, unknown>) {
  const normalizedData: Record<string, unknown> = {
    ...data,
    ...(data.role !== undefined ? { role: normalizeAdminRoleValue(data.role) } : {}),
  };
  const updates: string[] = [];
  const values: unknown[] = [];

  const allowedFields = [
    'full_name', 'role', 'email', 'phone', 'active',
    'teacher_code', 'department', 'position', 'ho', 'ten_dem', 'ten',
    'ho_ten_full', 'sdt', 'status', 'password_hash', 'last_login'
  ];

  for (const field of allowedFields) {
    if (normalizedData[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(normalizedData[field]);
    }
  }

  if (updates.length === 0) return { success: false, message: 'No fields to update' };

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const result = await db.prepare(`
    UPDATE admins SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();
  return result;
}

export async function deleteAdmin(db: D1Database, id: number) {
  const result = await db.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();
  return result;
}

// ========================================
// TEACHER-AS-ADMIN QUERIES (role='teacher')
// ========================================

export async function promoteLegacyTeacherAdmin(db: D1Database, id: number) {
  await db.prepare(
    `UPDATE admins
     SET role = 'admin',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND role = 'teacher'`
  ).bind(id).run();
}

export async function promoteLegacyTeacherAdmins(db: D1Database) {
  await db.prepare(
    `UPDATE admins
     SET role = 'admin',
         updated_at = CURRENT_TIMESTAMP
     WHERE role = 'teacher'`
  ).run();
}

export async function getAllStaffTeachers(db: D1Database, limit = 100, offset = 0) {
  const result = await db.prepare(
    `SELECT id, username, full_name, role, email, phone,
            teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status,
            last_login, created_at
     FROM admins
     WHERE teacher_code IS NOT NULL
       AND TRIM(COALESCE(teacher_code, '')) != ''
     ORDER BY ho_ten_full ASC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return {
    ...result,
    results: (result.results || []).map((row) => normalizeAdminRecord(row)),
  };
}

export async function searchStaffTeachers(db: D1Database, keyword: string) {
  const searchTerm = `%${keyword}%`;
  const result = await db.prepare(
    `SELECT id, username, full_name, role, email, phone,
            teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status
     FROM admins
     WHERE teacher_code IS NOT NULL
       AND TRIM(COALESCE(teacher_code, '')) != ''
       AND (teacher_code LIKE ?
            OR ho_ten_full LIKE ?
            OR email LIKE ?
            OR sdt LIKE ?)
     ORDER BY ho_ten_full ASC`
  ).bind(searchTerm, searchTerm, searchTerm, searchTerm).all();
  return {
    ...result,
    results: (result.results || []).map((row) => normalizeAdminRecord(row)),
  };
}

export async function updateAdminLastLogin(db: D1Database, id: number) {
  const result = await db.prepare(
    'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(id).run();
  return result;
}

// ========================================
// ADMIN ACTIVITY LOGS
// ========================================

export async function createActivityLog(db: D1Database, adminId: number, action: string, resourceType: string | null = null, resourceId: number | string | null = null, details: string | null = null, ipAddress: string | null = null, userAgent: string | null = null) {
  const result = await db.prepare(`
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(adminId, action, resourceType, resourceId, details, ipAddress, userAgent).run();
  return result;
}

export async function getActivityLogs(db: D1Database, adminId: number | null = null, limit = 100, offset = 0) {
  let query = `
    SELECT
      aal.*,
      a.username, a.full_name
    FROM admin_activity_logs aal
    LEFT JOIN admins a ON aal.admin_id = a.id
  `;
  const params: unknown[] = [];

  if (adminId) {
    query += ' WHERE aal.admin_id = ?';
    params.push(adminId);
  }

  query += ' ORDER BY aal.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getActivityLogCount(db: D1Database, adminId: number | null = null) {
  let query = 'SELECT COUNT(*) as count FROM admin_activity_logs';
  const params: unknown[] = [];

  if (adminId) {
    query += ' WHERE admin_id = ?';
    params.push(adminId);
  }

  const result = await db.prepare(query).bind(...params).first<{ count: number }>();
  return result?.count || 0;
}
