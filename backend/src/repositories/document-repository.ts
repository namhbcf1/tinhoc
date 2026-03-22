export async function createDocument(db: any, data: any) {
  const result = await db.prepare(`
    INSERT INTO documents (
      title, description, file_url, file_name, file_size, file_type,
      status, valid_until, uploaded_by, folder_id, visibility,
      organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.title, data.description || null, data.r2_key, data.file_name,
    data.file_size, data.file_type, data.valid_until || null,
    data.uploaded_by || null, data.folder_id || null, data.visibility || 'internal',
    data.organizer_uuid || null, data.program_uuid || null, data.level_uuid || null,
    data.custom_field_payload || null, data.override_payload || null
  ).run();
  
  if (!result.success) throw new Error(result.error);
  return result.meta.last_row_id;
}

export async function createDocumentPermission(db: any, data: any) {
  const result = await db.prepare(`
    INSERT INTO document_permissions (document_id, permission_type, class_id, online_class_id, student_id)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    data.document_id, data.permission_type, data.class_id || null,
    data.online_class_id || null, data.student_id || null
  ).run();
  
  if (!result.success) throw new Error(result.error);
  return result;
}

export async function getDocumentById(db: any, id: number) {
  return await db.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
}

export async function getDocumentsByFolderId(db: any, folderId: number) {
  const docs = await db.prepare(`
    SELECT d.*, a.full_name as uploader_name
    FROM documents d
    LEFT JOIN admins a ON d.uploaded_by = a.id
    WHERE d.folder_id = ?
    ORDER BY d.created_at DESC
  `).bind(folderId).all();
  return docs.results || [];
}

export async function getDocumentShares(db: any, id: number) {
  const shares = await db.prepare(`
    SELECT * FROM document_shares WHERE document_id = ? AND status = 'active' ORDER BY shared_at DESC
  `).bind(id).all();
  return shares.results || [];
}

export async function shareDocument(db: any, id: number, targetType: string, targetId: number, role: string, sharedById: string | null) {
  await db.prepare(`
    INSERT OR IGNORE INTO document_shares (document_id, target_type, target_id, status, shared_by_role, shared_by_id)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).bind(id, targetType, targetId, role, sharedById).run();
}

export async function unshareDocument(db: any, id: number, targetType: string, targetId: number) {
  await db.prepare(`
    UPDATE document_shares SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
    WHERE document_id = ? AND target_type = ? AND target_id = ? AND status = 'active'
  `).bind(id, targetType, targetId).run();
}

export async function getDocsByOnlineClassShared(db: any, classId: number) {
  const docs = await db.prepare(`
    SELECT d.* FROM document_shares s JOIN documents d ON d.id = s.document_id
    WHERE s.target_type = 'online_class' AND s.target_id = ? AND s.status = 'active' ORDER BY s.shared_at DESC
  `).bind(classId).all();
  return docs.results || [];
}

export async function getDocsByOfflineClassShared(db: any, classId: number) {
  const docs = await db.prepare(`
    SELECT d.* FROM document_shares s JOIN documents d ON d.id = s.document_id
    WHERE s.target_type = 'offline_class' AND s.target_id = ? AND s.status = 'active' ORDER BY s.shared_at DESC
  `).bind(classId).all();
  return docs.results || [];
}

export async function getDocsByOnlineClass(db: any, classId: number) {
  const docs = await db.prepare(`
    SELECT DISTINCT d.*, a.full_name as uploader_name
    FROM documents d LEFT JOIN document_permissions dp ON d.id = dp.document_id LEFT JOIN admins a ON d.uploaded_by = a.id
    WHERE (dp.permission_type = 'class' AND dp.online_class_id = ?) OR dp.permission_type = 'public'
    ORDER BY d.created_at DESC
  `).bind(classId).all();
  return docs.results || [];
}

export async function getDocsByClass(db: any, classId: number) {
  const docs = await db.prepare(`
    SELECT DISTINCT d.*, a.full_name as uploader_name
    FROM documents d LEFT JOIN document_permissions dp ON d.id = dp.document_id LEFT JOIN admins a ON d.uploaded_by = a.id
    WHERE (dp.permission_type = 'class' AND dp.class_id = ?) OR dp.permission_type = 'public'
    ORDER BY d.created_at DESC
  `).bind(classId).all();
  return docs.results || [];
}

export async function getAllDocuments(db: any, limit: number, offset: number) {
  const result = await db.prepare(`
    SELECT d.*, (SELECT COUNT(*) FROM document_permissions WHERE document_id = d.id) as permission_count
    FROM documents d ORDER BY d.created_at DESC LIMIT ? OFFSET ?
  `).bind(limit, offset).all();
  return result.results || [];
}

export async function getDocumentPermissions(db: any, id: number) {
  const perms = await db.prepare('SELECT * FROM document_permissions WHERE document_id = ?').bind(id).all();
  return perms.results || [];
}

export async function deleteDocument(db: any, id: number) {
  await db.prepare('DELETE FROM document_permissions WHERE document_id = ?').bind(id).run();
  await db.prepare('DELETE FROM document_downloads WHERE document_id = ?').bind(id).run();
  await db.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
}

export async function recordDocumentDownload(db: any, docId: number, studentId: number, ip: string, ua: string) {
  try {
    await db.prepare(`INSERT INTO document_downloads (document_id, student_id, ip_address, user_agent) VALUES (?, ?, ?, ?)`).bind(docId, studentId, ip, ua).run();
  } catch (e) {
    await db.prepare(`INSERT INTO document_downloads (document_id, student_id) VALUES (?, ?)`).bind(docId, studentId).run();
  }
}

export async function getDocumentDownloadStats(db: any, id: number) {
  return await db.prepare(`
    SELECT COUNT(*) as total_downloads, COUNT(DISTINCT student_id) as unique_downloaders
    FROM document_downloads WHERE document_id = ?
  `).bind(id).first();
}

export async function getDocumentsForStudent(db: any, studentId: number, classIds: number[]) {
  const now = new Date().toISOString();
  
  const publicDocs = await db.prepare(`
    SELECT DISTINCT d.* FROM documents d INNER JOIN document_permissions dp ON d.id = dp.document_id
    WHERE dp.permission_type = 'public' AND d.status = 'active' AND (d.valid_until IS NULL OR d.valid_until > ?)
  `).bind(now).all();
  
  let classDocs: any[] = [];
  if (classIds.length > 0) {
    const placeholders = classIds.map(() => '?').join(',');
    const result = await db.prepare(`
      SELECT DISTINCT d.* FROM documents d INNER JOIN document_permissions dp ON d.id = dp.document_id
      WHERE dp.permission_type = 'class' AND dp.class_id IN (${placeholders}) AND d.status = 'active' AND (d.valid_until IS NULL OR d.valid_until > ?)
    `).bind(...classIds, now).all();
    classDocs = result.results || [];
  }
  
  const studentDocs = await db.prepare(`
    SELECT DISTINCT d.* FROM documents d INNER JOIN document_permissions dp ON d.id = dp.document_id
    WHERE dp.permission_type = 'student' AND dp.student_id = ? AND d.status = 'active' AND (d.valid_until IS NULL OR d.valid_until > ?)
  `).bind(studentId, now).all();
  
  const allDocs = [...(publicDocs.results || []), ...classDocs, ...(studentDocs.results || [])];
  return Array.from(new Map(allDocs.map((doc: any) => [doc.id, doc])).values());
}
