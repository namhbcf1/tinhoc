// Admin Teaching Queries - cho admin role='teacher'
// Port từ teacher-queries.ts nhưng JOIN bảng admins
import { findAdminById } from './admin-queries.js';
export async function getAdminClasses(db, adminId) {
    const admin = await findAdminById(db, adminId);
    if (!admin) {
        return { results: [] };
    }
    // 1. Get classes from explicit assignment (class_teachers table via admin_id)
    const offlineClasses = await db.prepare(`SELECT
       c.id as class_id,
       c.ten_lop,
       c.ma_lop,
       c.ngay_bat_dau,
       c.ngay_ket_thuc,
       c.loai,
       c.status as class_status,
       c.class_type as class_type_detail,
       a.ho_ten_full as teacher_name,
       NULL as meet_link,
       NULL as schedule_rule,
       NULL as schedule_time,
       NULL as description,
       c.max_students
     FROM class_teachers ct
     INNER JOIN classes c ON ct.class_id = c.id
     INNER JOIN admins a ON ct.admin_id = a.id
     WHERE ct.admin_id = ? AND c.status != 'cancelled'
     ORDER BY c.ngay_bat_dau DESC`).bind(adminId).all();
    // Query online classes - match by teacher_name (flexible matching)
    const teacherNameVariants = [
        admin.ho_ten_full,
        `${admin.ho || ''} ${admin.ten_dem || ''} ${admin.ten || ''}`.trim(),
        `${admin.ho || ''} ${admin.ten || ''}`.trim(),
        admin.ten || ''
    ].filter(Boolean);
    const onlineClassesQuery = teacherNameVariants.length > 0
        ? `SELECT
         id as class_id,
         class_name as ten_lop,
         'ONLINE-' || id as ma_lop,
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
         max_students,
         id as online_class_id,
         source_exam_schedule_id
       FROM online_classes
       WHERE status = 'active' AND (
         ${teacherNameVariants.map(() => 'LOWER(TRIM(teacher_name)) = LOWER(TRIM(?))').join(' OR ')}
       )
       ORDER BY start_date DESC`
        : `SELECT * FROM online_classes WHERE 1=0`;
    const onlineClasses = teacherNameVariants.length > 0
        ? await db.prepare(onlineClassesQuery).bind(...teacherNameVariants).all()
        : { results: [] };
    const allClasses = [
        ...(offlineClasses.results || []),
        ...(onlineClasses.results || [])
    ];
    allClasses.sort((a, b) => {
        const dateA = a.ngay_bat_dau ? new Date(a.ngay_bat_dau) : new Date(0);
        const dateB = b.ngay_bat_dau ? new Date(b.ngay_bat_dau) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
    return { results: allClasses };
}
export async function getAdminSchedule(db, adminId, week_start) {
    const admin = await findAdminById(db, adminId);
    if (!admin) {
        return { results: [] };
    }
    // Query offline classes (class_schedules)
    const offlineSchedule = await db.prepare(`SELECT
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
     WHERE ct.admin_id = ?
     ORDER BY cs.day_of_week, cs.start_time`).bind(adminId).all();
    // Query online classes - match by teacher_name
    const teacherNameVariants = [
        admin.ho_ten_full,
        `${admin.ho || ''} ${admin.ten_dem || ''} ${admin.ten || ''}`.trim(),
        `${admin.ho || ''} ${admin.ten || ''}`.trim(),
        admin.ten || ''
    ].filter(Boolean);
    const onlineClassesQuery = teacherNameVariants.length > 0
        ? `SELECT
         oc.id,
         oc.class_name,
         oc.schedule_rule,
         oc.schedule_time,
         oc.teacher_name,
         oc.meet_link,
         oc.start_date,
         oc.end_date,
         oc.status,
         oc.source_exam_schedule_id
       FROM online_classes oc
       WHERE oc.status = 'active' AND (
         ${teacherNameVariants.map(() => 'LOWER(TRIM(oc.teacher_name)) = LOWER(TRIM(?))').join(' OR ')}
       )`
        : `SELECT * FROM online_classes WHERE 1=0`;
    const onlineClasses = teacherNameVariants.length > 0
        ? await db.prepare(onlineClassesQuery).bind(...teacherNameVariants).all()
        : { results: [] };
    // Convert online_classes to class_schedules format
    const onlineSchedule = [];
    (onlineClasses.results || []).forEach((oc) => {
        let days = [];
        if (oc.schedule_rule === 'DAILY') {
            days = [0, 1, 2, 3, 4, 5, 6];
        }
        else if (oc.schedule_rule && oc.schedule_rule.includes(':')) {
            const [, daysStr] = oc.schedule_rule.split(':');
            if (daysStr) {
                days = daysStr.split(',').map((d) => parseInt(d.trim())).filter((d) => !isNaN(d) && d >= 0 && d <= 6);
            }
        }
        let startTime = null;
        let endTime = null;
        if (oc.schedule_time && oc.schedule_time.includes('-')) {
            const [start, end] = oc.schedule_time.split('-').map((t) => t.trim());
            startTime = start;
            endTime = end;
        }
        days.forEach((dayOfWeek) => {
            onlineSchedule.push({
                id: `online_${oc.id}_${dayOfWeek}`,
                class_id: `online_${oc.id}`,
                online_class_id: oc.id,
                source_exam_schedule_id: oc.source_exam_schedule_id ?? null,
                day_of_week: dayOfWeek,
                start_time: startTime,
                end_time: endTime,
                room: null,
                notes: null,
                meeting_link: oc.meet_link,
                ten_lop: oc.class_name,
                ma_lop: `ONLINE-${oc.id}`,
                role: 'admin',
                class_type: 'online'
            });
        });
    });
    const allSchedule = [...(offlineSchedule.results || []), ...onlineSchedule];
    allSchedule.sort((a, b) => {
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
export async function getAdminExams(db, adminId) {
    const result = await db.prepare(`SELECT
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
     WHERE ct.admin_id = ?
     ORDER BY es.exam_date ASC`).bind(adminId).all();
    return result;
}
