import * as StudentRepo from '../repositories/student-repository.js';
import { normalizeText, capitalizeFullName, formatDate, generateJWT } from '../utils/helpers.js';
import { generateMultipleSignedURLs } from '../utils/cloudflare-images.js';

export async function enrichStudentWithImages(c: any, student: any) {
  if (!student) return student;
  const s = { ...student };
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
  
  const token = await generateJWT(
    { id: student.id, cccd: student.cccd, ho_ten: student.ho_ten_full, type: 'student',
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, // 7 days
    c.env.JWT_SECRET
  );
  const registrations = await StudentRepo.getStudentRegistrations(c.env.DB, student.id);
  const enriched = await enrichStudentWithImages(c, student);
  
  return { token, data: { ...enriched, registrations } };
}

export async function registerStudent(c: any, data: any) {
  const existingByCCCD = await StudentRepo.findStudentByCCCD(c.env.DB, data.cccd);
  if (existingByCCCD) throw new Error('Số CCCD/CMT đã được đăng ký. Vui lòng kiểm tra lại!');
  
  const existingByContact = await StudentRepo.findStudentByEmailOrPhone(c.env.DB, data.email, data.sdt);
  if (existingByContact.length > 0) {
    if (existingByContact[0].sdt === data.sdt) throw new Error('Số điện thoại đã được đăng ký.');
    if (existingByContact[0].email === data.email) throw new Error('Email đã được đăng ký.');
  }

  const mapGender = (g: any) => {
    if (!g) return 'Nam';
    const l = String(g).toLowerCase();
    if (l === 'male' || l === 'nam') return 'Nam';
    if (l === 'female' || l === 'nữ' || l === 'nu') return 'Nữ';
    return g;
  };

  const ho_ten_full = capitalizeFullName(data.ho, data.ten_dem || '', data.ten);
  const studentData = {
    ...data,
    cccd: data.cccd.trim(),
    ho_ten_full,
    ho_ten_normalized: normalizeText(ho_ten_full),
    ngay_sinh: formatDate(data.ngay_sinh),
    gioi_tinh: mapGender(data.gioi_tinh),
    dan_toc: data.dan_toc ? data.dan_toc.trim() : 'Kinh',
    quoc_tich: data.quoc_tich ? data.quoc_tich.trim() : 'Việt Nam',
    email: data.email.trim().toLowerCase(),
    ngay_cap_cccd: data.ngay_cap_cccd ? formatDate(data.ngay_cap_cccd) : null,
  };

  const studentId = await StudentRepo.createStudent(c.env.DB, studentData);
  const token = await generateJWT(
    { id: studentId, cccd: studentData.cccd, ho_ten: studentData.ho_ten_full, type: 'student',
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }, // 7 days
    c.env.JWT_SECRET
  );
  
  return { token, student_id: studentId, data: { id: studentId, ...studentData } };
}

export async function getStudentsList(c: any, limit: number, offset: number, page: number = 1) {
  // Run count + data queries in parallel to avoid sequential round-trips
  const [total, list] = await Promise.all([
    StudentRepo.countAllStudents(c.env.DB),
    StudentRepo.getAllStudents(c.env.DB, limit, offset),
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
  const student = await StudentRepo.findStudentByCCCD(c.env.DB, data.cccd);
  if (!student) throw new Error('Không tìm thấy sinh viên');

  const updateData: any = {};
  for (const field of ['ho', 'ten_dem', 'ten', 'noi_sinh', 'dan_toc', 'quoc_tich', 'email', 'sdt', 'dia_chi', 'don_vi_cong_tac', 'image_cccd_front', 'image_cccd_back', 'image_3x4', 'cccd_front_image_id', 'cccd_back_image_id', 'photo_3x4_image_id']) {
    if (data[field] !== undefined) updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
  }
  if (data.ngay_sinh) updateData.ngay_sinh = formatDate(data.ngay_sinh);
  if (data.ngay_cap_cccd) updateData.ngay_cap_cccd = formatDate(data.ngay_cap_cccd);
  if (data.gioi_tinh) {
    const g = String(data.gioi_tinh).toLowerCase();
    updateData.gioi_tinh = (g === 'male' || g === 'nam') ? 'Nam' : (g === 'female' || g === 'nữ' || g === 'nu') ? 'Nữ' : data.gioi_tinh;
  }
  
  if (updateData.ho || updateData.ten || updateData.ten_dem !== undefined) {
    updateData.ho_ten_full = capitalizeFullName(updateData.ho || student.ho, updateData.ten_dem ?? student.ten_dem ?? '', updateData.ten || student.ten);
    updateData.ho_ten_normalized = normalizeText(updateData.ho_ten_full);
  }

  for (const field of Object.keys(updateData)) {
    if (student[field] !== updateData[field]) {
      await StudentRepo.logStudentEditHistory(c.env.DB, {
        student_id: student.id, admin_id: null, changed_by_type: 'student', field_name: field,
        old_value: student[field], new_value: updateData[field],
        ip_address: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || null,
        user_agent: c.req.header('User-Agent') || null
      });
    }
  }

  await StudentRepo.updateStudent(c.env.DB, student.id, updateData);
  const updatedStudent = await StudentRepo.findStudentByCCCD(c.env.DB, data.cccd);
  const registrations = await StudentRepo.getStudentRegistrations(c.env.DB, student.id);
  const enriched = await enrichStudentWithImages(c, updatedStudent);
  return { ...enriched, registrations };
}

export async function updateStudentAdmin(c: any, id: number, data: any) {
  const existing = await StudentRepo.getStudentById(c.env.DB, id);
  if (!existing) throw new Error('Không tìm thấy học viên');
  
  if (data.cccd && data.cccd !== existing.cccd) {
    if (await StudentRepo.findStudentByCCCD(c.env.DB, data.cccd)) throw new Error('Số CCCD đã được sử dụng bởi học viên khác');
  }

  const updateData: any = {};
  for (const field of ['cccd', 'ho', 'ten_dem', 'ten', 'noi_sinh', 'dan_toc', 'quoc_tich', 'email', 'sdt', 'dia_chi', 'don_vi_cong_tac', 'image_cccd_front', 'image_cccd_back', 'image_3x4', 'cccd_front_image_id', 'cccd_back_image_id', 'photo_3x4_image_id']) {
    if (data[field] !== undefined) updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
  }
  if (data.ngay_sinh) updateData.ngay_sinh = formatDate(data.ngay_sinh);
  if (data.ngay_cap_cccd) updateData.ngay_cap_cccd = formatDate(data.ngay_cap_cccd);
  if (data.gioi_tinh) updateData.gioi_tinh = data.gioi_tinh;
  
  if (updateData.ho || updateData.ten || updateData.ten_dem !== undefined) {
    updateData.ho_ten_full = capitalizeFullName(updateData.ho || existing.ho, updateData.ten_dem ?? existing.ten_dem ?? '', updateData.ten || existing.ten);
    updateData.ho_ten_normalized = normalizeText(updateData.ho_ten_full);
  }

  const user = c.get('user');
  const adminId = user?.type === 'admin' ? user.id : null;

  for (const field of Object.keys(updateData)) {
    if (existing[field] !== updateData[field]) {
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
