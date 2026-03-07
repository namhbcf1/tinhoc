// ========================================
// DATABASE BACKUP UTILITY
// ========================================

/**
 * Export database to JSON format
 */
export async function exportDatabaseToJSON(db: D1Database): Promise<string> {
  try {
    const tables = [
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
    ];

    const data: { export_date: string; version: string; tables: Record<string, unknown[]> } = {
      export_date: new Date().toISOString(),
      version: '1.0',
      tables: {},
    };

    for (const table of tables) {
      try {
        const result = await db.prepare(`SELECT * FROM ${table}`).all();
        data.tables[table] = result.results || [];
      } catch (error) {
        console.error(`Error exporting table ${table}:`, error);
        data.tables[table] = [];
      }
    }

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  }
}

/**
 * Export database to CSV format
 */
export async function exportTableToCSV(db: D1Database, tableName: string): Promise<string> {
  try {
    const result = await db.prepare(`SELECT * FROM ${tableName}`).all();
    const rows = result.results || [];

    if (rows.length === 0) {
      return '';
    }

    // Get column names
    const columns = Object.keys(rows[0] as Record<string, unknown>);

    // Create CSV header
    const header = columns.join(',');

    // Create CSV rows
    const csvRows = (rows as Record<string, unknown>[]).map(row => {
      return columns.map(col => {
        const value = row[col];
        // Escape commas and quotes
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [header, ...csvRows].join('\n');
  } catch (error) {
    console.error(`Error exporting table ${tableName} to CSV:`, error);
    throw error;
  }
}

/**
 * Create backup and save to R2
 */
export async function createBackup(
  db: D1Database,
  r2Bucket: R2Bucket,
  env: unknown
): Promise<{ success: boolean; backupKey: string; timestamp: string; size: number }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `backups/database-${timestamp}.json`;

    // Export database to JSON
    const jsonData = await exportDatabaseToJSON(db);

    // Upload to R2
    await r2Bucket.put(backupKey, jsonData, {
      httpMetadata: {
        contentType: 'application/json',
      },
      customMetadata: {
        'backup-date': new Date().toISOString(),
        'backup-type': 'full',
      },
    });

    // Keep only last 30 backups (optional cleanup)
    // This would require listing R2 objects, which we can do if needed

    return {
      success: true,
      backupKey,
      timestamp,
      size: jsonData.length,
    };
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

/**
 * List available backups
 */
export async function listBackups(r2Bucket: R2Bucket): Promise<{ key: string; size: number; uploaded: Date }[]> {
  try {
    const backups: { key: string; size: number; uploaded: Date }[] = [];
    const objects = await r2Bucket.list({ prefix: 'backups/' });

    for (const object of objects.objects) {
      backups.push({
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
      });
    }

    return backups.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
  } catch (error) {
    console.error('Error listing backups:', error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
export async function restoreFromBackup(
  db: D1Database,
  r2Bucket: R2Bucket,
  backupKey: string
): Promise<{ success: boolean; restored: Record<string, unknown> }> {
  try {
    // Get backup file from R2
    const object = await r2Bucket.get(backupKey);
    if (!object) {
      throw new Error('Backup not found');
    }

    const jsonData = await object.text();
    const backup = JSON.parse(jsonData) as { tables: Record<string, Record<string, unknown>[]> };

    // Restore each table
    const results: Record<string, unknown> = {};
    for (const [tableName, rows] of Object.entries(backup.tables)) {
      if (rows.length === 0) continue;

      try {
        // Clear existing data (optional - be careful!)
        // await db.prepare(`DELETE FROM ${tableName}`).run();

        // Insert data
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.join(', ');

        for (const row of rows) {
          const rowValues = columns.map(col => row[col]);
          await db.prepare(
            `INSERT OR REPLACE INTO ${tableName} (${values}) VALUES (${placeholders})`
          ).bind(...rowValues).run();
        }

        results[tableName] = { inserted: rows.length };
      } catch (error) {
        console.error(`Error restoring table ${tableName}:`, error);
        results[tableName] = { error: (error as Error).message };
      }
    }

    return {
      success: true,
      restored: results,
    };
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}
