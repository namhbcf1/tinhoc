import * as StudentRepo from '../repositories/student-repository.js';
import { normalizeText, capitalizeFullName, formatDate } from '../utils/helpers.js';
import { generateMultipleSignedURLs } from '../utils/cloudflare-images.js';
import { issueSessionToken } from '../lib/auth/session-broker.js';
import { normalizeBirthPlaceValue } from '../utils/birth-place.js';

// So sánh giá trị cũ/mới - coi null, undefined, "" là giống nhau
function valuesEqual(a: any, b: any): boolean {
  const norm = (v: any) => (v === null || v === undefined || v === '') ? '' : String(v).trim();
  return norm(a) === norm(b);
}

function normalizeWhitespace(value: any): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function sanitizePhone(value: any): string {
  return normalizeWhitespace(value).replace(/[^\d+]/g, '');
}

function sanitizePlaceValue(value: any): string {
  const cleaned = normalizeWhitespace(value)
    .replace(/\b(?:place\s*of\s*ongin|place\s*of\s*origin|place\s*of\s*residence|quê\s*quán|quê\s*quản|que\s*quan|nơi\s*thường\s*trú)\b/gi, '')
    .replace(/[/:]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^(?:[,.\-\s])+/, '')
    .trim();
  return normalizeBirthPlaceValue(cleaned);
}

function sanitizeStudentTextField(field: string, value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;

  const normalized = normalizeWhitespace(value);
  if (!normalized) return '';

  switch (field) {
    case 'cccd':
      return normalized.replace(/\s+/g, '');
    case 'email':
      return normalized.toLowerCase();
    case 'sdt':
      return sanitizePhone(normalized);
    case 'noi_sinh':
      return sanitizePlaceValue(normalized);
    default:
      return normalized;
  }
}

const STUDENT_SELF_EDITABLE_FIELDS = [
  'cccd',
  'ho',
  'ten_dem',
  'ten',
  'noi_sinh',
  'dan_toc',
  'quoc_tich',
  'email',
  'sdt',
  'dia_chi',
  'don_vi_cong_tac',
  'image_cccd_front',
  'image_cccd_back',
  'image_3x4',
  'cccd_front_image_id',
  'cccd_back_image_id',
  'photo_3x4_image_id',
] as const;

export function normalizeStudentGender(input: any, fallback: string | null = null): string {
  const raw = input ?? fallback;

  if (raw === null || raw === undefined || String(raw).trim() === '') {
    throw new Error('Giới tính không hợp lệ. Chỉ hỗ trợ Nam hoặc Nữ.');
  }

  const value = String(raw).trim();
  const normalized = value.toLowerCase();

  if (normalized === 'male' || normalized === 'nam') return 'Nam';
  if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'Nữ';

  throw new Error('Giới tính không hợp lệ. Chỉ hỗ trợ Nam hoặc Nữ.');
}

export async function enrichStudentWithImages(c: any, student: any) {
  if (!student) return student;
  const s = { ...student };
  s.noi_sinh = normalizeBirthPlaceValue(s.noi_sinh);
  const useCF = c.env.CLOUDFLARE_IMAGES_API_TOKEN && c.env.CLOUDFLARE_ACCOUNT_ID;

  if (useCF) {
    const ids = {
      cccd_front: s.cccd_front_image_id,
      cccd_back: s.cccd_back_image_id,
      photo_3x4: s.photo_3x4_image_id
    };
    try {
      const urls: any = await generateMultipleSignedURLs(c.env, ids, 120);
      if (s.cccd_front_image_id && urls.cccd_front) s.image_cccd_front = urls.cccd_front;
      if (s.cccd_back_image_id && urls.cccd_back) s.image_cccd_back = urls.cccd_back;
      if (s.photo_3x4_image_id && urls.photo_3x4) s.image_3x4 = urls.photo_3x4;
    } catch (e) {
      console.error('Error generating signed URLs:', e);
    }
  } else {
    const baseUrl = new URL(c.req.url).origin;
    const makeR2Url = (key: string) => key ? `${baseUrl}/students/image/${encodeURIComponent(key)}` : null;
    if (s.cccd_front_image_id) s.image_cccd_front = makeR2Url(s.cccd_front_image_id);
    if (s.cccd_back_image_id) s.image_cccd_back = makeR2Url(s.cccd_back_image_id);
    if (s.photo_3x4_image_id) s.image_3x4 = makeR2Url(s.photo_3x4_image_id);
  }
  return s;
}

