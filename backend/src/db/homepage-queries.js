// ========================================
// HOMEPAGE SETTINGS QUERIES
// ========================================
/**
 * Lay tat ca cai dat homepage
 * Returns object voi key-value pairs
 */
export async function getHomepageSettings(db) {
    const { results } = await db.prepare(`
    SELECT setting_key, setting_value, value_type
    FROM homepage_settings
  `).all();
    // Convert to object
    const settings = {};
    for (const row of results || []) {
        // Parse value based on type
        let value = row.setting_value;
        if (row.value_type === 'boolean') {
            value = value === 'true' || value === '1';
        }
        else if (row.value_type === 'number') {
            value = parseFloat(row.setting_value);
        }
        else if (row.value_type === 'json') {
            try {
                value = JSON.parse(row.setting_value);
            }
            catch (e) {
                console.error('Error parsing JSON setting:', e);
            }
        }
        settings[row.setting_key] = value;
    }
    return settings;
}
/**
 * Lay mot cai dat cu the
 */
export async function getHomepageSetting(db, key) {
    const row = await db.prepare(`
    SELECT setting_key, setting_value, value_type
    FROM homepage_settings
    WHERE setting_key = ?
  `).bind(key).first();
    if (!row) {
        return null;
    }
    let value = row.setting_value;
    if (row.value_type === 'boolean') {
        value = value === 'true' || value === '1';
    }
    else if (row.value_type === 'number') {
        value = parseFloat(row.setting_value);
    }
    else if (row.value_type === 'json') {
        try {
            value = JSON.parse(row.setting_value);
        }
        catch (e) {
            console.error('Error parsing JSON setting:', e);
        }
    }
    return {
        key: row.setting_key,
        value: value,
        type: row.value_type
    };
}
/**
 * Cap nhat nhieu cai dat cung luc
 */
export async function updateHomepageSettings(db, settings) {
    // Use transaction for multiple updates
    const statements = [];
    for (const [key, value] of Object.entries(settings)) {
        // Determine value type
        let valueType = 'string';
        let stringValue = String(value);
        if (typeof value === 'boolean') {
            valueType = 'boolean';
            stringValue = value ? 'true' : 'false';
        }
        else if (typeof value === 'number') {
            valueType = 'number';
            stringValue = String(value);
        }
        else if (typeof value === 'object') {
            valueType = 'json';
            stringValue = JSON.stringify(value);
        }
        statements.push(db.prepare(`
        INSERT INTO homepage_settings (setting_key, setting_value, value_type, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          value_type = excluded.value_type,
          updated_at = excluded.updated_at
      `).bind(key, stringValue, valueType));
    }
    // Execute all statements
    for (const stmt of statements) {
        await stmt.run();
    }
    return true;
}
/**
 * Cap nhat mot cai dat cu the
 */
export async function setHomepageSetting(db, key, value) {
    // Determine value type
    let valueType = 'string';
    let stringValue = String(value);
    if (typeof value === 'boolean') {
        valueType = 'boolean';
        stringValue = value ? 'true' : 'false';
    }
    else if (typeof value === 'number') {
        valueType = 'number';
        stringValue = String(value);
    }
    else if (typeof value === 'object') {
        valueType = 'json';
        stringValue = JSON.stringify(value);
    }
    const result = await db.prepare(`
    INSERT INTO homepage_settings (setting_key, setting_value, value_type, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      value_type = excluded.value_type,
      updated_at = excluded.updated_at
  `).bind(key, stringValue, valueType).run();
    if (!result.success) {
        throw new Error('Cannot update setting');
    }
    return true;
}
/**
 * Xoa mot cai dat
 */
export async function deleteHomepageSetting(db, key) {
    const result = await db.prepare(`
    DELETE FROM homepage_settings WHERE setting_key = ?
  `).bind(key).run();
    if (!result.success) {
        throw new Error('Cannot delete setting');
    }
    return true;
}
