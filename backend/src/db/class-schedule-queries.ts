// Database queries for Class Schedules

export async function createClassSchedule(db: D1Database, data: Record<string, any>) {
  const { class_id, day_of_week, start_time, end_time, room, notes, meeting_link, google_event_id } = data;

  const result = await db.prepare(
    `INSERT INTO class_schedules
     (class_id, day_of_week, start_time, end_time, room, notes, meeting_link, google_event_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    class_id,
    day_of_week,
    start_time,
    end_time,
    room || null,
    notes || null,
    meeting_link || null,
    google_event_id || null
  ).run();

  return result;
}

export async function getClassSchedules(db: D1Database, class_id: number) {
  const result = await db.prepare(
    `SELECT
       cs.*,
       c.ten_lop,
       c.ma_lop
     FROM class_schedules cs
     INNER JOIN classes c ON cs.class_id = c.id
     WHERE cs.class_id = ?
     ORDER BY cs.day_of_week, cs.start_time`
  ).bind(class_id).all();
  return result;
}

export async function updateClassSchedule(db: D1Database, id: number, data: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.day_of_week !== undefined) { fields.push('day_of_week = ?'); values.push(data.day_of_week); }
  if (data.start_time !== undefined) { fields.push('start_time = ?'); values.push(data.start_time); }
  if (data.end_time !== undefined) { fields.push('end_time = ?'); values.push(data.end_time); }
  if (data.room !== undefined) { fields.push('room = ?'); values.push(data.room); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
  if (data.meeting_link !== undefined) { fields.push('meeting_link = ?'); values.push(data.meeting_link); }
  if (data.google_event_id !== undefined) { fields.push('google_event_id = ?'); values.push(data.google_event_id); }
  if (data.meeting_status !== undefined) { fields.push('meeting_status = ?'); values.push(data.meeting_status); }

  if (fields.length === 0) return { success: false, message: 'No fields to update' };

  values.push(id);
  const query = `UPDATE class_schedules SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

  const result = await db.prepare(query).bind(...values).run();
  return result;
}

export async function deleteClassSchedule(db: D1Database, id: number) {
  const result = await db.prepare(
    'DELETE FROM class_schedules WHERE id = ?'
  ).bind(id).run();
  return result;
}

export async function getScheduleByWeek(db: D1Database, class_id: number, week_start: string) {
  // week_start format: YYYY-MM-DD
  // Lay tat ca lich hoc cua lop, khong can filter theo tuan vi day_of_week la co dinh
  return getClassSchedules(db, class_id);
}
