export async function createDocument(db, data) {
    const result = await db.prepare(`
    INSERT INTO documents (
      title, description, file_url, file_name, file_size, file_type,
      status, valid_until, uploaded_by, folder_id, visibility,
      organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload,
      source_site
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'edu')
  `).bind(data.title, data.description || null, data.r2_key, data.file_name, data.file_size, data.file_type, data.valid_until || null, data.uploaded_by || null, data.folder_id || null, data.visibility || 'internal', data.organizer_uuid || null, data.program_uuid || null, data.level_uuid || null, data.custom_field_payload || null, data.override_payload || null).run();
    if (!result.success)
        throw new Error(result.error);
    return result.meta.last_row_id;
}
export async function createDocumentPermission(db, data) {
    const result = await db.prepare(`
    INSERT INTO document_permissions (document_id, permission_type, class_id, online_class_id, student_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(data.document_id, data.permission_type, data.class_id || null, data.online_class_id || null, data.student_id || null).run();
    if (!result.success)
        throw new Error(result.error);
    return result;
}
export async function getDocumentById(db, id) {
    return await db.prepare(`SELECT * FROM documents WHERE id = ? AND source_site IN ('edu', 'system')`).bind(id).first();
}
export async function getDocumentsByFolderId(db, folderId) {
    const docs = await db.prepare(`
    SELECT d.*, a.full_name as uploader_name
    FROM documents d
    LEFT JOIN admins a ON d.uploaded_by = a.id
    WHERE d.folder_id = ?
      AND d.source_site IN ('edu', 'system')
    ORDER BY d.created_at DESC
  `).bind(folderId).all();
    return docs.results || [];
}
export async function getDocumentShares(db, id) {
    const shares = await db.prepare(`
    SELECT * FROM document_shares WHERE document_id = ? AND status = 'active' ORDER BY shared_at DESC
  `).bind(id).all();
    return shares.results || [];
}
export async function shareDocument(db, id, targetType, targetId, role, sharedById) {
    await db.prepare(`
    INSERT OR IGNORE INTO document_shares (document_id, target_type, target_id, status, shared_by_role, shared_by_id)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).bind(id, targetType, targetId, role, sharedById).run();
}
export async function unshareDocument(db, id, targetType, targetId) {
    await db.prepare(`
    UPDATE document_shares SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
    WHERE document_id = ? AND target_type = ? AND target_id = ? AND status = 'active'
  `).bind(id, targetType, targetId).run();
}
export async function getDocsByOnlineClassShared(db, classId) {
    const docs = await db.prepare(`
    SELECT d.* FROM document_shares s JOIN documents d ON d.id = s.document_id
    WHERE s.target_type = 'online_class' AND s.target_id = ? AND s.status = 'active'
      AND d.source_site IN ('edu', 'system')
    ORDER BY s.shared_at DESC
  `).bind(classId).all();
    return docs.results || [];
}
export async function getDocsByOfflineClassShared(db, classId) {
    const docs = await db.prepare(`
    SELECT d.* FROM document_shares s JOIN documents d ON d.id = s.document_id
    WHERE s.target_type = 'offline_class' AND s.target_id = ? AND s.status = 'active'
      AND d.source_site IN ('edu', 'system')
    ORDER BY s.shared_at DESC
  `).bind(classId).all();
    return docs.results || [];
}
export async function getDocsByOnlineClass(db, classId) {
    const docs = await db.prepare(`
    SELECT DISTINCT d.*, a.full_name as uploader_name
    FROM documents d LEFT JOIN document_permissions dp ON d.id = dp.document_id LEFT JOIN admins a ON d.uploaded_by = a.id
    WHERE ((dp.permission_type = 'class' AND dp.online_class_id = ?) OR dp.permission_type = 'public')
      AND d.source_site IN ('edu', 'system')
    ORDER BY d.created_at DESC
  `).bind(classId).all();
    return docs.results || [];
}
export async function getDocsByClass(db, classId) {
    const docs = await db.prepare(`
    SELECT DISTINCT d.*, a.full_name as uploader_name
    FROM documents d LEFT JOIN document_permissions dp ON d.id = dp.document_id LEFT JOIN admins a ON d.uploaded_by = a.id
    WHERE ((dp.permission_type = 'class' AND dp.class_id = ?) OR dp.permission_type = 'public')
      AND d.source_site IN ('edu', 'system')
    ORDER BY d.created_at DESC
  `).bind(classId).all();
    return docs.results || [];
}
export async function getAllDocuments(db, limit, offset) {
    const result = await db.prepare(`
    SELECT d.*, (SELECT COUNT(*) FROM document_permissions WHERE document_id = d.id) as permission_count
    FROM documents d
    WHERE d.source_site IN ('edu', 'system')
    ORDER BY d.created_at DESC LIMIT ? OFFSET ?
  `).bind(limit, offset).all();
    return result.results || [];
}
export async function getDocumentPermissions(db, id) {
    const perms = await db.prepare('SELECT * FROM document_permissions WHERE document_id = ?').bind(id).all();
    return perms.results || [];
}
export async function deleteDocument(db, id) {
    await db.prepare('DELETE FROM document_permissions WHERE document_id = ?').bind(id).run();
    await db.prepare('DELETE FROM document_downloads WHERE document_id = ?').bind(id).run();
    await db.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
}
export async function recordDocumentDownload(db, docId, studentId, ip, ua) {
    try {
        await db.prepare(`INSERT INTO document_downloads (document_id, student_id, ip_address, user_agent) VALUES (?, ?, ?, ?)`).bind(docId, studentId, ip, ua).run();
    }
    catch (e) {
        await db.prepare(`INSERT INTO document_downloads (document_id, student_id) VALUES (?, ?)`).bind(docId, studentId).run();
    }
}
export async function getDocumentDownloadStats(db, id) {
    return await db.prepare(`
    SELECT COUNT(*) as total_downloads, COUNT(DISTINCT student_id) as unique_downloaders
    FROM document_downloads WHERE document_id = ?
  `).bind(id).first();
}
export async function getDocumentsForStudent(db, studentId, classIds) {
    const now = new Date().toISOString();
    const publicDocs = await db.prepare(`
    SELECT DISTINCT d.* FROM documents d INNER JOIN document_permissions dp ON d.id = dp.document_id
    WHERE dp.permission_type = 'public' AND d.status = 'active'
      AND d.source_site IN ('edu', 'system')
      AND (d.valid_until IS NULL OR d.valid_until > ?)
  `).bind(now).all();
    let classDocs = [];
    if (classIds.length > 0) {
        const placeholders = classIds.map(() => '?').join(',');
        const result = await db.prepare(`
      SELECT DISTINCT d.* FROM documents d INNER JOIN document_permissions dp ON d.id = dp.document_id
      WHERE dp.permission_type = 'class' AND dp.class_id IN (${placeholders}) AND d.status = 'active'
        AND d.source_site IN ('edu', 'system')
        AND (d.valid_until IS NULL OR d.valid_until > ?)
    `).bind(...classIds, now).all();
        classDocs = result.results || [];
    }
    const studentDocs = await db.prepare(`
    SELECT DISTINCT d.* FROM documents d INNER JOIN document_permissions dp ON d.id = dp.document_id
    WHERE dp.permission_type = 'student' AND dp.student_id = ? AND d.status = 'active'
      AND d.source_site IN ('edu', 'system')
      AND (d.valid_until IS NULL OR d.valid_until > ?)
  `).bind(studentId, now).all();
    const allDocs = [...(publicDocs.results || []), ...classDocs, ...(studentDocs.results || [])];
    return Array.from(new Map(allDocs.map((doc) => [doc.id, doc])).values());
}
