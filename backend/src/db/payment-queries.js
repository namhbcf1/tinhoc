// ========================================
// PAYMENT QUERIES
// ========================================
export async function createPayment(db, data) {
    const { registration_id, amount, method, transaction_code, receipt_image_url, notes } = data;
    const result = await db.prepare(`
    INSERT INTO payments (registration_id, amount, method, transaction_code, receipt_image_url, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(registration_id, amount, method || null, transaction_code || null, receipt_image_url || null, notes || null).run();
    return result;
}
export async function getPaymentsByRegistration(db, registrationId) {
    const result = await db.prepare(`
    SELECT * FROM payments
    WHERE registration_id = ?
    ORDER BY created_at DESC
  `).bind(registrationId).all();
    return result.results || [];
}
export async function getPaymentById(db, id) {
    const result = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    return result;
}
export async function updatePaymentStatus(db, id, status, confirmedBy = null) {
    const result = await db.prepare(`
    UPDATE payments SET
      status = ?,
      confirmed_by = ?,
      confirmed_at = CASE WHEN ? = 'confirmed' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, confirmedBy, status, id).run();
    return result;
}
export async function getPaymentsByStudent(db, studentId) {
    const result = await db.prepare(`
    SELECT p.*, r.class_id, c.ten_lop
    FROM payments p
    JOIN registrations r ON p.registration_id = r.id
    JOIN classes c ON r.class_id = c.id
    WHERE r.student_id = ?
    ORDER BY p.created_at DESC
  `).bind(studentId).all();
    return result.results || [];
}
export async function getPaymentStats(db, filters = {}) {
    let query = `
    SELECT
      COUNT(*) as total_payments,
      SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_confirmed,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
      SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as total_rejected
    FROM payments
    WHERE 1=1
  `;
    const params = [];
    if (filters.from_date) {
        query += ' AND created_at >= ?';
        params.push(filters.from_date);
    }
    if (filters.to_date) {
        query += ' AND created_at <= ?';
        params.push(filters.to_date);
    }
    const result = await db.prepare(query).bind(...params).first();
    return result;
}
