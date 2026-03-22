import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse, verifyJWT } from '../utils/helpers.js';

const folders = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// Auth middleware (admin/teacher)
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return errorResponse('Thiếu token xác thực', 401);
  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return errorResponse('Token không hợp lệ', 401);
  c.set('user', payload);
  await next();
};

function isAdmin(user: any) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

// GET /document-folders?scope=shared|private
folders.get('/', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user') as any;
    const scope = (c.req.query('scope') || 'shared').toLowerCase();

    if (scope === 'shared') {
      // Admin can see all shared; teacher can also see shared
      const rows = await db.prepare(`
        SELECT * FROM document_folders
        WHERE folder_type = 'shared'
        ORDER BY parent_id ASC, name ASC
      `).all();
      const list = rows.results || [];
      // Seed default shared root if empty
      if (list.length === 0) {
        await db.prepare(`
          INSERT INTO document_folders (name, parent_id, folder_type, owner_role, owner_id, created_by_admin_id)
          VALUES (?, NULL, 'shared', 'admin', NULL, ?)
        `).bind('Tài liệu chung', isAdmin(user) ? String(user.id) : null).run();
        const rows2 = await db.prepare(`
          SELECT * FROM document_folders
          WHERE folder_type = 'shared'
          ORDER BY parent_id ASC, name ASC
        `).all();
        return jsonResponse({ success: true, data: rows2.results || [] });
      }
      return jsonResponse({ success: true, data: list });
    }

    // private scope
    if (isAdmin(user)) {
      const rows = await db.prepare(`
        SELECT * FROM document_folders
        WHERE folder_type = 'private'
        ORDER BY parent_id ASC, name ASC
      `).all();
      const list = rows.results || [];
      // Seed one admin-private root if empty
      if (list.length === 0) {
        await db.prepare(`
          INSERT INTO document_folders (name, parent_id, folder_type, owner_role, owner_id, created_by_admin_id)
          VALUES (?, NULL, 'private', 'admin', ?, ?)
        `).bind('Private (Admin)', String(user.id), String(user.id)).run();
        const rows2 = await db.prepare(`
          SELECT * FROM document_folders
          WHERE folder_type = 'private'
          ORDER BY parent_id ASC, name ASC
        `).all();
        return jsonResponse({ success: true, data: rows2.results || [] });
      }
      return jsonResponse({ success: true, data: list });
    }

    // teacher private (owner)
    const rows = await db.prepare(`
      SELECT * FROM document_folders
      WHERE folder_type = 'private' AND owner_role = 'teacher' AND owner_id = ?
      ORDER BY parent_id ASC, name ASC
    `).bind(String(user.id)).all();
    const list = rows.results || [];
    // Seed teacher private root if empty
    if (list.length === 0) {
      await db.prepare(`
        INSERT INTO document_folders (name, parent_id, folder_type, owner_role, owner_id, created_by_admin_id)
        VALUES (?, NULL, 'private', 'teacher', ?, NULL)
      `).bind(`Private (GV ${user.id})`, String(user.id)).run();
      const rows2 = await db.prepare(`
        SELECT * FROM document_folders
        WHERE folder_type = 'private' AND owner_role = 'teacher' AND owner_id = ?
        ORDER BY parent_id ASC, name ASC
      `).bind(String(user.id)).all();
      return jsonResponse({ success: true, data: rows2.results || [] });
    }
    return jsonResponse({ success: true, data: list });
  } catch (e: any) {
    return errorResponse('Lỗi server: ' + e.message, 500);
  }
});

// POST /document-folders
folders.post('/', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user') as any;
    const body = await c.req.json();
    const { name, parent_id = null, folder_type = 'shared', owner_role = null, owner_id = null } = body || {};

    if (!name) return errorResponse('Thiếu name', 400);

    // RBAC
    if (folder_type === 'shared' && !isAdmin(user)) {
      return errorResponse('Chỉ admin mới tạo được folder chung', 403);
    }
    if (folder_type === 'private') {
      // teacher can only create their own private folders
      if (!isAdmin(user)) {
        if (owner_role && owner_role !== 'admin') return errorResponse('owner_role không hợp lệ', 400);
        if (owner_id && String(owner_id) !== String(user.id)) return errorResponse('Không có quyền', 403);
      }
    }

    const createdByAdminId = isAdmin(user) ? String(user.id) : null;
    const finalOwnerRole = folder_type === 'private' ? (owner_role || 'admin') : null;
    const finalOwnerId = folder_type === 'private' ? (owner_id ? String(owner_id) : String(user.id)) : null;

    const res = await db.prepare(`
      INSERT INTO document_folders (name, parent_id, folder_type, owner_role, owner_id, created_by_admin_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      name,
      parent_id ? parseInt(parent_id) : null,
      folder_type,
      finalOwnerRole,
      finalOwnerId,
      createdByAdminId
    ).run();

    return jsonResponse({ success: true, id: res.meta.last_row_id }, 201);
  } catch (e: any) {
    return errorResponse('Lỗi server: ' + e.message, 500);
  }
});

// PUT /document-folders/:id
folders.put('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user') as any;
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { name, parent_id } = body || {};

    const existing = await db.prepare(`SELECT * FROM document_folders WHERE id = ?`).bind(id).first();
    if (!existing) return errorResponse('Folder không tồn tại', 404);

    // RBAC: shared only admin; private only owner or admin
    if (existing.folder_type === 'shared' && !isAdmin(user)) return errorResponse('Không có quyền', 403);
    if (existing.folder_type === 'private' && !isAdmin(user)) {
      if (String(existing.owner_id) !== String(user.id) || !['admin', 'teacher'].includes(existing.owner_role as string)) return errorResponse('Không có quyền', 403);
    }

    await db.prepare(`
      UPDATE document_folders
      SET name = COALESCE(?, name),
          parent_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(name || null, parent_id === undefined ? existing.parent_id : (parent_id ? parseInt(parent_id) : null), id).run();

    return jsonResponse({ success: true });
  } catch (e: any) {
    return errorResponse('Lỗi server: ' + e.message, 500);
  }
});

// DELETE /document-folders/:id
folders.delete('/:id', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user') as any;
    const id = parseInt(c.req.param('id'));

    const existing = await db.prepare(`SELECT * FROM document_folders WHERE id = ?`).bind(id).first();
    if (!existing) return errorResponse('Folder không tồn tại', 404);

    if (existing.folder_type === 'shared' && !isAdmin(user)) return errorResponse('Không có quyền', 403);
    if (existing.folder_type === 'private' && !isAdmin(user)) {
      if (String(existing.owner_id) !== String(user.id) || !['admin', 'teacher'].includes(existing.owner_role as string)) return errorResponse('Không có quyền', 403);
    }

    // Prevent delete if has children
    const child = await db.prepare(`SELECT id FROM document_folders WHERE parent_id = ? LIMIT 1`).bind(id).first();
    if (child) return errorResponse('Folder còn folder con, không thể xóa', 400);

    // Prevent delete if documents exist in folder
    const doc = await db.prepare(`SELECT id FROM documents WHERE folder_id = ? LIMIT 1`).bind(id).first();
    if (doc) return errorResponse('Folder còn tài liệu, không thể xóa', 400);

    await db.prepare(`DELETE FROM document_folders WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true });
  } catch (e: any) {
    return errorResponse('Lỗi server: ' + e.message, 500);
  }
});

export default folders;

