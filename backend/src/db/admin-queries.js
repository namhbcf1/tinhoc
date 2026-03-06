// ========================================
// ADMIN MANAGEMENT QUERIES
// ========================================

export async function getAllAdmins(db, limit = 100, offset = 0) {
  const result = await db.prepare(
    'SELECT id, username, full_name, role, last_login, created_at FROM admins ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();
  return result.results || [];
}

export async function getAdminCount(db) {
  const result = await db.prepare('SELECT COUNT(*) as count FROM admins').first();
  return result?.count || 0;
}

export async function findAdminByUsername(db, username) {
  const result = await db.prepare(
    'SELECT * FROM admins WHERE username = ?'
  ).bind(username).first();
  return result;
}

export async function findAdminById(db, id) {
  const result = await db.prepare(
    'SELECT id, username, full_name, role, last_login, created_at FROM admins WHERE id = ?'
  ).bind(id).first();
  return result;
}

export async function createAdmin(db, username, passwordHash, fullName, role = 'admin', email = null, phone = null, createdBy = null) {
  const result = await db.prepare(`
    INSERT INTO admins (username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `).bind(username, passwordHash, fullName, role).run();
  return result;
}

export async function updateAdmin(db, id, data) {
  const { full_name, role, email, phone, active } = data;
  const updates = [];
  const values = [];
  
  if (full_name !== undefined) {
    updates.push('full_name = ?');
    values.push(full_name);
  }
  if (role !== undefined) {
    updates.push('role = ?');
    values.push(role);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    values.push(phone);
  }
  if (active !== undefined) {
    updates.push('active = ?');
    values.push(active);
  }
  
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

export async function updateAdminLastLogin(db, id) {
  const result = await db.prepare(
    'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(id).run();
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
