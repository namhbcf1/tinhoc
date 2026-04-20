// ========================================
// EXAM TYPE REPOSITORY
// Handles: getExamTypes, getExamTypeByCode, createExamType
// ========================================
export async function getExamTypes(db) {
    const result = await db.prepare(`
    SELECT * FROM exam_types
    ORDER BY name ASC
  `).all();
    return result.results || [];
}
export async function getExamTypeByCode(db, code) {
    const result = await db.prepare(`
    SELECT * FROM exam_types WHERE code = ?
  `).bind(code).first();
    return result;
}
export async function createExamType(db, data) {
    const { code, name, description, language, icon_url } = data;
    const result = await db.prepare(`
    INSERT INTO exam_types (code, name, description, language, icon_url)
    VALUES (?, ?, ?, ?, ?)
  `).bind(code, name, description || null, language || null, icon_url || null).run();
    return result;
}
