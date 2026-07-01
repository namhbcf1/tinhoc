import { normalizeText } from '../utils/helpers.js';

const STUDENT_SELECT_FIELDS = 'id, cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich, email, sdt, dia_chi, ngay_cap_cccd, don_vi_cong_tac, image_cccd_front, image_cccd_back, image_3x4, cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id, created_at, updated_at';

const STUDENT_SORT_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  name: 'ho_ten_normalized',
  cccd: 'cccd',
  email: "LOWER(COALESCE(email, ''))",
  status: 'primary_status',
  study_count: 'study_count',
  exam_count: 'exam_count',
};

const EXCLUDED_TEST_STUDENT_SQL = `
  NOT (
    LOWER(COALESCE(s.ho_ten_full, '')) LIKE 'test hoc vien%'
    OR LOWER(COALESCE(s.email, '')) LIKE '%@student.local'
    OR LOWER(COALESCE(s.cccd, '')) LIKE 'test%'
  )
`;

function buildStudentQueryFilters(filters: any = {}) {
  const where = [EXCLUDED_TEST_STUDENT_SQL];
  const binds: any[] = [];

  const keyword = String(filters.q || '').trim();
  if (keyword) {
    const normalized = normalizeText(keyword);
    const normalizedTerm = `%${normalized}%`;
    const exactTerm = `%${keyword}%`;
    where.push('(s.ho_ten_normalized LIKE ? OR s.cccd LIKE ? OR s.sdt LIKE ? OR LOWER(COALESCE(s.email, \'\')) LIKE LOWER(?))');
    binds.push(normalizedTerm, exactTerm, exactTerm, exactTerm);
  }

  const status = String(filters.status || '').trim().toLowerCase();
  if (status) {
    where.push('EXISTS (SELECT 1 FROM all_regs ar WHERE ar.student_id = s.id AND LOWER(ar.status) = ?)');
    binds.push(status);
  }

  const registrationType = String(filters.registration_type || '').trim().toLowerCase();
  if (registrationType === 'hoc') {
    where.push('EXISTS (SELECT 1 FROM registrations r WHERE r.student_id = s.id)');
  } else if (registrationType === 'thi') {
    where.push('EXISTS (SELECT 1 FROM exam_registrations er WHERE er.student_id = s.id)');
  } else if (registrationType === 'none') {
    where.push('NOT EXISTS (SELECT 1 FROM all_regs ar WHERE ar.student_id = s.id)');
  }

  const hasCertificate = String(filters.has_certificate || '').trim().toLowerCase();
  if (hasCertificate === 'true' || hasCertificate === '1') {
    where.push("EXISTS (SELECT 1 FROM certificates cert WHERE cert.student_id = s.id AND cert.status IN ('active', 'issued'))");
  } else if (hasCertificate === 'false' || hasCertificate === '0') {
    where.push("NOT EXISTS (SELECT 1 FROM certificates cert WHERE cert.student_id = s.id AND cert.status IN ('active', 'issued'))");
  }

  if (filters.created_from) {
    where.push('date(s.created_at) >= date(?)');
    binds.push(filters.created_from);
  }

  if (filters.created_to) {
    where.push('date(s.created_at) <= date(?)');
    binds.push(filters.created_to);
  }

  return { whereSql: where.join(' AND '), binds };
}

function buildStudentsBaseSql(whereSql: string) {
  return `
    WITH all_regs AS (
      SELECT student_id, status, 'hoc' AS registration_type FROM registrations
      UNION ALL
      SELECT student_id, status, 'thi' AS registration_type FROM exam_registrations
    ), student_rollups AS (
      SELECT
        s.${STUDENT_SELECT_FIELDS.replace(/, /g, ', s.')},
        COALESCE(SUM(CASE WHEN ar.registration_type = 'hoc' THEN 1 ELSE 0 END), 0) AS study_count,
        COALESCE(SUM(CASE WHEN ar.registration_type = 'thi' THEN 1 ELSE 0 END), 0) AS exam_count,
        COALESCE(MAX(CASE WHEN ar.status IN ('studying', 'active', 'approved') THEN ar.status END), MAX(ar.status), 'new') AS primary_status
      FROM students s
      LEFT JOIN all_regs ar ON ar.student_id = s.id
      WHERE ${whereSql}
      GROUP BY s.id
    )
  `;
}

