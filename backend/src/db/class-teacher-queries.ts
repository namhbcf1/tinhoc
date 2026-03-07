// Database queries for Class Teachers

export async function assignTeacherToClass(db: D1Database, class_id: number, teacher_id: number, role = 'teacher') {
  const result = await db.prepare(
    `INSERT INTO class_teachers (class_id, teacher_id, role)
     VALUES (?, ?, ?)`
  ).bind(class_id, teacher_id, role).run();
  return result;
}

export async function removeTeacherFromClass(db: D1Database, class_id: number, teacher_id: number) {
  const result = await db.prepare(
    'DELETE FROM class_teachers WHERE class_id = ? AND teacher_id = ?'
  ).bind(class_id, teacher_id).run();
  return result;
}

export async function removeTeacherAssignmentById(db: D1Database, id: number) {
  const result = await db.prepare(
    'DELETE FROM class_teachers WHERE id = ?'
  ).bind(id).run();
  return result;
}

export async function getClassTeachers(db: D1Database, class_id: number) {
  const result = await db.prepare(
    `SELECT
       ct.id as assignment_id,
       ct.role,
       ct.created_at,
       t.id as teacher_id,
       t.teacher_code,
       t.ho,
       t.ten_dem,
       t.ten,
       t.ho_ten_full,
       t.email,
       t.sdt,
       t.department,
       t.position,
       t.status
     FROM class_teachers ct
     INNER JOIN teachers t ON ct.teacher_id = t.id
     WHERE ct.class_id = ?
     ORDER BY ct.role, t.ho_ten_full`
  ).bind(class_id).all();
  return result;
}

export async function getTeacherClasses(db: D1Database, teacher_id: number) {
  const result = await db.prepare(
    `SELECT
       ct.id as assignment_id,
       ct.role,
       ct.created_at,
       c.id as class_id,
       c.ten_lop,
       c.ma_lop,
       c.ngay_bat_dau,
       c.ngay_ket_thuc,
       c.loai,
       c.status as class_status
     FROM class_teachers ct
     INNER JOIN classes c ON ct.class_id = c.id
     WHERE ct.teacher_id = ?
     ORDER BY c.ngay_bat_dau DESC`
  ).bind(teacher_id).all();
  return result;
}

export async function getAssignmentById(db: D1Database, id: number) {
  const result = await db.prepare(
    `SELECT
       ct.*,
       t.teacher_code,
       t.ho_ten_full,
       c.ten_lop,
       c.ma_lop
     FROM class_teachers ct
     INNER JOIN teachers t ON ct.teacher_id = t.id
     INNER JOIN classes c ON ct.class_id = c.id
     WHERE ct.id = ?`
  ).bind(id).first();
  return result;
}
