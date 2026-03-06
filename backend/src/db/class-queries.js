/**
 * Class database queries
 * Handles: CRUD for classes table
 */

// ========================================
// READ
// ========================================

export async function getAllClasses(db) {
  const result = await db.prepare(`
    SELECT *,
    class_type as loai,
    status as trang_thai,
    max_students as so_luong_toi_da,
    current_students as so_luong_da_dang_ky
    FROM classes
    ORDER BY ngay_thi DESC
    `).all();
  return result.results || [];
}

export async function getOpenClasses(db) {
  const result = await db.prepare(`
    SELECT *,
    class_type as loai,
    status as trang_thai,
    max_students as so_luong_toi_da,
    current_students as so_luong_da_dang_ky,
    ngay_thi as ngay_bat_dau,
    close_at as han_dang_ky
    FROM classes
    WHERE status = 'open'
      AND datetime('now') BETWEEN datetime(open_at) AND datetime(close_at)
    ORDER BY ngay_thi ASC
    `).all();
  return result.results || [];
}

export async function getClassById(db, id) {
  const result = await db.prepare(`
    SELECT *,
    class_type as loai,
    status as trang_thai,
    max_students as so_luong_toi_da,
    current_students as so_luong_da_dang_ky,
    ngay_thi as ngay_bat_dau,
    close_at as han_dang_ky
    FROM classes
    WHERE id = ?
    `).bind(id).first();
  return result;
}

// ========================================
// CREATE
// ========================================

export async function createClass(db, data) {
  const {
    ten_lop, ma_lop, ngay_thi, ngay_bat_dau, ngay_ket_thuc,
    gio_thi, dia_diem, hoc_phi, open_at, close_at, status, class_type, max_students
  } = data;

  try {
    // Đảm bảo ngay_thi luôn có giá trị (cột NOT NULL trong DB)
    const finalNgayThi = ngay_thi || ngay_bat_dau || ngay_ket_thuc || null;

    const result = await db.prepare(`
      INSERT INTO classes(ten_lop, ma_lop, ngay_thi, ngay_bat_dau, ngay_ket_thuc, gio_thi, dia_diem, hoc_phi, open_at, close_at, status, class_type, max_students)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      ten_lop || null,
      ma_lop || null,
      finalNgayThi,
      ngay_bat_dau || null,
      ngay_ket_thuc || null,
      gio_thi || null,
      dia_diem || null,
      hoc_phi || 0,
      open_at || null,
      close_at || null,
      status || 'open',
      class_type || 'hoc',
      max_students || null
    ).run();

    return result;
  } catch (error) {
    console.error('Error in createClass:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}

// ========================================
// UPDATE
// ========================================

export async function updateClass(db, id, data) {
  const {
    ten_lop, ma_lop, ngay_thi, ngay_bat_dau, ngay_ket_thuc,
    gio_thi, dia_diem, hoc_phi, open_at, close_at,
    status, class_type, max_students, current_students
  } = data;

  const updates = [];
  const values = [];

  if (ten_lop !== undefined) { updates.push('ten_lop = ?'); values.push(ten_lop); }
  if (ma_lop !== undefined) { updates.push('ma_lop = ?'); values.push(ma_lop); }
  if (ngay_thi !== undefined) { updates.push('ngay_thi = ?'); values.push(ngay_thi); }
  if (ngay_bat_dau !== undefined) { updates.push('ngay_bat_dau = ?'); values.push(ngay_bat_dau); }
  if (ngay_ket_thuc !== undefined) { updates.push('ngay_ket_thuc = ?'); values.push(ngay_ket_thuc); }
  if (gio_thi !== undefined) { updates.push('gio_thi = ?'); values.push(gio_thi); }
  if (dia_diem !== undefined) { updates.push('dia_diem = ?'); values.push(dia_diem); }
  if (hoc_phi !== undefined) { updates.push('hoc_phi = ?'); values.push(hoc_phi); }
  if (open_at !== undefined) { updates.push('open_at = ?'); values.push(open_at); }
  if (close_at !== undefined) { updates.push('close_at = ?'); values.push(close_at); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (class_type !== undefined) { updates.push('class_type = ?'); values.push(class_type); }
  if (max_students !== undefined) { updates.push('max_students = ?'); values.push(max_students); }
  if (current_students !== undefined) { updates.push('current_students = ?'); values.push(current_students); }

  updates.push("updated_at = datetime('now', '+7 hours')");
  values.push(id);

  const result = await db.prepare(`
    UPDATE classes SET ${updates.join(', ')}
    WHERE id = ?
    `).bind(...values).run();

  return result;
}

// ========================================
// DELETE
// ========================================

export async function deleteClass(db, id) {
  // Manually delete related records to avoid Foreign Key Constraint errors
  // (Since some tables like 'certificates' lack ON DELETE CASCADE)

  // 1. Unlink Certificates (Set class_id to NULL — don't delete issued certificates)
  await db.prepare('UPDATE certificates SET class_id = NULL WHERE class_id = ?').bind(id).run();

  // 2. Unlink Exam Schedules
  await db.prepare('UPDATE exam_schedules SET class_id = NULL WHERE class_id = ?').bind(id).run();

  // 3. Delete dependencies
  await db.prepare('DELETE FROM class_teachers WHERE class_id = ?').bind(id).run();
  await db.prepare('DELETE FROM class_schedules WHERE class_id = ?').bind(id).run();
  await db.prepare('DELETE FROM document_permissions WHERE class_id = ?').bind(id).run();
  await db.prepare('DELETE FROM attendance WHERE class_id = ?').bind(id).run();

  // 4. Delete Registrations (payments cascade via schema)
  await db.prepare('DELETE FROM registrations WHERE class_id = ?').bind(id).run();

  // 5. Delete the class
  const result = await db.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();

  return { success: true, meta: result.meta };
}