function resolveStudentSort(filters: any = {}) {
  const sortBy = STUDENT_SORT_COLUMNS[String(filters.sort_by || 'created_at')] ? String(filters.sort_by || 'created_at') : 'created_at';
  const direction = String(filters.sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return `${STUDENT_SORT_COLUMNS[sortBy]} ${direction}, id DESC`;
}

export async function getStudentById(db: any, id: number) {
  return await db.prepare('SELECT id, cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich, email, sdt, dia_chi, ngay_cap_cccd, don_vi_cong_tac, image_cccd_front, image_cccd_back, image_3x4, cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id, created_at, updated_at FROM students WHERE id = ?').bind(id).first();
}

export async function findStudentByCCCD(db: any, cccd: string) {
  return await db.prepare('SELECT id, cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich, email, sdt, dia_chi, ngay_cap_cccd, don_vi_cong_tac, image_cccd_front, image_cccd_back, image_3x4, cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id, created_at, updated_at FROM students WHERE cccd = ?').bind(cccd).first();
}

export async function findStudentByEmailOrPhone(db: any, email: string, sdt: string) {
  const result = await db.prepare('SELECT id, cccd, email, sdt FROM students WHERE email = ? OR sdt = ?').bind(email, sdt).all();
  return result.results || [];
}

export async function searchStudents(db: any, keyword: string) {
  // Normalize the search keyword to handle Vietnamese diacritics
  // This allows "Đức Minh" and "duc minh" to both match "duc minh" in ho_ten_normalized
  const normalized = normalizeText(keyword);
  const searchTerm = `%${normalized}%`;
  const exactPattern = `%${keyword}%`;

  const result = await db.prepare(`
    SELECT id, cccd, ho_ten_full, ho_ten_normalized, sdt, email, gioi_tinh, ngay_sinh, created_at, cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id
    FROM students
    WHERE (ho_ten_normalized LIKE ? OR cccd LIKE ? OR sdt LIKE ? OR LOWER(COALESCE(email, '')) LIKE LOWER(?))
      AND NOT (
        LOWER(COALESCE(ho_ten_full, '')) LIKE 'test hoc vien%'
        OR LOWER(COALESCE(email, '')) LIKE '%@student.local'
        OR LOWER(COALESCE(cccd, '')) LIKE 'test%'
      )
    ORDER BY created_at DESC
  `).bind(searchTerm, exactPattern, exactPattern, exactPattern).all();
  return result.results || [];
}

export async function getAllStudents(db: any, limit: number | null, offset: number, filters: any = {}) {
  const { whereSql, binds } = buildStudentQueryFilters(filters);
  const baseSql = buildStudentsBaseSql(whereSql);
  const orderSql = resolveStudentSort(filters);
  const pagingSql = limit && limit > 0 ? 'LIMIT ? OFFSET ?' : '';
  const result = await db.prepare(`
    ${baseSql}
    SELECT ${STUDENT_SELECT_FIELDS}, study_count, exam_count, primary_status
    FROM student_rollups
    ORDER BY ${orderSql}
    ${pagingSql}
  `).bind(...binds, ...(limit && limit > 0 ? [limit, offset] : [])).all();
  return result.results || [];
}

export async function countAllStudents(db: any, filters: any = {}): Promise<number> {
  const { whereSql, binds } = buildStudentQueryFilters(filters);
  const baseSql = buildStudentsBaseSql(whereSql);
  const result = await db.prepare(`
    ${baseSql}
    SELECT COUNT(*) as count FROM student_rollups
  `).bind(...binds).first();
  return result?.count || 0;
}

export async function getStudentSummaryStats(db: any) {
  const [totalStudentsResult, activePendingResult, certifiedResult] = await db.batch([
    db.prepare('SELECT COUNT(*) AS total_students FROM students'),
    db.prepare(`
      WITH all_regs AS (
        SELECT student_id, status FROM registrations
        UNION ALL
        SELECT student_id, status FROM exam_registrations
      )
      SELECT
        COUNT(DISTINCT CASE WHEN status IN ('studying', 'active', 'approved') THEN student_id END) AS active_students,
        COUNT(DISTINCT CASE WHEN status = 'pending' THEN student_id END) AS pending_students
      FROM all_regs
    `),
    db.prepare(`
      SELECT COUNT(DISTINCT student_id) AS certified_students
      FROM certificates
      WHERE status IN ('active', 'issued')
    `),
  ]);

  return {
    totalStudents: totalStudentsResult?.results?.[0]?.total_students || 0,
    activeStudents: activePendingResult?.results?.[0]?.active_students || 0,
    pendingStudents: activePendingResult?.results?.[0]?.pending_students || 0,
    certifiedStudents: certifiedResult?.results?.[0]?.certified_students || 0,
  };
}

export async function createStudent(db: any, data: any) {
  const result = await db.prepare(`
    INSERT INTO students (
      cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized, ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich, email, sdt, dia_chi, ngay_cap_cccd, don_vi_cong_tac, image_cccd_front, image_cccd_back, image_3x4, cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.cccd, data.ho, data.ten_dem || '', data.ten, data.ho_ten_full, data.ho_ten_normalized,
    data.ngay_sinh, data.noi_sinh, data.gioi_tinh, data.dan_toc || 'KINH', data.quoc_tich || 'VIỆT NAM',
    data.email, data.sdt, data.dia_chi, data.ngay_cap_cccd || null, data.don_vi_cong_tac || null,
    data.image_cccd_front || null, data.image_cccd_back || null, data.image_3x4 || null,
    data.cccd_front_image_id || null, data.cccd_back_image_id || null, data.photo_3x4_image_id || null
  ).run();
  
  if (!result.success) throw new Error(result.error);
  return result.meta.last_row_id;
}

export async function updateStudent(db: any, id: number, data: any) {
  const fields = Object.keys(data);
  if (fields.length === 0) return true;
  
  const updates = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => data[f] === undefined ? null : data[f]);
  values.push(id);
  
  const result = await db.prepare(`
    UPDATE students SET ${updates}, updated_at = datetime('now', '+7 hours') WHERE id = ?
  `).bind(...values).run();
  
  if (!result.success) throw new Error(result.error);
  return true;
}

export async function deleteStudent(db: any, id: number) {
  const registrations = await db.prepare('SELECT COUNT(*) as count FROM registrations WHERE student_id = ?').bind(id).first();
  if (registrations && registrations.count > 0) {
    throw new Error('Không thể xóa học viên đã có đăng ký lớp. Vui lòng hủy đăng ký trước.');
  }
  const result = await db.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
  if (!result.success) throw new Error(result.error);
  return true;
}

export async function getStudentEditHistory(db: any, studentId: number, limit: number, offset: number) {
  const result = await db.prepare(`
    SELECT seh.id, seh.student_id, seh.admin_id, seh.changed_by_type, seh.field_name, seh.old_value, seh.new_value, seh.changed_at, seh.ip_address, seh.user_agent, a.username as admin_username, a.full_name as admin_full_name
    FROM student_edit_history seh LEFT JOIN admins a ON seh.admin_id = a.id
    WHERE seh.student_id = ? ORDER BY seh.changed_at DESC LIMIT ? OFFSET ?
  `).bind(studentId, limit, offset).all();
  return result.results || [];
}

export async function logStudentEditHistory(db: any, data: any) {
  await db.prepare(`
    INSERT INTO student_edit_history (student_id, admin_id, changed_by_type, field_name, old_value, new_value, ip_address, user_agent) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.student_id, data.admin_id, data.changed_by_type, data.field_name,
    data.old_value, data.new_value, data.ip_address, data.user_agent
  ).run();
}

export async function getStudentRegistrations(db: any, studentId: number) {
  const studyQuery = db.prepare(`
    SELECT r.id as registration_id, r.class_id, r.status as status, r.created_at as registration_created_at,
      r.updated_at as registration_updated_at,
      COALESCE(p.status, 'unpaid') as payment_status,
      COALESCE(p.paid_amount, 0) as paid_amount,
      c.id as class_id, c.ten_lop, c.ma_lop, c.ngay_bat_dau, c.ngay_ket_thuc, c.ngay_thi, c.gio_thi, c.dia_diem, c.hoc_phi, c.open_at, c.close_at, c.status as class_status, c.class_type, c.max_students, c.current_students, c.created_at as class_created_at, c.updated_at as class_updated_at,
      NULL as approved_at, NULL as approved_by, NULL as approved_by_name, NULL as created_by_name
    FROM registrations r
    JOIN classes c ON r.class_id = c.id
    LEFT JOIN (
      SELECT registration_id, 'confirmed' as status, SUM(amount) as paid_amount
      FROM payments
      WHERE status = 'confirmed'
      GROUP BY registration_id
    ) p ON r.id = p.registration_id
    WHERE r.student_id = ?
  `).bind(studentId);

  const examQuery = db.prepare(`
    SELECT er.id as registration_id, er.exam_id as class_id, er.status as status, er.created_at as registration_created_at,
      er.approved_at, er.approved_by,
      a_approved.full_name as approved_by_name,
      a_created.full_name as created_by_name,
      'approved' as payment_status, 0 as paid_amount,
      es.id as exam_id, es.exam_name as ten_lop, 'EXAM-' || es.id as ma_lop, es.exam_date as ngay_thi, es.exam_date as ngay_bat_dau, es.location as dia_diem, es.duration_minutes, 'thi' as class_type
    FROM exam_registrations er
    JOIN exam_schedules es ON er.exam_id = es.id
    LEFT JOIN admins a_approved ON er.approved_by = a_approved.id
    LEFT JOIN admins a_created ON er.created_by = a_created.id
    WHERE er.student_id = ?
  `).bind(studentId);

  const [studyResult, examResult] = await db.batch([studyQuery, examQuery]);
  const allRegistrations = [...(studyResult.results || []), ...(examResult.results || [])].sort((a: any, b: any) => {
    return new Date(b.ngay_thi || b.registration_created_at).getTime() - new Date(a.ngay_thi || a.registration_created_at).getTime();
  });
  return allRegistrations;
}
