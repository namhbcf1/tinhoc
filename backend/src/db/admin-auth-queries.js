/**
 * Admin + auth-related database queries
 * Handles: admins CRUD, password reset tokens, audit log, student edit history
 */

// ========================================
// ADMINS
// ========================================

export async function findAdminByUsername(db, username) {
  const result = await db.prepare(
    'SELECT * FROM admins WHERE username = ?'
  ).bind(username).first();
  return result;
}

export async function findAdminById(db, id) {
  const result = await db.prepare(
    'SELECT * FROM admins WHERE id = ?'
  ).bind(id).first();
  return result;
}

export async function createAdmin(db, username, passwordHash, fullName, role = 'admin') {
  const result = await db.prepare(`
    INSERT INTO admins(username, password_hash, full_name, role)
    VALUES(?, ?, ?, ?)
    `).bind(username, passwordHash, fullName, role).run();

  return result;
}

export async function updateAdminPassword(db, id, passwordHash) {
  const result = await db.prepare(`
    UPDATE admins SET password_hash = ? WHERE id = ?
    `).bind(passwordHash, id).run();

  return result;
}

export async function updateAdminLastLogin(db, id) {
  await db.prepare(
    "UPDATE admins SET last_login = datetime('now', '+7 hours') WHERE id = ?"
  ).bind(id).run();
}

// ========================================
// PASSWORD RESET TOKENS
// ========================================

export async function createPasswordResetToken(db, adminId, token, expiresAt) {
  const result = await db.prepare(`
    INSERT INTO password_reset_tokens(admin_id, token, expires_at)
    VALUES(?, ?, ?)
    `).bind(adminId, token, expiresAt).run();

  return result;
}

export async function findPasswordResetToken(db, token) {
  const result = await db.prepare(`
    SELECT prt.*, a.username, a.email
    FROM password_reset_tokens prt
    JOIN admins a ON prt.admin_id = a.id
    WHERE prt.token = ? AND prt.used = 0 AND prt.expires_at > datetime('now', '+7 hours')
    `).bind(token).first();

  return result;
}

export async function markPasswordResetTokenAsUsed(db, token) {
  const result = await db.prepare(`
    UPDATE password_reset_tokens SET used = 1 WHERE token = ?
    `).bind(token).run();

  return result;
}

export async function invalidateAllPasswordResetTokens(db, adminId) {
  const result = await db.prepare(`
    UPDATE password_reset_tokens SET used = 1 WHERE admin_id = ? AND used = 0
    `).bind(adminId).run();

  return result;
}

// ========================================
// AUDIT LOG
// ========================================

export async function createAuditLog(db, adminId, action, tableName, recordId, oldValue, newValue) {
  await db.prepare(`
    INSERT INTO audit_log(admin_id, action, table_name, record_id, old_value, new_value)
    VALUES(?, ?, ?, ?, ?, ?)
    `).bind(
    adminId,
    action,
    tableName,
    recordId,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null
  ).run();
}

// ========================================
// STUDENT EDIT HISTORY
// ========================================

export async function logStudentEditHistory(db, studentId, adminId, changedByType, fieldName, oldValue, newValue, ipAddress = null, userAgent = null) {
  const result = await db.prepare(`
    INSERT INTO student_edit_history (
      student_id, admin_id, changed_by_type, field_name, old_value, new_value, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    studentId,
    adminId,
    changedByType,
    fieldName,
    oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
    newValue !== null && newValue !== undefined ? String(newValue) : null,
    ipAddress,
    userAgent
  ).run();

  return result;
}

export async function getStudentEditHistory(db, studentId, limit = 100, offset = 0) {
  const result = await db.prepare(`
    SELECT
      seh.*,
      a.username as admin_username,
      a.full_name as admin_full_name
    FROM student_edit_history seh
    LEFT JOIN admins a ON seh.admin_id = a.id
    WHERE seh.student_id = ?
    ORDER BY seh.changed_at DESC
    LIMIT ? OFFSET ?
  `).bind(studentId, limit, offset).all();

  return result.results || [];
}
