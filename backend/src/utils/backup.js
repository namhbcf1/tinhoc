// ========================================
// DATABASE BACKUP UTILITY
// ========================================
function quoteIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
}
export async function listDatabaseTables(db) {
    const result = await db.prepare(`
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table'
        AND (name NOT LIKE 'sqlite_%' OR name = 'sqlite_sequence')
      ORDER BY CASE WHEN name = 'sqlite_sequence' THEN 1 ELSE 0 END, name
    `).all();
    return (result.results || []).map((table) => ({
        name: table.name,
        schema: table.sql ?? null,
    }));
}
async function listBucketInventory(bucketName, bucket) {
    const objects = [];
    let cursor;
    do {
        const page = await bucket.list({ cursor });
        for (const object of page.objects) {
            objects.push({
                key: object.key,
                size: object.size,
                uploaded: object.uploaded.toISOString(),
                etag: object.etag,
                httpEtag: object.httpEtag,
            });
        }
        cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return {
        bucketName,
        objectCount: objects.length,
        objects,
    };
}
/**
 * Export database to JSON format, including every actual table discovered
 * from sqlite_master so backups do not drift behind schema changes.
 */
export async function exportDatabaseToJSON(db) {
    try {
        const tables = await listDatabaseTables(db);
        const data = {
            export_date: new Date().toISOString(),
            version: '2.0',
            table_order: [],
            table_schemas: {},
            tables: {},
        };
        for (const table of tables) {
            try {
                const result = await db.prepare(`SELECT * FROM ${quoteIdentifier(table.name)}`).all();
                data.table_order.push(table.name);
                data.table_schemas[table.name] = table.schema;
                data.tables[table.name] = result.results || [];
            }
            catch (error) {
                console.error(`Error exporting table ${table.name}:`, error);
                data.table_order.push(table.name);
                data.table_schemas[table.name] = table.schema;
                data.tables[table.name] = [];
            }
        }
        return JSON.stringify(data, null, 2);
    }
    catch (error) {
        console.error('Error exporting database:', error);
        throw error;
    }
}
/**
 * Export database to CSV format
 */
export async function exportTableToCSV(db, tableName) {
    try {
        const result = await db.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`).all();
        const rows = result.results || [];
        if (rows.length === 0) {
            return '';
        }
        // Get column names
        const columns = Object.keys(rows[0]);
        // Create CSV header
        const header = columns.join(',');
        // Create CSV rows
        const csvRows = rows.map(row => {
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
    }
    catch (error) {
        console.error(`Error exporting table ${tableName} to CSV:`, error);
        throw error;
    }
}
/**
 * Create backup and save to R2
 */
export async function createBackup(db, r2Bucket, env) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupKey = `backups/database-${timestamp}.json`;
        const manifestKey = `backups/r2-manifest-${timestamp}.json`;
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
        const bucketInventories = [
            await listBucketInventory('vantrangedu-files', r2Bucket),
        ];
        const maybeVideoBucket = env?.VIDEO_BUCKET;
        if (maybeVideoBucket) {
            bucketInventories.push(await listBucketInventory('class-videos', maybeVideoBucket));
        }
        await r2Bucket.put(manifestKey, JSON.stringify({
            export_date: new Date().toISOString(),
            version: '1.0',
            buckets: bucketInventories,
        }, null, 2), {
            httpMetadata: {
                contentType: 'application/json',
            },
            customMetadata: {
                'backup-date': new Date().toISOString(),
                'backup-type': 'r2-manifest',
            },
        });
        // Keep only last 30 backups (optional cleanup)
        // This would require listing R2 objects, which we can do if needed
        return {
            success: true,
            backupKey,
            manifestKey,
            timestamp,
            size: jsonData.length,
        };
    }
    catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    }
}
/**
 * List available backups
 */
export async function listBackups(r2Bucket) {
    try {
        const backups = [];
        const objects = await r2Bucket.list({ prefix: 'backups/' });
        for (const object of objects.objects) {
            backups.push({
                key: object.key,
                size: object.size,
                uploaded: object.uploaded,
            });
        }
        return backups.sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());
    }
    catch (error) {
        console.error('Error listing backups:', error);
        throw error;
    }
}
/**
 * Restore database from backup
 */
export async function restoreFromBackup(db, r2Bucket, backupKey) {
    try {
        // Get backup file from R2
        const object = await r2Bucket.get(backupKey);
        if (!object) {
            throw new Error('Backup not found');
        }
        const jsonData = await object.text();
        const backup = JSON.parse(jsonData);
        // Restore each table
        const results = {};
        const orderedTables = Array.isArray(backup.table_order) && backup.table_order.length > 0
            ? backup.table_order
            : Object.keys(backup.tables);
        for (const tableName of orderedTables) {
            const rows = backup.tables[tableName] || [];
            if (rows.length === 0)
                continue;
            try {
                // Clear existing data (optional - be careful!)
                // await db.prepare(`DELETE FROM ${tableName}`).run();
                // Insert data
                const columns = Object.keys(rows[0]);
                const placeholders = columns.map(() => '?').join(', ');
                const values = columns.map(quoteIdentifier).join(', ');
                for (const row of rows) {
                    const rowValues = columns.map(col => row[col]);
                    await db.prepare(`INSERT OR REPLACE INTO ${quoteIdentifier(tableName)} (${values}) VALUES (${placeholders})`).bind(...rowValues).run();
                }
                results[tableName] = { inserted: rows.length };
            }
            catch (error) {
                console.error(`Error restoring table ${tableName}:`, error);
                results[tableName] = { error: error.message };
            }
        }
        return {
            success: true,
            restored: results,
        };
    }
    catch (error) {
        console.error('Error restoring backup:', error);
        throw error;
    }
}
