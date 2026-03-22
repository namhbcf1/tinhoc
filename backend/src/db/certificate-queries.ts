// ========================================
// CERTIFICATE QUERIES
// ========================================

export async function createCertificate(db: D1Database, data: Record<string, any>) {
  const { student_id, class_id, certificate_number, title, issued_date, pdf_url, issued_by } = data;

  const result = await db.prepare(`
    INSERT INTO certificates (
      student_id, class_id, certificate_number, title, issued_date, pdf_url, issued_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    student_id,
    class_id,
    certificate_number,
    title,
    issued_date || new Date().toISOString().split('T')[0],
    pdf_url || null,
    issued_by || null
  ).run();

  return result;
}

export async function getCertificatesByClass(db: D1Database, classId: number) {
  const result = await db.prepare(`
    SELECT * FROM certificates
    WHERE class_id = ?
    ORDER BY issued_date DESC
  `).bind(classId).all();

  return result.results || [];
}

export async function getCertificatesByStudent(db: D1Database, studentId: number) {
  const result = await db.prepare(`
    SELECT * FROM certificates
    WHERE student_id = ?
    ORDER BY issued_date DESC
  `).bind(studentId).all();

  return result.results || [];
}

export async function getCertificateById(db: D1Database, id: number) {
  const result = await db.prepare(`
    SELECT
      cert.*,
      s.ho_ten_full,
      s.cccd,
      c.ten_lop,
      c.ngay_thi
    FROM certificates cert
    JOIN students s ON cert.student_id = s.id
    JOIN classes c ON cert.class_id = c.id
    WHERE cert.id = ?
  `).bind(id).first();
  return result;
}

export async function getCertificateByNumber(db: D1Database, certificateNumber: string) {
  const result = await db.prepare(
    'SELECT * FROM certificates WHERE certificate_number = ?'
  ).bind(certificateNumber).first();
  return result;
}

export async function updateCertificateStatus(db: D1Database, id: number, status: string) {
  // Validate status
  const validStatuses = ['active', 'issued', 'revoked'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await db.prepare(`
    UPDATE certificates SET
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, id).run();

  return result;
}
