import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import { requireAdmin } from '../middleware/auth-middleware.js';
import {
  exportDatabaseToJSON,
  exportTableToCSV,
  createBackup,
  listBackups,
  restoreFromBackup,
} from '../utils/backup.js';

const backup = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// ========================================
// SECURITY: Whitelist of all valid table names
// Table names cannot be parameterized in SQL — must validate against whitelist
// ========================================
const ALLOWED_TABLES = new Set([
  // Core registration data
  'students',
  'classes',
  'registrations',
  'payments',
  'certificates',
  // Admin & auth
  'admins',
  'password_reset_tokens',
  'admin_activity_logs',
  // Content
  'posts',
  'documents',
  'document_folders',
  'document_permissions',
  'document_downloads',
  'notifications',
  // Teachers & scheduling
  'teachers',
  'class_teachers',
  'class_schedules',
  'attendance',
  // Assignments
  'assignments',
  'assignment_submissions',
  // Exam system
  'exam_tests',
  'exam_questions',
  'exam_answers',
  'exam_attempts',
  'exam_attempt_answers',
  'exam_schedules',
  // Online classes / videos
  'online_classes',
  'class_videos',
  'video_views',
  // Messaging
  'messages',
  'message_threads',
  // VSTEP
  'vstep_tests',
  'vstep_questions',
  'vstep_attempts',
]);

// ========================================
// SECURITY: Allowed column name pattern (alphanumeric + underscore only)
// Used to validate column names from restore JSON before SQL insertion
// ========================================
const SAFE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a table name is in the whitelist.
 * Returns error response if invalid, otherwise calls next().
 */
function validateTableName(tableName: string): Response | null {
  if (!tableName || typeof tableName !== 'string') {
    return errorResponse('Tên bảng không hợp lệ', 400);
  }
  if (!ALLOWED_TABLES.has(tableName)) {
    return errorResponse(`Bảng "${tableName}" không tồn tại hoặc không được phép truy cập`, 400);
  }
  return null; // valid
}

/**
 * Validate that all column names in a row object are safe identifiers.
 * Returns error response if any column name is invalid.
 */
function validateColumnNames(columns: string[]): Response | null {
  for (const col of columns) {
    if (!SAFE_IDENTIFIER_RE.test(col)) {
      return errorResponse(`Tên cột không hợp lệ trong dữ liệu backup: "${col}"`, 400);
    }
  }
  return null; // valid
}

/**
 * Validate all table and column names in a backup JSON object.
 * Returns error response if any name is unsafe.
 */
function validateBackupData(backupData: any): Response | null {
  if (!backupData || typeof backupData.tables !== 'object') {
    return errorResponse('Dữ liệu backup không hợp lệ', 400);
  }

  for (const [tableName, rows] of Object.entries(backupData.tables)) {
    // Validate table name against whitelist
    const tableError = validateTableName(tableName);
    if (tableError) return tableError;

    // Validate column names in the first row (representative of all rows)
    if (Array.isArray(rows) && rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const colError = validateColumnNames(columns);
      if (colError) return colError;
    }
  }

  return null; // valid
}

// ========================================
// Apply requireAdmin middleware to ALL backup routes
// Backup operations are super-sensitive — require admin or super_admin
// ========================================
backup.use('*', requireAdmin);

// ========================================
// GET /backup/export/json - Export database to JSON
// ========================================
backup.get('/export/json', async (c) => {
  try {
    const user = c.get('user') as any;

    // Only super_admin can export database
    if (user.role !== 'super_admin') {
      return errorResponse('Chỉ super admin mới có quyền xuất database', 403);
    }

    const jsonData = await exportDatabaseToJSON(c.env.DB);

    return new Response(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    return errorResponse('Lỗi xuất database', 500);
  }
});

// ========================================
// GET /backup/export/csv/:table - Export table to CSV
// SECURITY: table name validated against ALLOWED_TABLES whitelist before SQL use
// ========================================
backup.get('/export/csv/:table', async (c) => {
  try {
    const user = c.get('user') as any;

    if (user.role !== 'super_admin') {
      return errorResponse('Chỉ super admin mới có quyền xuất dữ liệu', 403);
    }

    const { table } = c.req.param();

    // Whitelist validation — prevents SQL injection via table name
    const validationError = validateTableName(table);
    if (validationError) return validationError;

    const csvData = await exportTableToCSV(c.env.DB, table);

    return new Response(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return errorResponse('Lỗi xuất CSV', 500);
  }
});

// ========================================
// POST /backup/create - Create backup
// ========================================
backup.post('/create', async (c) => {
  try {
    const user = c.get('user') as any;

    if (user.role !== 'super_admin') {
      return errorResponse('Chỉ super admin mới có quyền tạo backup', 403);
    }

    const result = await createBackup(c.env.DB, c.env.R2, c.env);

    return jsonResponse({
      success: true,
      message: 'Tạo backup thành công',
      data: result,
    });
  } catch (error: any) {
    return errorResponse('Lỗi tạo backup', 500);
  }
});

// ========================================
// GET /backup/list - List backups
// ========================================
backup.get('/list', async (c) => {
  try {
    const user = c.get('user') as any;

    if (user.role !== 'super_admin') {
      return errorResponse('Chỉ super admin mới có quyền xem backups', 403);
    }

    const backups = await listBackups(c.env.R2);

    return jsonResponse({
      success: true,
      data: backups,
    });
  } catch (error: any) {
    return errorResponse('Lỗi lấy danh sách backup', 500);
  }
});

// ========================================
// POST /backup/restore/:key - Restore from backup
// SECURITY: validates ALL table names and column names from backup JSON
// before any SQL execution to prevent injection via malicious backup files
// ========================================
backup.post('/restore/:key', async (c) => {
  try {
    const user = c.get('user') as any;

    if (user.role !== 'super_admin') {
      return errorResponse('Chỉ super admin mới có quyền restore backup', 403);
    }

    const { key } = c.req.param();
    const decodedKey = decodeURIComponent(key);

    // Fetch and parse the backup file from R2 for pre-validation
    const object = await c.env.R2.get(decodedKey);
    if (!object) {
      return errorResponse('Không tìm thấy file backup', 404);
    }

    let backupData;
    try {
      const jsonText = await object.text();
      backupData = JSON.parse(jsonText);
    } catch {
      return errorResponse('File backup không đúng định dạng JSON', 400);
    }

    // Validate ALL table names and column names before restoring
    // This prevents SQL injection via a maliciously crafted backup file
    const dataValidationError = validateBackupData(backupData);
    if (dataValidationError) return dataValidationError;

    const result = await restoreFromBackup(c.env.DB, c.env.R2, decodedKey);

    return jsonResponse({
      success: true,
      message: 'Restore backup thành công',
      data: result,
    });
  } catch (error: any) {
    return errorResponse('Lỗi restore backup', 500);
  }
});

export default backup;
