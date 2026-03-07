// Database queries for Teachers

export async function findTeacherByCode(db: D1Database, teacher_code: string) {
  const result = await db.prepare(
    'SELECT * FROM teachers WHERE teacher_code = ?'
  ).bind(teacher_code).first();
  return result;
}

export async function findTeacherByEmail(db: D1Database, email: string) {
  const result = await db.prepare(
    'SELECT * FROM teachers WHERE email = ?'
  ).bind(email).first();
  return result;
}

export async function findTeacherById(db: D1Database, id: number) {
  const result = await db.prepare(
    'SELECT id, teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, department, position, status, last_login, created_at, updated_at FROM teachers WHERE id = ?'
  ).bind(id).first();
  return result;
}

export async function createTeacher(db: D1Database, data: Record<string, any>) {
  const { teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, password_hash, department, position, status = 'active' } = data;

  const result = await db.prepare(
    `INSERT INTO teachers
     (teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, password_hash, department, position, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(teacher_code, ho, ten_dem || '', ten, ho_ten_full, email, sdt, password_hash, department || null, position || null, status).run();

  return result;
}

export async function updateTeacher(db: D1Database, id: number, data: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.ho !== undefined) { fields.push('ho = ?'); values.push(data.ho); }
  if (data.ten_dem !== undefined) { fields.push('ten_dem = ?'); values.push(data.ten_dem); }
  if (data.ten !== undefined) { fields.push('ten = ?'); values.push(data.ten); }
  if (data.ho_ten_full !== undefined) { fields.push('ho_ten_full = ?'); values.push(data.ho_ten_full); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.sdt !== undefined) { fields.push('sdt = ?'); values.push(data.sdt); }
  if (data.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(data.password_hash); }
  if (data.department !== undefined) { fields.push('department = ?'); values.push(data.department); }
  if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.last_login !== undefined) { fields.push('last_login = ?'); values.push(data.last_login); }

  if (fields.length === 0) return { success: false, message: 'No fields to update' };

  values.push(id);
  const query = `UPDATE teachers SET ${fields.join(', ')} WHERE id = ?`;

  const result = await db.prepare(query).bind(...values).run();
  return result;
}

export async function getAllTeachers(db: D1Database, limit = 100, offset = 0) {
  const result = await db.prepare(
    `SELECT id, teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, department, position, status, last_login, created_at
     FROM teachers
     ORDER BY ho_ten_full ASC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return result;
}

export async function searchTeachers(db: D1Database, keyword: string) {
  const searchTerm = `%${keyword}%`;
  const result = await db.prepare(
    `SELECT id, teacher_code, ho, ten_dem, ten, ho_ten_full, email, sdt, department, position, status
     FROM teachers
     WHERE teacher_code LIKE ?
        OR ho_ten_full LIKE ?
        OR email LIKE ?
        OR sdt LIKE ?
     ORDER BY ho_ten_full ASC`
  ).bind(searchTerm, searchTerm, searchTerm, searchTerm).all();
  return result;
}

export async function getTeacherClasses(db: D1Database, teacher_id: number) {
  // Get teacher info to match with teacher_name in online_classes
  const teacher: any = await findTeacherById(db, teacher_id);
  if (!teacher) {
    return { results: [] };
  }

  // 1. Get classes from explicit assignment (class_teachers table)
  const offlineClasses = await db.prepare(
    `SELECT
       c.id as class_id,
       c.ten_lop,
       c.ma_lop,
       c.ngay_bat_dau,
       c.ngay_ket_thuc,
       c.loai,
       c.status as class_status,
       c.class_type as class_type_detail,
       t.ho_ten_full as teacher_name,
       NULL as meet_link,
       NULL as schedule_rule,
       NULL as schedule_time,
       NULL as description,
       c.max_students
     FROM class_teachers ct
     INNER JOIN classes c ON ct.class_id = c.id
     INNER JOIN teachers t ON ct.teacher_id = t.id
     WHERE ct.teacher_id = ? AND c.status != 'cancelled'
     ORDER BY c.ngay_bat_dau DESC`
  ).bind(teacher_id).all();

  // Query online classes - match by teacher_name (flexible matching)
  const teacherNameVariants: string[] = [
    teacher.ho_ten_full,
    `${teacher.ho || ''} ${teacher.ten_dem || ''} ${teacher.ten || ''}`.trim(),
    `${teacher.ho || ''} ${teacher.ten || ''}`.trim(),
    teacher.ten || ''
  ].filter(Boolean);

  // Build query with LIKE for flexible matching
  const onlineClassesQuery = teacherNameVariants.length > 0
    ? `SELECT
         id as class_id,
         class_name as ten_lop,
         CONCAT('ONLINE-', id) as ma_lop,
         start_date as ngay_bat_dau,
         end_date as ngay_ket_thuc,
         'online' as loai,
         status as class_status,
         'online' as class_type_detail,
         teacher_name,
         meet_link,
         schedule_rule,
         schedule_time,
         description,
         max_students
       FROM online_classes
       WHERE status = 'active' AND (
         ${teacherNameVariants.map(() => 'LOWER(TRIM(teacher_name)) = LOWER(TRIM(?))').join(' OR ')}
       )
       ORDER BY start_date DESC`
    : `SELECT * FROM online_classes WHERE 1=0`;

  const onlineClasses = teacherNameVariants.length > 0
    ? await db.prepare(onlineClassesQuery).bind(...teacherNameVariants).all()
    : { results: [] };

  // Combine results
  const allClasses = [
    ...(offlineClasses.results || []),
    ...(onlineClasses.results || [])
  ];

  // Sort by start date
  allClasses.sort((a: any, b: any) => {
    const dateA = a.ngay_bat_dau ? new Date(a.ngay_bat_dau) : new Date(0);
    const dateB = b.ngay_bat_dau ? new Date(b.ngay_bat_dau) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  return { results: allClasses };
}

export async function getTeacherSchedule(db: D1Database, teacher_id: number, week_start: string) {
  // week_start format: YYYY-MM-DD (start of week - Sunday)
  const startDate = new Date(week_start);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  // Get teacher info to match with teacher_name in online_classes
  const teacher: any = await findTeacherById(db, teacher_id);
  if (!teacher) {
    console.log(`[getTeacherSchedule] Teacher ${teacher_id} not found`);
    return { results: [] };
  }

  console.log(`[getTeacherSchedule] Teacher: ${teacher.ho_ten_full || `${teacher.ho || ''} ${teacher.ten_dem || ''} ${teacher.ten || ''}`.trim()}`);

  // Query offline classes (class_schedules)
  const offlineSchedule = await db.prepare(
    `SELECT
       cs.id,
       cs.class_id,
       cs.day_of_week,
       cs.start_time,
       cs.end_time,
       cs.room,
       cs.notes,
       cs.meeting_link,
       c.ten_lop,
       c.ma_lop,
       ct.role,
       'offline' as class_type
     FROM class_schedules cs
     INNER JOIN classes c ON cs.class_id = c.id
     INNER JOIN class_teachers ct ON c.id = ct.class_id
     WHERE ct.teacher_id = ?
     ORDER BY cs.day_of_week, cs.start_time`
  ).bind(teacher_id).all();

  // Query online classes - match by teacher_name (flexible matching)
  const teacherNameVariants: string[] = [
    teacher.ho_ten_full,
    `${teacher.ho || ''} ${teacher.ten_dem || ''} ${teacher.ten || ''}`.trim(),
    `${teacher.ho || ''} ${teacher.ten || ''}`.trim(),
    teacher.ten || ''
  ].filter(Boolean);

  console.log(`[getTeacherSchedule] Teacher name variants:`, teacherNameVariants);

  const onlineClassesQuery = teacherNameVariants.length > 0
    ? `SELECT
         id,
         class_name,
         schedule_rule,
         schedule_time,
         teacher_name,
         meet_link,
         start_date,
         end_date,
         status
       FROM online_classes
       WHERE status = 'active' AND (
         ${teacherNameVariants.map(() => 'LOWER(TRIM(teacher_name)) = LOWER(TRIM(?))').join(' OR ')}
       )`
    : `SELECT * FROM online_classes WHERE 1=0`;

  const onlineClasses = teacherNameVariants.length > 0
    ? await db.prepare(onlineClassesQuery).bind(...teacherNameVariants).all()
    : { results: [] };

  console.log(`[getTeacherSchedule] Found ${(onlineClasses.results as any[])?.length || 0} online classes:`, (onlineClasses.results as any[])?.map((oc: any) => ({ id: oc.id, name: oc.class_name, teacher: oc.teacher_name })));

  // Convert online_classes to class_schedules format
  const onlineSchedule: any[] = [];
  ((onlineClasses.results as any[]) || []).forEach((oc: any) => {
    // Parse schedule_rule: WEEKLY:1,3,5 or DAILY
    let days: number[] = [];
    if (oc.schedule_rule === 'DAILY') {
      days = [0, 1, 2, 3, 4, 5, 6];
    } else if (oc.schedule_rule && oc.schedule_rule.includes(':')) {
      const [, daysStr] = oc.schedule_rule.split(':');
      if (daysStr) {
        days = daysStr.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 0 && d <= 6);
      }
    }

    // Parse schedule_time: 19:00-21:00
    let startTime: string | null = null;
    let endTime: string | null = null;
    if (oc.schedule_time && oc.schedule_time.includes('-')) {
      const [start, end] = oc.schedule_time.split('-').map((t: string) => t.trim());
      startTime = start;
      endTime = end;
    }

    // Create schedule item for each day of week
    days.forEach((dayOfWeek: number) => {
      onlineSchedule.push({
        id: `online_${oc.id}_${dayOfWeek}`,
        class_id: `online_${oc.id}`,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: null,
        notes: null,
        meeting_link: oc.meet_link,
        ten_lop: oc.class_name,
        ma_lop: `ONLINE-${oc.id}`,
        role: 'teacher',
        class_type: 'online'
      });
    });
  });

  // Combine and sort
  const allSchedule = [...(offlineSchedule.results || []), ...onlineSchedule];
  allSchedule.sort((a: any, b: any) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    if (a.start_time && b.start_time) {
      const [aHour, aMin] = a.start_time.split(':').map(Number);
      const [bHour, bMin] = b.start_time.split(':').map(Number);
      return (aHour * 60 + aMin) - (bHour * 60 + bMin);
    }
    return 0;
  });

  return { results: allSchedule };
}

export async function getTeacherExams(db: D1Database, teacher_id: number) {
  const result = await db.prepare(
    `SELECT
       es.id,
       es.class_id,
       es.exam_name,
       es.exam_date,
       es.duration_minutes,
       es.location,
       es.notes,
       c.ten_lop,
       c.ma_lop
     FROM exam_schedules es
     INNER JOIN classes c ON es.class_id = c.id
     INNER JOIN class_teachers ct ON c.id = ct.class_id
     WHERE ct.teacher_id = ?
     ORDER BY es.exam_date ASC`
  ).bind(teacher_id).all();
  return result;
}
