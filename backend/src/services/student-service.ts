import * as StudentRepo from '../repositories/student-repository.js';
import { normalizeText, formatDate } from '../utils/helpers.js';
import { generateSignedImageURL } from '../utils/cloudflare-images.js';
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

function toUpperVi(value: any): string {
  return normalizeWhitespace(value).toLocaleUpperCase('vi-VN');
}

function buildUpperFullName(ho: any, tenDem: any, ten: any): string {
  return [ho, tenDem, ten].map((part) => normalizeWhitespace(part)).filter(Boolean).join(' ').toLocaleUpperCase('vi-VN');
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
      return toUpperVi(sanitizePlaceValue(normalized));
    case 'image_cccd_front':
    case 'image_cccd_back':
    case 'image_3x4':
    case 'cccd_front_image_id':
    case 'cccd_back_image_id':
    case 'photo_3x4_image_id':
      return normalized;
    default:
      return toUpperVi(normalized);
  }
}

const SYNTHETIC_TEST_STUDENT_PASSWORD = 'test123';

function isSyntheticTestStudentCccd(value: any): boolean {
  const normalized = sanitizeStudentTextField('cccd', value);
  return /^(?:00[1-9]|001[0-9])$/.test(normalized);
}

export function isAcceptedStudentLoginSecret(
  cccd: any,
  storedPhone: any,
  providedSecret: any,
  storedEmail?: any,
): boolean {
  const submitted = normalizeWhitespace(providedSecret);
  if (!submitted) {
    return false;
  }

  if (isSyntheticTestStudentCccd(cccd)) {
    return submitted === SYNTHETIC_TEST_STUDENT_PASSWORD;
  }

  const normalizePhone = (value: string) => value.replace(/[\s\-\.]/g, '').trim();
  const submittedPhone = normalizePhone(submitted);
  const storedPhoneValue = normalizePhone(String(storedPhone || ''));
  if (storedPhoneValue && storedPhoneValue === submittedPhone) {
    return true;
  }

  const normalizeEmail = (value: string) => normalizeWhitespace(value).toLowerCase();
  const submittedEmail = normalizeEmail(submitted);
  const storedEmailValue = normalizeEmail(String(storedEmail || ''));
  return Boolean(storedEmailValue && storedEmailValue === submittedEmail);
}

