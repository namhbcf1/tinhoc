/**
 * Student database queries
 * Handles: CRUD + search for students table
 */

import { normalizeText } from '../utils/helpers.js';

// ========================================
// FIND
// ========================================

export async function findStudentByCCCD(db: D1Database, cccd: string) {
  const result = await db.prepare(
    'SELECT * FROM students WHERE cccd = ?'
  ).bind(cccd).first();
  return result;
}

export async function findStudentByEmailOrPhone(db: D1Database, email: string, sdt: string) {
  const result = await db.prepare(
    'SELECT * FROM students WHERE email = ? OR sdt = ?'
  ).bind(email, sdt).all();
  return result.results || [];
}

// ========================================
// CREATE
// ========================================

export async function createStudent(db: D1Database, data: Record<string, any>) {
  const {
    cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized,
    ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich, email, sdt, dia_chi,
    ngay_cap_cccd, don_vi_cong_tac,
    image_cccd_front, image_cccd_back, image_3x4,
    cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id
  } = data;

  const result = await db.prepare(`
    INSERT INTO students (
      cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized,
      ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich, email, sdt, dia_chi,
      ngay_cap_cccd, don_vi_cong_tac,
      image_cccd_front, image_cccd_back, image_3x4,
      cccd_front_image_id, cccd_back_image_id, photo_3x4_image_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized,
    ngay_sinh, noi_sinh, gioi_tinh, dan_toc || 'KINH', quoc_tich || 'VIỆT NAM',
    email, sdt, dia_chi, ngay_cap_cccd || null, don_vi_cong_tac || null,
    image_cccd_front || null, image_cccd_back || null, image_3x4 || null,
    cccd_front_image_id || null, cccd_back_image_id || null, photo_3x4_image_id || null
  ).run();

  return result;
}

// ========================================
// UPDATE
// ========================================

export async function updateStudent(db: D1Database, id: number, data: Record<string, unknown>) {
  // Dynamic update query to only update provided fields
  const updates: string[] = [];
  const values: unknown[] = [];

  const fields = [
    'cccd', 'ho', 'ten_dem', 'ten', 'ho_ten_full', 'ho_ten_normalized',
    'ngay_sinh', 'noi_sinh', 'gioi_tinh', 'dan_toc', 'quoc_tich', 'email', 'sdt', 'dia_chi'
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  if (data.image_cccd_front !== undefined) {
    updates.push('image_cccd_front = ?');
    values.push(data.image_cccd_front);
  }
  if (data.image_cccd_back !== undefined) {
    updates.push('image_cccd_back = ?');
    values.push(data.image_cccd_back);
  }
  if (data.image_3x4 !== undefined) {
    updates.push('image_3x4 = ?');
    values.push(data.image_3x4);
  }
  if (data.ngay_cap_cccd !== undefined) {
    updates.push('ngay_cap_cccd = ?');
    values.push(data.ngay_cap_cccd);
  }
  if (data.don_vi_cong_tac !== undefined) {
    updates.push('don_vi_cong_tac = ?');
    values.push(data.don_vi_cong_tac);
  }
  if (data.cccd_front_image_id !== undefined) {
    updates.push('cccd_front_image_id = ?');
    values.push(data.cccd_front_image_id);
  }
  if (data.cccd_back_image_id !== undefined) {
    updates.push('cccd_back_image_id = ?');
    values.push(data.cccd_back_image_id);
  }
  if (data.photo_3x4_image_id !== undefined) {
    updates.push('photo_3x4_image_id = ?');
    values.push(data.photo_3x4_image_id);
  }

  // Add updated_at
  updates.push("updated_at = datetime('now', '+7 hours')");

  // Add ID to values
  values.push(id);

  const result = await db.prepare(`
      UPDATE students SET
        ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();

  return result;
}

// ========================================
// DELETE
// ========================================

export async function deleteStudent(db: D1Database, id: number) {
  // Kiem tra xem hoc vien co dang ky lop nao khong
  const registrations = await db.prepare(`
    SELECT COUNT(*) as count FROM registrations WHERE student_id = ?
    `).bind(id).first<{ count: number }>();

  if (registrations && registrations.count > 0) {
    return {
      success: false,
      error: 'Cannot delete student with existing class registrations. Please cancel registrations first.',
    };
  }

  // Xoa hoc vien (CASCADE se tu dong xoa cac ban ghi lien quan)
  const result = await db.prepare(`
    DELETE FROM students WHERE id = ?
    `).bind(id).run();

  return {
    success: true,
    meta: result.meta,
  };
}

// ========================================
// LIST / SEARCH
// ========================================

export async function getAllStudents(db: D1Database, limit = 100, offset = 0) {
  const result = await db.prepare(`
    SELECT * FROM students
    WHERE NOT (
      LOWER(COALESCE(ho_ten_full, '')) LIKE 'test hoc vien%'
      OR LOWER(COALESCE(email, '')) LIKE '%@student.local'
      OR LOWER(COALESCE(cccd, '')) LIKE 'test%'
    )
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

  return result.results || [];
}

export async function searchStudents(db: D1Database, keyword: string) {
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  const searchTerm = keyword.trim();
  const normalized = normalizeText(searchTerm);

  // Normalize phone number: remove spaces, dashes, dots, parentheses
  const normalizePhone = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/[\s\-\.\(\)]/g, '').trim();
  };

  const normalizedPhone = normalizePhone(searchTerm);
  const searchPattern = `%${normalized}%`;
  const exactPattern = `%${searchTerm}%`;

  // Comprehensive search query
  const query = `
    SELECT * FROM students
    WHERE (
      ho_ten_normalized LIKE ?
      OR LOWER(COALESCE(ho_ten_full, '')) LIKE ?
      OR LOWER(ho) LIKE ?
      OR LOWER(COALESCE(ten_dem, '')) LIKE ?
      OR LOWER(ten) LIKE ?
      OR cccd LIKE ?
      OR sdt LIKE ?
    )
    AND NOT (
      LOWER(COALESCE(ho_ten_full, '')) LIKE 'test hoc vien%'
      OR LOWER(COALESCE(email, '')) LIKE '%@student.local'
      OR LOWER(COALESCE(cccd, '')) LIKE 'test%'
    )
    ORDER BY
      CASE
        WHEN cccd = ? THEN 1
        WHEN ho_ten_normalized LIKE ? THEN 2
        WHEN LOWER(ho) LIKE ? OR LOWER(ten) LIKE ? THEN 3
        WHEN sdt LIKE ? THEN 4
        ELSE 5
      END,
      created_at DESC
    LIMIT 100
  `;

  const result = await db.prepare(query).bind(
    searchPattern,
    `%${searchTerm.toLowerCase()}%`,
    searchPattern,
    searchPattern,
    searchPattern,
    exactPattern,
    exactPattern,
    searchTerm,
    `${normalized}%`,
    `${normalized}%`,
    `${normalized}%`,
    exactPattern
  ).all();

  let results: any[] = result.results || [];

  // Additional phone search: use SQL REPLACE to normalize stored phone numbers
  if (normalizedPhone.length >= 3 && /^[0-9]+$/.test(normalizedPhone)) {
    const phoneResult = await db.prepare(`
      SELECT * FROM students
      WHERE sdt IS NOT NULL AND sdt != ''
        AND REPLACE(REPLACE(REPLACE(REPLACE(sdt, ' ', ''), '-', ''), '.', ''), '(', '') LIKE ?
        AND NOT (
          LOWER(COALESCE(ho_ten_full, '')) LIKE 'test hoc vien%'
          OR LOWER(COALESCE(email, '')) LIKE '%@student.local'
          OR LOWER(COALESCE(cccd, '')) LIKE 'test%'
        )
      LIMIT 100
    `).bind(`%${normalizedPhone}%`).all();

    const existingIds = new Set(results.map((s: any) => s.id));
    for (const student of (phoneResult.results || [])) {
      if (!existingIds.has((student as any).id)) {
        results.push(student);
        existingIds.add((student as any).id);
      }
    }
  }

  // Sort: exact CCCD > name starts with > phone match > creation date
  results.sort((a: any, b: any) => {
    const aName = (a.ho_ten_normalized || '').toLowerCase();
    const bName = (b.ho_ten_normalized || '').toLowerCase();
    const aPhone = normalizePhone(a.sdt || '');
    const bPhone = normalizePhone(b.sdt || '');

    if (a.cccd === searchTerm && b.cccd !== searchTerm) return -1;
    if (b.cccd === searchTerm && a.cccd !== searchTerm) return 1;

    if (aName.startsWith(normalized) && !bName.startsWith(normalized)) return -1;
    if (bName.startsWith(normalized) && !aName.startsWith(normalized)) return 1;

    if (aPhone.includes(normalizedPhone) && !bPhone.includes(normalizedPhone)) return -1;
    if (bPhone.includes(normalizedPhone) && !aPhone.includes(normalizedPhone)) return 1;

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return results.slice(0, 100);
}
