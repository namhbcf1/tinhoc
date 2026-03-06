import * as DocRepo from '../repositories/document-repository.js';
import { findStudentByCCCD } from '../repositories/student-repository.js';

export async function uploadDocument(c: any, form: any, file: File, user: any) {
  if (!form.title || !file) throw new Error('Thiếu title hoặc file');
  if (file.size > 1024 * 1024 * 1024) throw new Error('File quá lớn. Kích thước tối đa là 1GB');
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeTypes: any = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4' };
  const fileType = file.type && file.type !== 'application/octet-stream' ? file.type : (mimeTypes[ext] || 'application/octet-stream');
  
  const r2Key = `documents/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await c.env.R2.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: fileType, cacheControl: 'public, max-age=31536000' } });
  
  let docId;
  try {
    docId = await DocRepo.createDocument(c.env.DB, {
      title: form.title, description: form.description, file_name: file.name, file_size: file.size, file_type: fileType,
      r2_key: r2Key, uploaded_by: user.id || null, folder_id: form.folder_id ? parseInt(form.folder_id) : null,
      visibility: form.visibility || 'internal', doc_type: form.doc_type || 'general', valid_from: form.valid_from, valid_until: form.valid_until
    });
  } catch (e) {
    await c.env.R2.delete(r2Key).catch(() => {});
    throw new Error('Lỗi lưu database: ' + e.message);
  }

  let access_type = form.access_type || 'public';
  let class_ids = form.class_ids;
  if (form.class_id && !class_ids) { class_ids = form.class_id; access_type = 'class'; }

  if (access_type === 'public') {
    await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'public' });
  } else if (access_type === 'class') {
    if (form.online_class_id) {
      await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'class', online_class_id: parseInt(form.online_class_id) });
    } else if (class_ids) {
      const clsIds = typeof class_ids === 'string' ? JSON.parse(class_ids.includes('[') ? class_ids : `[${class_ids}]`) : (Array.isArray(class_ids) ? class_ids : [class_ids]);
      for (const cid of clsIds) {
        await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'class', class_id: parseInt(cid) });
      }
    }
  } else if (access_type === 'student') {
    if (form.cccd) {
      const student = await findStudentByCCCD(c.env.DB, form.cccd);
      if (student) await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'student', student_id: student.id });
    }
    if (form.student_ids) {
      const stIds = typeof form.student_ids === 'string' ? JSON.parse(form.student_ids) : form.student_ids;
      for (const sid of stIds) {
        await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'student', student_id: parseInt(sid) });
      }
    }
  } else if (access_type === 'admin') {
    await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'admin' });
  }

  return { document_id: docId };
}

export async function shareDocumentIntoClasses(c: any, id: number, targets: any[], user: any) {
  const doc = await DocRepo.getDocumentById(c.env.DB, id);
  if (!doc) throw new Error('Tài liệu không tồn tại');
  
  const role = user?.role === 'teacher' ? 'teacher' : 'admin';
  for (const t of targets) {
    if (['online_class', 'offline_class'].includes(t.type) && !Number.isNaN(parseInt(t.id))) {
      await DocRepo.shareDocument(c.env.DB, id, t.type, parseInt(t.id), role, user?.id ? String(user.id) : null);
    }
  }
}

export async function unshareDocument(c: any, id: number, type: string, targetId: number) {
  if (!['online_class', 'offline_class'].includes(type) || Number.isNaN(targetId)) throw new Error('Target không hợp lệ');
  await DocRepo.unshareDocument(c.env.DB, id, type, targetId);
}

export async function getStudentDocuments(c: any, student_id: any, class_ids: number[]) {
  if (!student_id) throw new Error('Thiếu student_id');
  let student;
  if (typeof student_id === 'number' || /^\d+$/.test(student_id)) {
    student = await c.env.DB.prepare('SELECT id, cccd FROM students WHERE id = ?').bind(parseInt(student_id)).first();
  } else {
    student = await findStudentByCCCD(c.env.DB, student_id);
  }
  if (!student) throw new Error('Không tìm thấy học viên');
  return await DocRepo.getDocumentsForStudent(c.env.DB, student.id, class_ids || []);
}

export async function getDocumentsByCCCD(c: any, cccd: string) {
  const student = await findStudentByCCCD(c.env.DB, cccd);
  if (!student) return [];
  return await DocRepo.getDocumentsForStudent(c.env.DB, student.id, []);
}

export async function processDocumentDownload(c: any, id: number, studentId?: string) {
  const doc = await DocRepo.getDocumentById(c.env.DB, id);
  if (!doc) throw new Error('Tài liệu không tồn tại');
  
  if (studentId) {
    DocRepo.recordDocumentDownload(c.env.DB, id, parseInt(studentId), c.req.header('CF-Connecting-IP') || 'unknown', c.req.header('User-Agent') || 'unknown').catch(() => {});
  }
  
  const keysToTry = [doc.r2_key, doc.file_url, (doc.r2_key && !String(doc.r2_key).startsWith('documents/')) ? `documents/${doc.r2_key}` : null].filter(Boolean);
  let object = null;
  for (const key of keysToTry) {
    object = await c.env.R2.get(key);
    if (object) break;
  }
  if (!object) throw new Error('File không tồn tại trong storage');
  return { object, doc };
}

export async function deleteDocument(c: any, id: number) {
  const doc = await DocRepo.getDocumentById(c.env.DB, id);
  if (!doc) throw new Error('Tài liệu không tồn tại');
  if (doc.r2_key) await c.env.R2.delete(doc.r2_key).catch(() => {});
  await DocRepo.deleteDocument(c.env.DB, id);
}
