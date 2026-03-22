// ========================================
// EXAM SECTION REPOSITORY
// Handles: createSection, updateSection, deleteSection, completeSection
// ========================================

interface SectionData {
  name: string;
  description?: string;
  time_limit_minutes?: number;
  order_index: number;
  instructions?: string;
  is_locked_after_complete?: boolean;
  scoring_rule?: string;
}

export async function createSection(db: D1Database, testId: number | string, data: SectionData): Promise<any> {
  const {
    name, description, time_limit_minutes, order_index,
    instructions, is_locked_after_complete, scoring_rule
  } = data;

  const result = await db.prepare(`
    INSERT INTO exam_sections (
      test_id, name, description, time_limit_minutes, order_index,
      instructions, is_locked_after_complete, scoring_rule
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    testId, name, description, time_limit_minutes, order_index,
    instructions, is_locked_after_complete ? 1 : 0, scoring_rule || 'points_based'
  ).run();

  return result;
}

export async function updateSection(db: D1Database, sectionId: number | string, data: Record<string, any>): Promise<any> {
  const updates: string[] = [];
  const params: any[] = [];

  Object.keys(data).forEach(key => {
    if (key !== 'id' && data[key] !== undefined) {
      updates.push(`${key} = ?`);
      if (typeof data[key] === 'boolean') {
        params.push(data[key] ? 1 : 0);
      } else {
        params.push(data[key]);
      }
    }
  });

  if (updates.length === 0) return { meta: { changes: 0 } };

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(sectionId);

  const result = await db.prepare(`
    UPDATE exam_sections SET ${updates.join(', ')} WHERE id = ?
  `).bind(...params).run();

  return result;
}

export async function deleteSection(db: D1Database, sectionId: number | string): Promise<any> {
  const result = await db.prepare(`
    DELETE FROM exam_sections WHERE id = ?
  `).bind(sectionId).run();
  return result;
}

export async function completeSection(db: D1Database, attemptId: number | string, sectionId: number | string): Promise<any> {
  const section = await db.prepare(`
    SELECT * FROM exam_sections WHERE id = ?
  `).bind(sectionId).first<any>();

  if (!section) throw new Error('Section not found');

  const now = new Date().toISOString();
  const isLocked = section.is_locked_after_complete ? 1 : 0;

  const result = await db.prepare(`
    UPDATE exam_attempt_sections
    SET completed_at = ?, is_locked = ?
    WHERE attempt_id = ? AND section_id = ?
  `).bind(now, isLocked, attemptId, sectionId).run();

  return result;
}
