function normalizeNullableText(value: unknown) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNullableInteger(value: unknown) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function ensureClassExists(db: D1Database, classId: number) {
  const row = await db
    .prepare('SELECT id FROM classes WHERE id = ? LIMIT 1')
    .bind(classId)
    .first<{ id: number }>();

  if (!row) {
    throw new Error('Không tìm thấy lớp học');
  }
}

async function getSessionById(db: D1Database, classId: number, sessionId: number) {
  const row = await db
    .prepare(
      `
        SELECT
          sessions.*,
          teachers.ho_ten as teacher_name
        FROM class_sessions sessions
        LEFT JOIN teachers ON teachers.id = sessions.teacher_id
        WHERE sessions.class_id = ?
          AND sessions.id = ?
        LIMIT 1
      `
    )
    .bind(classId, sessionId)
    .first<Record<string, unknown>>();

  return row || null;
}

export async function listClassSessions(db: D1Database, classId: number) {
  await ensureClassExists(db, classId);

  const result = await db
    .prepare(
      `
        SELECT
          sessions.*,
          teachers.ho_ten as teacher_name
        FROM class_sessions sessions
        LEFT JOIN teachers ON teachers.id = sessions.teacher_id
        WHERE sessions.class_id = ?
        ORDER BY sessions.session_date ASC, sessions.sort_order ASC, sessions.id ASC
      `
    )
    .bind(classId)
    .all<Record<string, unknown>>();

  return result.results || [];
}

export async function createClassSession(db: D1Database, classId: number, data: Record<string, unknown>) {
  await ensureClassExists(db, classId);

  const sessionDate = normalizeNullableText(data.session_date);
  const startTime = normalizeNullableText(data.start_time);
  const endTime = normalizeNullableText(data.end_time);
  const sessionType = normalizeNullableText(data.session_type) || 'lesson';

  if (!sessionDate || !startTime || !endTime) {
    throw new Error('Thiếu ngày hoặc thời gian buổi học');
  }

  const result = await db
    .prepare(
      `
        INSERT INTO class_sessions (
          class_id,
          session_date,
          start_time,
          end_time,
          session_type,
          title,
          content_outline,
          period_count,
          teacher_id,
          room,
          meeting_link,
          notes,
          sort_order,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `
    )
    .bind(
      classId,
      sessionDate,
      startTime,
      endTime,
      sessionType,
      normalizeNullableText(data.title),
      normalizeNullableText(data.content_outline),
      parseNullableInteger(data.period_count),
      parseNullableInteger(data.teacher_id),
      normalizeNullableText(data.room),
      normalizeNullableText(data.meeting_link),
      normalizeNullableText(data.notes),
      parseNullableInteger(data.sort_order) ?? 0
    )
    .run();

  const sessionId = Number(result.meta.last_row_id);
  return getSessionById(db, classId, sessionId);
}

export async function updateClassSession(
  db: D1Database,
  classId: number,
  sessionId: number,
  data: Record<string, unknown>
) {
  await ensureClassExists(db, classId);

  const existing = await getSessionById(db, classId, sessionId);
  if (!existing) {
    throw new Error('Không tìm thấy buổi học');
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  const mapping: Array<[string, string, (value: unknown) => unknown]> = [
    ['session_date', 'session_date', normalizeNullableText],
    ['start_time', 'start_time', normalizeNullableText],
    ['end_time', 'end_time', normalizeNullableText],
    ['session_type', 'session_type', normalizeNullableText],
    ['title', 'title', normalizeNullableText],
    ['content_outline', 'content_outline', normalizeNullableText],
    ['period_count', 'period_count', parseNullableInteger],
    ['teacher_id', 'teacher_id', parseNullableInteger],
    ['room', 'room', normalizeNullableText],
    ['meeting_link', 'meeting_link', normalizeNullableText],
    ['notes', 'notes', normalizeNullableText],
    ['sort_order', 'sort_order', parseNullableInteger],
  ];

  for (const [payloadKey, columnName, parser] of mapping) {
    if (Object.prototype.hasOwnProperty.call(data, payloadKey)) {
      updates.push(`${columnName} = ?`);
      values.push(parser(data[payloadKey]));
    }
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = datetime('now')`);
  values.push(classId, sessionId);

  await db
    .prepare(
      `
        UPDATE class_sessions
        SET ${updates.join(', ')}
        WHERE class_id = ?
          AND id = ?
      `
    )
    .bind(...values)
    .run();

  return getSessionById(db, classId, sessionId);
}

export async function deleteClassSession(db: D1Database, classId: number, sessionId: number) {
  await ensureClassExists(db, classId);

  const existing = await getSessionById(db, classId, sessionId);
  if (!existing) {
    throw new Error('Không tìm thấy buổi học');
  }

  await db
    .prepare('DELETE FROM class_sessions WHERE class_id = ? AND id = ?')
    .bind(classId, sessionId)
    .run();

  return { id: sessionId, deleted: true };
}
