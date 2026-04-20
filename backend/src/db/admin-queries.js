function normalizeAdminRoleValue(role) {
    return role === 'teacher' ? 'admin' : role;
}
function normalizeAdminRecord(record) {
    if (!record) {
        return record;
    }
    return {
        ...record,
        role: normalizeAdminRoleValue(record.role),
    };
}
// ========================================
// ADMIN MANAGEMENT QUERIES
// ========================================
export async function getAllAdmins(db, limit = 100, offset = 0) {
    const result = await db.prepare('SELECT id, username, full_name, role, email, phone, teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status, last_login, created_at FROM admins ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all();
    return (result.results || []).map((row) => normalizeAdminRecord(row));
}
export async function getAdminCount(db) {
    const result = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
    return result?.count || 0;
}
export async function findAdminByUsername(db, username) {
    const result = await db.prepare('SELECT * FROM admins WHERE username = ?').bind(username).first();
    return normalizeAdminRecord(result);
}
export async function findAdminByTeacherCode(db, teacherCode) {
    const result = await db.prepare('SELECT * FROM admins WHERE teacher_code = ?').bind(teacherCode).first();
    return normalizeAdminRecord(result);
}
export async function findAdminById(db, id) {
    const result = await db.prepare('SELECT id, username, full_name, role, email, phone, teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status, last_login, created_at FROM admins WHERE id = ?').bind(id).first();
    return normalizeAdminRecord(result);
}
export async function createAdmin(db, username, passwordHash, fullName, role = 'admin', email = null, phone = null, createdBy = null) {
    const normalizedRole = normalizeAdminRoleValue(role) || 'admin';
    const result = await db.prepare(`
    INSERT INTO admins (username, password_hash, full_name, role, email, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(username, passwordHash, fullName, normalizedRole, email, phone).run();
    return result;
}
export async function createTeacherAdmin(db, data) {
    const { teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, password_hash, department, position, status = 'active' } = data;
    const result = await db.prepare(`INSERT INTO admins
     (username, password_hash, full_name, role, email, phone,
      teacher_code, ho, ten_dem, ten, ho_ten_full, sdt, department, position, status)
     VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(teacher_code, password_hash, ho_ten_full, email, sdt, teacher_code, ho, ten_dem || '', ten, ho_ten_full, sdt, department || null, position || null, status).run();
    return result;
}
export async function updateAdmin(db, id, data) {
    const normalizedData = {
        ...data,
        ...(data.role !== undefined ? { role: normalizeAdminRoleValue(data.role) } : {}),
    };
    const updates = [];
    const values = [];
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
    if (updates.length === 0)
        return { success: false, message: 'No fields to update' };
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await db.prepare(`
    UPDATE admins SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();
    return result;
}
export async function deleteAdmin(db, id) {
    const result = await db.prepare('DELETE FROM admins WHERE id = ?').bind(id).run();
    return result;
}
// ========================================
// TEACHER-AS-ADMIN QUERIES (role='teacher')
// ========================================
export async function promoteLegacyTeacherAdmin(db, id) {
    await db.prepare(`UPDATE admins
     SET role = 'admin',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND role = 'teacher'`).bind(id).run();
}
export async function promoteLegacyTeacherAdmins(db) {
    await db.prepare(`UPDATE admins
     SET role = 'admin',
         updated_at = CURRENT_TIMESTAMP
     WHERE role = 'teacher'`).run();
}
export async function getAllStaffTeachers(db, limit = 100, offset = 0) {
    const result = await db.prepare(`SELECT id, username, full_name, role, email, phone,
            teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status,
            last_login, created_at
     FROM admins
     WHERE teacher_code IS NOT NULL
       AND TRIM(COALESCE(teacher_code, '')) != ''
     ORDER BY ho_ten_full ASC
     LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return {
        ...result,
        results: (result.results || []).map((row) => normalizeAdminRecord(row)),
    };
}
export async function searchStaffTeachers(db, keyword) {
    const searchTerm = `%${keyword}%`;
    const result = await db.prepare(`SELECT id, username, full_name, role, email, phone,
            teacher_code, department, position, ho, ten_dem, ten, ho_ten_full, sdt, status
     FROM admins
     WHERE teacher_code IS NOT NULL
       AND TRIM(COALESCE(teacher_code, '')) != ''
       AND (teacher_code LIKE ?
            OR ho_ten_full LIKE ?
            OR email LIKE ?
            OR sdt LIKE ?)
     ORDER BY ho_ten_full ASC`).bind(searchTerm, searchTerm, searchTerm, searchTerm).all();
    return {
        ...result,
        results: (result.results || []).map((row) => normalizeAdminRecord(row)),
    };
}
export async function updateAdminLastLogin(db, id) {
    const result = await db.prepare('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
    return result;
}
// ========================================
// ADMIN ACTIVITY LOGS
// ========================================
export async function createActivityLog(db, adminId, action, resourceType = null, resourceId = null, details = null, ipAddress = null, userAgent = null) {
    const result = await db.prepare(`
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(adminId, action, resourceType, resourceId, details, ipAddress, userAgent).run();
    return result;
}
export async function getActivityLogs(db, adminId = null, limit = 100, offset = 0) {
    let query = `
    SELECT
      aal.*,
      a.username, a.full_name
    FROM admin_activity_logs aal
    LEFT JOIN admins a ON aal.admin_id = a.id
  `;
    const params = [];
    if (adminId) {
        query += ' WHERE aal.admin_id = ?';
        params.push(adminId);
    }
    query += ' ORDER BY aal.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const result = await db.prepare(query).bind(...params).all();
    return result.results || [];
}
export async function getActivityLogCount(db, adminId = null) {
    let query = 'SELECT COUNT(*) as count FROM admin_activity_logs';
    const params = [];
    if (adminId) {
        query += ' WHERE admin_id = ?';
        params.push(adminId);
    }
    const result = await db.prepare(query).bind(...params).first();
    return result?.count || 0;
}
