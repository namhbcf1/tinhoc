// ========================================
// DOCUMENT QUERIES - With permission table separation
// ========================================

export async function createDocument(db: D1Database, data: Record<string, any>) {
  const {
    title,
    description,
    file_name,
    file_size,
    file_type,
    r2_key,
    uploaded_by,
    folder_id,
    visibility,
    doc_type,
    valid_from,
    valid_until
  } = data;

  try {
    const result = await db.prepare(`
      INSERT INTO documents (
        title,
        description,
        file_url,
        file_name,
        file_size,
        file_type,
        status,
        valid_until,
        uploaded_by,
        folder_id,
        visibility
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).bind(
      title,
      description || null,
      r2_key, // stored in file_url column
      file_name,
      file_size,
      file_type,
      valid_until || null,
      uploaded_by || null,
      folder_id || null,
      visibility || 'internal'
    ).run();

    return {
      success: true,
      meta: result.meta,
    };
  } catch (error: any) {
    console.error('createDocument error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function createDocumentPermission(db: D1Database, data: Record<string, any>) {
  const { document_id, permission_type, class_id, online_class_id, student_id } = data;

  try {
    const result = await db.prepare(`
      INSERT INTO document_permissions (document_id, permission_type, class_id, online_class_id, student_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      document_id,
      permission_type,
      class_id || null,
      online_class_id || null,
      student_id || null
    ).run();

    return {
      success: true,
      meta: result.meta,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getDocumentById(db: D1Database, id: number) {
  const result = await db.prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).bind(id).first();
  return result;
}

export async function getDocumentPermissions(db: D1Database, documentId: number) {
  const result = await db.prepare(`
    SELECT * FROM document_permissions
    WHERE document_id = ?
  `).bind(documentId).all();

  return result.results || [];
}

export async function getDocumentsByCCCD(db: D1Database, cccd: string) {
  // Get student ID from CCCD
  const student = await db.prepare('SELECT id FROM students WHERE cccd = ?').bind(cccd).first<{ id: number }>();
  if (!student) return [];

  return getDocumentsForStudent(db, student.id, cccd, []);
}

export async function getDocumentsForStudent(db: D1Database, studentId: number, studentCCCD: string, classIds: number[] = []) {
  const now = new Date().toISOString();

  // Get public documents
  const publicDocs = await db.prepare(`
    SELECT DISTINCT d.*
    FROM documents d
    INNER JOIN document_permissions dp ON d.id = dp.document_id
    WHERE dp.permission_type = 'public'
      AND d.status = 'active'
      AND (d.valid_until IS NULL OR d.valid_until > ?)
  `).bind(now).all();

  // Get class-based documents
  let classDocs: any[] = [];
  if (classIds.length > 0) {
    const placeholders = classIds.map(() => '?').join(',');
    const result = await db.prepare(`
      SELECT DISTINCT d.*
      FROM documents d
      INNER JOIN document_permissions dp ON d.id = dp.document_id
      WHERE dp.permission_type = 'class'
        AND dp.class_id IN (${placeholders})
        AND d.status = 'active'
        AND (d.valid_until IS NULL OR d.valid_until > ?)
    `).bind(...classIds, now).all();
    classDocs = result.results || [];
  }

  // Get student-specific documents
  const studentDocs = await db.prepare(`
    SELECT DISTINCT d.*
    FROM documents d
    INNER JOIN document_permissions dp ON d.id = dp.document_id
    WHERE dp.permission_type = 'student'
      AND dp.student_id = ?
      AND d.status = 'active'
      AND (d.valid_until IS NULL OR d.valid_until > ?)
  `).bind(studentId, now).all();

  // Combine and deduplicate
  const allDocs = [
    ...(publicDocs.results || []),
    ...classDocs,
    ...(studentDocs.results || [])
  ];

  // Remove duplicates by id
  const uniqueDocs = Array.from(new Map(allDocs.map((doc: any) => [doc.id, doc])).values());

  return uniqueDocs;
}

export async function getAllDocuments(db: D1Database, limit = 100, offset = 0) {
  const result = await db.prepare(`
    SELECT d.*,
           (SELECT COUNT(*) FROM document_permissions WHERE document_id = d.id) as permission_count
    FROM documents d
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  return result.results || [];
}

export async function deleteDocument(db: D1Database, id: number) {
  // Delete permissions first (CASCADE will handle it, but explicit is better)
  await db.prepare('DELETE FROM document_permissions WHERE document_id = ?').bind(id).run();
  // Delete downloads
  await db.prepare('DELETE FROM document_downloads WHERE document_id = ?').bind(id).run();
  // Delete document
  const result = await db.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
  return result;
}

export async function deleteDocumentPermissions(db: D1Database, documentId: number) {
  const result = await db.prepare(
    'DELETE FROM document_permissions WHERE document_id = ?'
  ).bind(documentId).run();
  return result;
}

export async function recordDocumentDownload(db: D1Database, data: Record<string, any>) {
  const { document_id, student_id, ip_address, user_agent } = data;

  // Backward-compatible: older DB schema may not have ip_address/user_agent columns.
  try {
    const result = await db.prepare(`
      INSERT INTO document_downloads (document_id, student_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `).bind(
      document_id,
      student_id,
      ip_address || null,
      user_agent || null
    ).run();
    return result;
  } catch (e) {
    // Fallback to minimal schema
    const result = await db.prepare(`
      INSERT INTO document_downloads (document_id, student_id)
      VALUES (?, ?)
    `).bind(
      document_id,
      student_id
    ).run();
    return result;
  }
}

export async function getDocumentDownloadStats(db: D1Database, documentId: number) {
  const result = await db.prepare(`
    SELECT COUNT(*) as total_downloads,
           COUNT(DISTINCT student_id) as unique_downloaders
    FROM document_downloads
    WHERE document_id = ?
  `).bind(documentId).first();

  return result;
}
