// ========================================
// EXAM TYPE REPOSITORY
// Handles: getExamTypes, getExamTypeByCode, createExamType
// ========================================

interface CreateExamTypeData {
  code: string;
  name: string;
  description?: string | null;
  language?: string | null;
  icon_url?: string | null;
}

export async function getExamTypes(db: D1Database): Promise<any[]> {
  const result = await db.prepare(`
    SELECT * FROM exam_types
    ORDER BY name ASC
  `).all();
  return result.results || [];
}

export async function getExamTypeByCode(db: D1Database, code: string): Promise<any> {
  const result = await db.prepare(`
    SELECT * FROM exam_types WHERE code = ?
  `).bind(code).first();
  return result;
}

export async function createExamType(db: D1Database, data: CreateExamTypeData): Promise<any> {
  const { code, name, description, language, icon_url } = data;
  const result = await db.prepare(`
    INSERT INTO exam_types (code, name, description, language, icon_url)
    VALUES (?, ?, ?, ?, ?)
  `).bind(code, name, description || null, language || null, icon_url || null).run();
  return result;
}