function derivePublicBaseUrl(c: any): string {
  const requestUrl = new URL(c.req.url);
  const forwardedHostRaw = c.req.header('x-forwarded-host');
  const forwardedProtoRaw = c.req.header('x-forwarded-proto');

  const forwardedHost = forwardedHostRaw?.split(',')[0]?.trim();
  const forwardedProto = forwardedProtoRaw?.split(',')[0]?.trim()?.replace(':', '');

  const host = forwardedHost || requestUrl.host;
  const proto = forwardedProto || requestUrl.protocol.replace(':', '');

  try {
    const origin = new URL(`${proto}://${host}`).origin;
    // Keep /api prefix when request itself is served under /api (route-based deployment)
    // or when request is proxied via frontend API gateway.
    const hasApiPrefix = requestUrl.pathname.startsWith('/api/');
    if (hasApiPrefix || forwardedHost) {
      return `${origin}/api`;
    }
    return origin;
  } catch {
    return requestUrl.origin;
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
  const normalizedInput = normalizeWhitespace(input);
  const normalizedFallback = normalizeWhitespace(fallback);
  const raw = normalizedInput || normalizedFallback;

  if (!raw) {
    throw new Error('Giới tính không hợp lệ. Chỉ hỗ trợ Nam, Nữ hoặc Khác.');
  }

  const lowered = raw.toLowerCase();
  const folded = lowered.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (folded === 'nam' || folded === 'male' || folded === 'm') return 'Nam';
  if (folded === 'nu' || folded === 'female' || folded === 'f') return 'Nữ';
  if (folded === 'khac' || folded === 'other' || folded === 'x') return 'Khác';

  throw new Error('Giới tính không hợp lệ. Chỉ hỗ trợ Nam, Nữ hoặc Khác.');
}

export async function enrichStudentWithImages(c: any, student: any) {
  if (!student) return student;
  const s = { ...student };
  s.ho = toUpperVi(s.ho);
  s.ten_dem = toUpperVi(s.ten_dem);
  s.ten = toUpperVi(s.ten);
  s.ho_ten_full = toUpperVi(s.ho_ten_full || buildUpperFullName(s.ho, s.ten_dem, s.ten));
  s.noi_sinh = toUpperVi(normalizeBirthPlaceValue(s.noi_sinh));
  s.dan_toc = toUpperVi(s.dan_toc);
  s.quoc_tich = toUpperVi(s.quoc_tich);
  s.dia_chi = toUpperVi(s.dia_chi);
  s.don_vi_cong_tac = toUpperVi(s.don_vi_cong_tac);
  s.email = normalizeWhitespace(s.email).toLowerCase();
  if (normalizeWhitespace(s.gioi_tinh)) {
    try {
      s.gioi_tinh = normalizeStudentGender(s.gioi_tinh);
    } catch {
      s.gioi_tinh = normalizeWhitespace(s.gioi_tinh);
    }
  }
  const useCF = c.env.CLOUDFLARE_IMAGES_API_TOKEN && c.env.CLOUDFLARE_ACCOUNT_ID;
  const baseUrl = derivePublicBaseUrl(c);
  const makeR2Url = (key: string) => key ? `${baseUrl}/students/image/${encodeURIComponent(key)}` : null;

  const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
  const isLikelyR2Key = (value: string) => value.includes('/');

  const resolveStoredImage = async (value: unknown): Promise<string | null> => {
    const normalized = normalizeWhitespace(value);
    if (!normalized) return null;
    if (isAbsoluteUrl(normalized)) return normalized;

    // Legacy + current uploads are persisted as R2 object keys (e.g. cccd-uploads/photo_3x4/...)
    if (isLikelyR2Key(normalized)) {
      return makeR2Url(normalized);
    }

    // For true Cloudflare Images IDs (no slash), generate signed URL if configured.
    if (useCF) {
      try {
        return await generateSignedImageURL(c.env, normalized, 120);
      } catch (error) {
        // Fallback to R2 route for mixed data states during migration.
        console.error('Signed image URL fallback to R2 path:', error);
        return makeR2Url(normalized);
      }
    }

    return makeR2Url(normalized);
  };

  if (s.cccd_front_image_id) {
    const resolved = await resolveStoredImage(s.cccd_front_image_id);
    if (resolved) s.image_cccd_front = resolved;
  }

  if (s.cccd_back_image_id) {
    const resolved = await resolveStoredImage(s.cccd_back_image_id);
    if (resolved) s.image_cccd_back = resolved;
  }

  if (s.photo_3x4_image_id) {
    const resolved = await resolveStoredImage(s.photo_3x4_image_id);
    if (resolved) s.image_3x4 = resolved;
  } else if (s.image_3x4) {
    const resolved = await resolveStoredImage(s.image_3x4);
    if (resolved) s.image_3x4 = resolved;
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
  
  const baseUrl = derivePublicBaseUrl(c);
  return { url: `${baseUrl}/students/image/${encodeURIComponent(r2Key)}`, key: r2Key };
}

export async function loginStudent(c: any, cccd: string, sdt: string) {
  const normalizedCCCD = sanitizeStudentTextField('cccd', cccd);
  const student = await StudentRepo.findStudentByCCCD(c.env.DB, normalizedCCCD);

  // Use generic error to prevent CCCD enumeration attacks
  if (!student) throw new Error('Thông tin đăng nhập không chính xác');
  if (!isAcceptedStudentLoginSecret(student.cccd, student.sdt, sdt, student.email)) {
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
  const normalizedProbeCCCD = sanitizeStudentTextField('cccd', data.cccd);

  const existingByCCCD = await StudentRepo.findStudentByCCCD(c.env.DB, normalizedProbeCCCD);
  if (existingByCCCD) throw new Error('Số CCCD/CMT đã được đăng ký. Vui lòng kiểm tra lại!');

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

  const ho_ten_full = buildUpperFullName(normalizedInput.ho, normalizedInput.ten_dem || '', normalizedInput.ten);
  const studentData = {
    ...data,
    ...normalizedInput,
    ho_ten_full,
    ho_ten_normalized: normalizeText(ho_ten_full),
    ngay_sinh: formatDate(data.ngay_sinh),
    gioi_tinh: normalizeStudentGender(data.gioi_tinh),
    dan_toc: normalizedInput.dan_toc || 'KINH',
    quoc_tich: normalizedInput.quoc_tich || 'VIỆT NAM',
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

export async function getStudentsList(c: any, limit: number | null, offset: number, page: number = 1, filters: any = {}) {
  const [total, list, stats] = await Promise.all([
    StudentRepo.countAllStudents(c.env.DB, filters),
    StudentRepo.getAllStudents(c.env.DB, limit, offset, filters),
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
      totalPages: limit && limit > 0 ? Math.ceil(total / limit) : 1,
      stats,
      filters,
    },
  };
}

export async function validateStudentAdmin(c: any, data: any) {
  const currentId = data.id || data.student_id || data.current_id || null;
  const errors: Record<string, string> = {};

  const cccd = sanitizeStudentTextField('cccd', data.cccd);
  if (!cccd) {
    errors.cccd = 'CCCD/CMND không được để trống';
  } else if (!/^\d{9,12}$/.test(cccd)) {
    errors.cccd = 'CCCD/CMND phải gồm 9-12 chữ số';
  } else {
    const existingByCCCD = await StudentRepo.findStudentByCCCD(c.env.DB, cccd);
    if (existingByCCCD && Number(existingByCCCD.id) !== Number(currentId)) {
      errors.cccd = 'Số CCCD/CMND đã được sử dụng bởi học viên khác';
    }
  }

  const email = sanitizeStudentTextField('email', data.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không hợp lệ';
  }

  const phone = sanitizeStudentTextField('sdt', data.sdt);
  if (phone && !/^(0|\+84)\d{9}$/.test(phone)) {
    errors.sdt = 'Số điện thoại không hợp lệ';
  }

  if ((email || phone) && Object.keys(errors).length === 0) {
    const candidates = await StudentRepo.findStudentByEmailOrPhone(c.env.DB, email || '__empty_email__', phone || '__empty_phone__');
    const duplicateEmail = email && candidates.find((student: any) => student.email === email && Number(student.id) !== Number(currentId));
    const duplicatePhone = phone && candidates.find((student: any) => student.sdt === phone && Number(student.id) !== Number(currentId));
    if (duplicateEmail) errors.email = 'Email đã được sử dụng bởi học viên khác';
    if (duplicatePhone) errors.sdt = 'Số điện thoại đã được sử dụng bởi học viên khác';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
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
  const normalizedCCCD = sanitizeStudentTextField('cccd', cccd);
  const student = await StudentRepo.findStudentByCCCD(c.env.DB, normalizedCCCD);
  if (!student) throw new Error('Không tìm thấy sinh viên');
  const registrations = await StudentRepo.getStudentRegistrations(c.env.DB, student.id);
  const enriched = await enrichStudentWithImages(c, student);
  return { ...enriched, registrations };
}

export async function updateStudentByCCCD(c: any, data: any) {
  const currentCCCD = sanitizeStudentTextField('cccd', data.current_cccd || data.cccd || '');
  if (!currentCCCD) throw new Error('Thiếu CCCD học viên');

  const student = await StudentRepo.findStudentByCCCD(c.env.DB, currentCCCD);
  if (!student) throw new Error('Không tìm thấy sinh viên');

  const nextCCCD = data.cccd !== undefined
    ? sanitizeStudentTextField('cccd', data.cccd)
    : sanitizeStudentTextField('cccd', student.cccd);
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
    updateData.ho_ten_full = buildUpperFullName(
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
  
  const normalizedIncomingCCCD = data.cccd !== undefined ? sanitizeStudentTextField('cccd', data.cccd) : undefined;
  if (normalizedIncomingCCCD && normalizedIncomingCCCD !== sanitizeStudentTextField('cccd', existing.cccd)) {
    if (await StudentRepo.findStudentByCCCD(c.env.DB, normalizedIncomingCCCD)) throw new Error('Số CCCD đã được sử dụng bởi học viên khác');
  }

  const updateData: any = {};
  for (const field of ['cccd', 'ho', 'ten_dem', 'ten', 'noi_sinh', 'dan_toc', 'quoc_tich', 'email', 'sdt', 'dia_chi', 'don_vi_cong_tac', 'image_cccd_front', 'image_cccd_back', 'image_3x4', 'cccd_front_image_id', 'cccd_back_image_id', 'photo_3x4_image_id']) {
    if (data[field] !== undefined) updateData[field] = sanitizeStudentTextField(field, data[field]);
  }
  if (data.ngay_sinh) updateData.ngay_sinh = formatDate(data.ngay_sinh);
  if (data.ngay_cap_cccd) updateData.ngay_cap_cccd = formatDate(data.ngay_cap_cccd);
  if (data.gioi_tinh) updateData.gioi_tinh = normalizeStudentGender(data.gioi_tinh, existing.gioi_tinh);
  
  if (updateData.ho || updateData.ten || updateData.ten_dem !== undefined) {
    updateData.ho_ten_full = buildUpperFullName(updateData.ho || existing.ho, updateData.ten_dem ?? existing.ten_dem ?? '', updateData.ten || existing.ten);
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

export async function normalizeAllStudentsUppercase(c: any, dryRun = false) {
  const students = await StudentRepo.getAllStudents(c.env.DB, null, 0);
  let updated = 0;

  for (const student of students) {
    const normalized: any = {
      cccd: sanitizeStudentTextField('cccd', student.cccd),
      ho: sanitizeStudentTextField('ho', student.ho),
      ten_dem: sanitizeStudentTextField('ten_dem', student.ten_dem || ''),
      ten: sanitizeStudentTextField('ten', student.ten),
      noi_sinh: sanitizeStudentTextField('noi_sinh', student.noi_sinh),
      dan_toc: sanitizeStudentTextField('dan_toc', student.dan_toc || 'KINH') || 'KINH',
      quoc_tich: sanitizeStudentTextField('quoc_tich', student.quoc_tich || 'VIỆT NAM') || 'VIỆT NAM',
      email: sanitizeStudentTextField('email', student.email),
      sdt: sanitizeStudentTextField('sdt', student.sdt),
      dia_chi: sanitizeStudentTextField('dia_chi', student.dia_chi),
      don_vi_cong_tac: sanitizeStudentTextField('don_vi_cong_tac', student.don_vi_cong_tac),
    };
    normalized.ho_ten_full = buildUpperFullName(normalized.ho, normalized.ten_dem || '', normalized.ten);
    normalized.ho_ten_normalized = normalizeText(normalized.ho_ten_full);

    const normalizedGender = normalizeWhitespace(student.gioi_tinh);
    if (normalizedGender) {
      try {
        normalized.gioi_tinh = normalizeStudentGender(student.gioi_tinh);
      } catch {
        normalized.gioi_tinh = toUpperVi(student.gioi_tinh);
      }
    }

    const changedFields = Object.keys(normalized).filter((field) => !valuesEqual(student[field], normalized[field]));
    if (changedFields.length === 0) continue;

    updated += 1;
    if (!dryRun) {
      await StudentRepo.updateStudent(c.env.DB, student.id, normalized);
    }
  }

  return {
    total: students.length,
    updated,
    skipped: students.length - updated,
    dry_run: dryRun,
  };
}
