import * as DocRepo from '../repositories/document-repository.js';
import { findStudentByCCCD } from '../repositories/student-repository.js';
import { getStudentRegistrations } from '../repositories/student-repository.js';

export async function uploadDocument(c: any, form: any, file: File, user: any) {
  if (!form.title || !file) throw new Error('Thiếu title hoặc file');
  if (file.size > 1024 * 1024 * 1024) throw new Error('File quá lớn. Kích thước tối đa là 1GB');
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4' };
  const fileType = file.type && file.type !== 'application/octet-stream' ? file.type : ((ext ? mimeTypes[ext] : null) || 'application/octet-stream');
  
  const r2Key = `documents/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await c.env.R2.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: fileType, cacheControl: 'public, max-age=31536000' } });

  let canonicalRefs = {
    organizer_uuid: null as string | null,
    program_uuid: null as string | null,
    level_uuid: null as string | null,
    custom_field_payload: null as string | null,
    override_payload: null as string | null,
  };

  const parseIds = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => parseInt(String(item), 10)).filter((item) => Number.isFinite(item));
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => parseInt(String(item), 10)).filter((item) => Number.isFinite(item));
        }
      } catch {
        return value
          .split(',')
          .map((item) => parseInt(item.trim(), 10))
          .filter((item) => Number.isFinite(item));
      }
    }
    const single = parseInt(String(value), 10);
    return Number.isFinite(single) ? [single] : [];
  };

  const onlineClassIds = parseIds(form.online_class_ids);
  const onlineClassId = form.online_class_id
    ? parseInt(form.online_class_id, 10)
    : (onlineClassIds[0] ?? null);
  if (onlineClassId && Number.isFinite(onlineClassId)) {
    const classRow = await c.env.DB.prepare(`
      SELECT organizer_uuid, program_uuid, level_uuid, custom_field_payload, override_payload
      FROM online_classes
      WHERE id = ?
      LIMIT 1
    `).bind(onlineClassId).first() as any;

    if (classRow) {
      canonicalRefs = {
        organizer_uuid: classRow.organizer_uuid || null,
        program_uuid: classRow.program_uuid || null,
        level_uuid: classRow.level_uuid || null,
        custom_field_payload: classRow.custom_field_payload || null,
        override_payload: classRow.override_payload || null,
      };
    }
  }
  
  let docId;
  try {
    docId = await DocRepo.createDocument(c.env.DB, {
      title: form.title, description: form.description, file_name: file.name, file_size: file.size, file_type: fileType,
      r2_key: r2Key, uploaded_by: user.id || null, folder_id: form.folder_id ? parseInt(form.folder_id) : null,
      visibility: form.visibility || 'internal', doc_type: form.doc_type || 'general', valid_from: form.valid_from, valid_until: form.valid_until,
      ...canonicalRefs
    });
  } catch (e: any) {
    await c.env.R2.delete(r2Key).catch(() => {});
    throw new Error('Lỗi lưu database: ' + e.message);
  }

  let access_type = form.access_type || 'public';
  let class_ids = form.class_ids;
  if (form.class_id && !class_ids) { class_ids = form.class_id; access_type = 'class'; }

  if (access_type === 'public') {
    await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'public' });
  } else if (access_type === 'class') {
    const explicitOnlineClassIds = new Set([
      ...onlineClassIds,
      ...(form.online_class_id ? [parseInt(form.online_class_id, 10)] : []),
    ].filter((item) => Number.isFinite(item)));

    for (const classId of explicitOnlineClassIds) {
      await DocRepo.createDocumentPermission(c.env.DB, {
        document_id: docId,
        permission_type: 'class',
        online_class_id: classId,
      });
    }

    if (class_ids) {
      const clsIds = typeof class_ids === 'string' ? JSON.parse(class_ids.includes('[') ? class_ids : `[${class_ids}]`) : (Array.isArray(class_ids) ? class_ids : [class_ids]);
      for (const cid of clsIds) {
        const offlineClassId = parseInt(cid, 10);
        if (!Number.isFinite(offlineClassId)) continue;
        await DocRepo.createDocumentPermission(c.env.DB, { document_id: docId, permission_type: 'class', class_id: offlineClassId });
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
  
  const role = 'admin';
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

  const registrations = await getStudentRegistrations(c.env.DB, student.id);
  const classIds = Array.from(new Set(
    (registrations || [])
      .filter((registration: any) => registration?.class_type !== 'thi')
      .map((registration: any) => Number.parseInt(String(registration.class_id), 10))
      .filter((classId: number) => Number.isFinite(classId))
  ));

  return await DocRepo.getDocumentsForStudent(c.env.DB, student.id, classIds);
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