export async function uploadImage(c: any, file: File) {
  if (file.size > 50 * 1024 * 1024) throw new Error('Ảnh quá lớn. Kích thước tối đa là 50MB');
  const fileBuffer = await file.arrayBuffer();
  const r2Key = `student-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  
  await c.env.R2.put(r2Key, fileBuffer, {
    httpMetadata: { contentType: file.type || 'application/octet-stream', cacheControl: 'public, max-age=31536000' }
  });
  
  const baseUrl = new URL(c.req.url).origin;
  return { url: `${baseUrl}/students/image/${encodeURIComponent(r2Key)}`, key: r2Key };
}

export async function loginStudent(c: any, cccd: string, sdt: string) {
  const normalizePhone = (p: string) => p.replace(/[\s\-\.]/g, '').trim();
  const student = await StudentRepo.findStudentByCCCD(c.env.DB, cccd.trim());

  // Use generic error to prevent CCCD enumeration attacks
  if (!student) throw new Error('Thông tin đăng nhập không chính xác');
  if (normalizePhone(student.sdt || '') !== normalizePhone(sdt)) {
    throw new Error('Thông tin đăng nhập không chính xác');
  }
  
  const issued = await issueSessionToken(
    c.env.DB,
    c.env,
    {
      id: Number(student.id),
      userType: 'student',
      cccd: student.cccd,
      phone: student.sdt || null,
      email: student.email || null,
      displayName: student.ho_ten_full || student.cccd,
    },
    'edu'
  );
  const registrations = await StudentRepo.getStudentRegistrations(c.env.DB, student.id);
  const enriched = await enrichStudentWithImages(c, student);
  
  return {
    token: issued.token,
    sid: issued.sid,
    expires_at: issued.expiresAt,
    data: { ...enriched, registrations },
  };
}

export async function registerStudent(c: any, data: any) {
  const existingByCCCD = await StudentRepo.findStudentByCCCD(c.env.DB, data.cccd);
  if (existingByCCCD) throw new Error('Số CCCD/CMT đã được đăng ký. Vui lòng kiểm tra lại!');
  
  const existingByContact = await StudentRepo.findStudentByEmailOrPhone(c.env.DB, data.email, data.sdt);
  if (existingByContact.length > 0) {
    if (existingByContact[0].sdt === data.sdt) throw new Error('Số điện thoại đã được đăng ký.');
    if (existingByContact[0].email === data.email) throw new Error('Email đã được đăng ký.');
  }

  const normalizedInput = {
    cccd: sanitizeStudentTextField('cccd', data.cccd),
    ho: sanitizeStudentTextField('ho', data.ho),
    ten_dem: sanitizeStudentTextField('ten_dem', data.ten_dem || ''),
    ten: sanitizeStudentTextField('ten', data.ten),
    noi_sinh: sanitizeStudentTextField('noi_sinh', data.noi_sinh),
    dan_toc: sanitizeStudentTextField('dan_toc', data.dan_toc),
    quoc_tich: sanitizeStudentTextField('quoc_tich', data.quoc_tich),
    email: sanitizeStudentTextField('email', data.email),
    sdt: sanitizeStudentTextField('sdt', data.sdt),
    dia_chi: sanitizeStudentTextField('dia_chi', data.dia_chi),
    don_vi_cong_tac: sanitizeStudentTextField('don_vi_cong_tac', data.don_vi_cong_tac),
  };

  const ho_ten_full = capitalizeFullName(normalizedInput.ho, normalizedInput.ten_dem || '', normalizedInput.ten);
  const studentData = {
    ...data,
    ...normalizedInput,
    ho_ten_full,
    ho_ten_normalized: normalizeText(ho_ten_full),
    ngay_sinh: formatDate(data.ngay_sinh),
    gioi_tinh: normalizeStudentGender(data.gioi_tinh),
    dan_toc: normalizedInput.dan_toc || 'Kinh',
    quoc_tich: normalizedInput.quoc_tich || 'Việt Nam',
    email: normalizedInput.email,
    ngay_cap_cccd: data.ngay_cap_cccd ? formatDate(data.ngay_cap_cccd) : null,
  };

  const studentId = await StudentRepo.createStudent(c.env.DB, studentData);
  const issued = await issueSessionToken(
    c.env.DB,
    c.env,
    {
      id: Number(studentId),
      userType: 'student',
      cccd: studentData.cccd,
      phone: studentData.sdt || null,
      email: studentData.email || null,
      displayName: studentData.ho_ten_full || studentData.cccd,
    },
    'edu'
  );
  
  return {
    token: issued.token,
    sid: issued.sid,
    expires_at: issued.expiresAt,
    student_id: studentId,
    data: { id: studentId, ...studentData },
  };
}

export async function getStudentsList(c: any, limit: number, offset: number, page: number = 1) {
  // Run count + data queries in parallel to avoid sequential round-trips
  const [total, list, stats] = await Promise.all([
    StudentRepo.countAllStudents(c.env.DB),
    StudentRepo.getAllStudents(c.env.DB, limit, offset),
    StudentRepo.getStudentSummaryStats(c.env.DB),
  ]);

  const data = await Promise.all(list.map(async (s: any) => {
    const regs = await StudentRepo.getStudentRegistrations(c.env.DB, s.id);
    const enriched = await enrichStudentWithImages(c, s);
    return { ...enriched, registrations: regs.map((r: any) => ({ ...r, class_type: r.class_type || 'hoc' })) };
  }));

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    },
  };
}

export async function searchStudents(c: any, query: string) {
  if (query.length < 2) throw new Error('Từ khóa phải ít nhất 2 ký tự');
  const results = await StudentRepo.searchStudents(c.env.DB, query);
  return await Promise.all(results.map(async (s: any) => {
    const regs = await StudentRepo.getStudentRegistrations(c.env.DB, s.id);
    const enriched = await enrichStudentWithImages(c, s);
    return { ...enriched, registrations: regs.map((r: any) => ({ ...r, class_type: r.class_type || 'hoc' })) };
  }));
}

export async function getStudentEditHistory(c: any, id: number, limit: number, offset: number) {
  const exists = await StudentRepo.getStudentById(c.env.DB, id);
  if (!exists) throw new Error('Không tìm thấy học viên');
  return await StudentRepo.getStudentEditHistory(c.env.DB, id, limit, offset);
}

export async function getStudentByCCCD(c: any, cccd: string) {
  if (cccd.includes('/')) throw new Error('API endpoint không tồn tại');
  const student = await StudentRepo.findStudentByCCCD(c.env.DB, cccd);
  if (!student) throw new Error('Không tìm thấy sinh viên');
  const registrations = await StudentRepo.getStudentRegistrations(c.env.DB, student.id);
  const enriched = await enrichStudentWithImages(c, student);
  return { ...enriched, registrations };
}

export async function updateStudentByCCCD(c: any, data: any) {
  const currentCCCD = String(data.current_cccd || data.cccd || '').trim();
  if (!currentCCCD) throw new Error('Thiếu CCCD học viên');

  const student = await StudentRepo.findStudentByCCCD(c.env.DB, currentCCCD);
  if (!student) throw new Error('Không tìm thấy sinh viên');

  const nextCCCD = data.cccd !== undefined ? String(data.cccd).trim() : String(student.cccd).trim();
  if (data.cccd !== undefined && !nextCCCD) {
    throw new Error('CCCD/CMND không được để trống');
  }
  if (nextCCCD !== String(student.cccd).trim()) {
    const existingByCCCD = await StudentRepo.findStudentByCCCD(c.env.DB, nextCCCD);
    if (existingByCCCD && Number(existingByCCCD.id) !== Number(student.id)) {
      throw new Error('Số CCCD/CMND đã được sử dụng bởi học viên khác');
    }
  }

  const updateData: any = {};
  for (const field of STUDENT_SELF_EDITABLE_FIELDS) {
    if (data[field] !== undefined) updateData[field] = sanitizeStudentTextField(field, data[field]);
  }
  if (data.ngay_sinh !== undefined) updateData.ngay_sinh = data.ngay_sinh ? formatDate(data.ngay_sinh) : null;
  if (data.ngay_cap_cccd !== undefined) updateData.ngay_cap_cccd = data.ngay_cap_cccd ? formatDate(data.ngay_cap_cccd) : null;
  if (data.gioi_tinh !== undefined) updateData.gioi_tinh = normalizeStudentGender(data.gioi_tinh, student.gioi_tinh);

  if (updateData.email !== undefined) {
    if (!updateData.email) {
      throw new Error('Email không được để trống');
    }
    updateData.email = String(updateData.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
      throw new Error('Email không hợp lệ');
    }
  }

  if (updateData.ho !== undefined || updateData.ten !== undefined || updateData.ten_dem !== undefined) {
    updateData.ho_ten_full = capitalizeFullName(
      updateData.ho ?? student.ho,
      updateData.ten_dem ?? student.ten_dem ?? '',
      updateData.ten ?? student.ten
    );
    updateData.ho_ten_normalized = normalizeText(updateData.ho_ten_full);
  }

  const skipLogFields = new Set(['ho_ten_full', 'ho_ten_normalized']);
  const changedFields = Object.keys(updateData).filter((field) => {
    if (skipLogFields.has(field)) return false;
    return !valuesEqual(student[field], updateData[field]);
  });

  if (changedFields.length > 0) {
    await Promise.all(changedFields.map((field) => (
      StudentRepo.logStudentEditHistory(c.env.DB, {
        student_id: student.id, admin_id: null, changed_by_type: 'student', field_name: field,
        old_value: student[field], new_value: updateData[field],
        ip_address: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null,
        user_agent: c.req.header('User-Agent') || null
      })
    )));
  }

  if (Object.keys(updateData).length > 0) {
    await StudentRepo.updateStudent(c.env.DB, student.id, updateData);
  }

  const [updatedStudent, registrations] = await Promise.all([
    StudentRepo.findStudentByCCCD(c.env.DB, nextCCCD),
    StudentRepo.getStudentRegistrations(c.env.DB, student.id),
  ]);
  const enriched = await enrichStudentWithImages(c, updatedStudent);
  const profile = { ...enriched, registrations };

  const response: any = { data: profile };
  if (nextCCCD !== String(student.cccd).trim()) {
    const issued = await issueSessionToken(
      c.env.DB,
      c.env,
      {
        id: Number(student.id),
        userType: 'student',
        cccd: nextCCCD,
        phone: profile?.sdt || null,
        email: profile?.email || null,
        displayName: profile?.ho_ten_full || nextCCCD,
      },
      'edu'
    );
    response.token = issued.token;
    response.sid = issued.sid;
    response.expires_at = issued.expiresAt;
  }

  return response;
}

export async function updateStudentAdmin(c: any, id: number, data: any) {
  const existing = await StudentRepo.getStudentById(c.env.DB, id);
  if (!existing) throw new Error('Không tìm thấy học viên');
  
  if (data.cccd && data.cccd !== existing.cccd) {
    if (await StudentRepo.findStudentByCCCD(c.env.DB, data.cccd)) throw new Error('Số CCCD đã được sử dụng bởi học viên khác');
  }

  const updateData: any = {};
  for (const field of ['cccd', 'ho', 'ten_dem', 'ten', 'noi_sinh', 'dan_toc', 'quoc_tich', 'email', 'sdt', 'dia_chi', 'don_vi_cong_tac', 'image_cccd_front', 'image_cccd_back', 'image_3x4', 'cccd_front_image_id', 'cccd_back_image_id', 'photo_3x4_image_id']) {
    if (data[field] !== undefined) updateData[field] = sanitizeStudentTextField(field, data[field]);
  }
  if (data.ngay_sinh) updateData.ngay_sinh = formatDate(data.ngay_sinh);
  if (data.ngay_cap_cccd) updateData.ngay_cap_cccd = formatDate(data.ngay_cap_cccd);
  if (data.gioi_tinh) updateData.gioi_tinh = normalizeStudentGender(data.gioi_tinh, existing.gioi_tinh);
  
  if (updateData.ho || updateData.ten || updateData.ten_dem !== undefined) {
    updateData.ho_ten_full = capitalizeFullName(updateData.ho || existing.ho, updateData.ten_dem ?? existing.ten_dem ?? '', updateData.ten || existing.ten);
    updateData.ho_ten_normalized = normalizeText(updateData.ho_ten_full);
  }

  const user = c.get('user');
  const adminId = user?.type === 'admin' ? user.id : null;

  const skipFields = new Set(['ho_ten_full', 'ho_ten_normalized']);
  for (const field of Object.keys(updateData)) {
    if (skipFields.has(field)) continue;
    if (!valuesEqual(existing[field], updateData[field])) {
      await StudentRepo.logStudentEditHistory(c.env.DB, {
        student_id: id, admin_id: adminId, changed_by_type: 'admin', field_name: field,
        old_value: existing[field], new_value: updateData[field],
        ip_address: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null,
        user_agent: c.req.header('User-Agent') || null
      });
    }
  }

  await StudentRepo.updateStudent(c.env.DB, id, updateData);
  const updated = await StudentRepo.getStudentById(c.env.DB, id);
  return await enrichStudentWithImages(c, updated);
}

export async function deleteStudentAdmin(c: any, id: number) {
  const existing = await StudentRepo.getStudentById(c.env.DB, id);
  if (!existing) throw new Error('Không tìm thấy học viên');
  await StudentRepo.deleteStudent(c.env.DB, id);
  return { message: 'Xóa học viên thành công' };
}
