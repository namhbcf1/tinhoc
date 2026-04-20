// Database queries for Class Teachers
// Now using admins table instead of teachers (teacher = admin with role='teacher')
export async function assignTeacherToClass(db, class_id, admin_id, role = 'teacher') {
    const result = await db.prepare(`INSERT INTO class_teachers (class_id, admin_id, role)
     VALUES (?, ?, ?)`).bind(class_id, admin_id, role).run();
    return result;
}
export async function removeTeacherFromClass(db, class_id, admin_id) {
    const result = await db.prepare('DELETE FROM class_teachers WHERE class_id = ? AND admin_id = ?').bind(class_id, admin_id).run();
    return result;
}
export async function removeTeacherAssignmentById(db, id) {
    const result = await db.prepare('DELETE FROM class_teachers WHERE id = ?').bind(id).run();
    return result;
}
export async function getClassTeachers(db, class_id) {
    const result = await db.prepare(`SELECT
       ct.id as assignment_id,
       ct.role,
       ct.created_at,
       a.id as teacher_id,
       a.teacher_code,
       a.ho,
       a.ten_dem,
       a.ten,
       a.ho_ten_full,
       a.email,
       a.sdt,
       a.department,
       a.position,
       a.status
     FROM class_teachers ct
     INNER JOIN admins a ON ct.admin_id = a.id
     WHERE ct.class_id = ?
     ORDER BY ct.role, a.ho_ten_full`).bind(class_id).all();
    return result;
}
export async function getTeacherClasses(db, admin_id) {
    const result = await db.prepare(`SELECT
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
     WHERE ct.admin_id = ?
     ORDER BY c.ngay_bat_dau DESC`).bind(admin_id).all();
    return result;
}
export async function getAssignmentById(db, id) {
    const result = await db.prepare(`SELECT
       ct.*,
       a.teacher_code,
       a.ho_ten_full,
       c.ten_lop,
       c.ma_lop
     FROM class_teachers ct
     INNER JOIN admins a ON ct.admin_id = a.id
     INNER JOIN classes c ON ct.class_id = c.id
     WHERE ct.id = ?`).bind(id).first();
    return result;
}
