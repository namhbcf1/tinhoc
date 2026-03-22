import {
  getAllClasses,
  getOpenClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  searchStudents,
  getAllStudents,
  findRegistration
} from '../../db/queries.js';
import {
  createClassSchedule,
  getClassSchedules,
  deleteClassSchedule
} from '../../db/class-schedule-queries.js';
import {
  deleteCalendarEvent,
  updateCalendarEventSafe
} from '../../services/google-calendar.js';
import { formatDate } from '../../utils/helpers.js';
import type { Env } from '../../types/env.js';

export async function fetchAllClasses(db: D1Database): Promise<any> {
  try {
    const classList = await getAllClasses(db);
    return { success: true, data: classList, meta: { count: classList.length } };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function fetchOpenClasses(db: D1Database): Promise<any> {
  try {
    const openClasses = await getOpenClasses(db);
    return { success: true, data: openClasses, meta: { count: openClasses.length } };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function fetchAvailableStudents(db: D1Database, classId: number | string, keyword: string): Promise<any> {
  try {
    const classInfo = await getClassById(db, Number(classId));
    if (!classInfo) {
      return { success: false, error: { message: 'Không tìm thấy lớp', code: 'NOT_FOUND' } };
    }

    let allStudents: any[] = [];
    if (keyword && keyword.trim()) {
      allStudents = await searchStudents(db, keyword);
    } else {
      allStudents = await getAllStudents(db, 50, 0);
    }

    const registeredQuery = await db.prepare(
      `SELECT student_id FROM registrations WHERE class_id = ?`
    ).bind(classId).all();

    const registeredIds = new Set((registeredQuery.results || []).map((r: any) => r.student_id));
    const availableStudents = allStudents.filter(s => !registeredIds.has(s.id));

    return { success: true, data: availableStudents, meta: { count: availableStudents.length } };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function addStudentToClass(db: D1Database, classId: number | string, studentId: number | string): Promise<any> {
  try {
    const classInfo: any = await getClassById(db, Number(classId));
    if (!classInfo) {
      return { success: false, error: { message: 'Không tìm thấy lớp', code: 'NOT_FOUND' } };
    }

    const student: any = await db.prepare('SELECT * FROM students WHERE id = ?').bind(studentId).first();
    if (!student) {
      return { success: false, error: { message: 'Không tìm thấy học sinh', code: 'NOT_FOUND' } };
    }

    const existingReg = await findRegistration(db, Number(studentId), Number(classId));
    if (existingReg) {
      return { success: false, error: { message: `${student.ho_ten_full} đã đăng ký lớp này rồi`, code: 'BAD_REQUEST' } };
    }

    if (classInfo.max_students && classInfo.current_students >= classInfo.max_students) {
      return { success: false, error: { message: 'Lớp đã đủ sĩ số, không thể thêm học sinh', code: 'BAD_REQUEST' } };
    }

    await db.prepare(`
      INSERT INTO registrations(student_id, class_id, status)
      VALUES(?, ?, 'approved')
    `).bind(studentId, classId).run();

    await db.prepare(`
      UPDATE classes
      SET current_students = current_students + 1,
          updated_at = datetime('now', '+7 hours')
      WHERE id = ?
    `).bind(classId).run();

    return { success: true, data: { student_id: studentId, class_id: classId } };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function fetchClassById(db: D1Database, classId: number | string): Promise<any> {
  try {
    const classInfo = await getClassById(db, Number(classId));
    if (!classInfo) {
      return { success: false, error: { message: 'Không tìm thấy lớp', code: 'NOT_FOUND' } };
    }
    return { success: true, data: classInfo };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function addClass(db: D1Database, data: any): Promise<any> {
  try {
    if (data.class_type === 'hoc') {
      const required = ['ten_lop', 'ngay_bat_dau', 'ngay_ket_thuc', 'open_at', 'close_at'];
      for (const field of required) {
        if (!data[field]) return { success: false, error: { message: `Thiếu trường: ${field}`, code: 'BAD_REQUEST' } };
      }
      if (!data.schedule_days || data.schedule_days.length === 0) {
        return { success: false, error: { message: 'Lớp học cần chọn ít nhất 1 ngày trong tuần cho lịch học', code: 'BAD_REQUEST' } };
      }
      if (!data.schedule_start_time || !data.schedule_end_time) {
        return { success: false, error: { message: 'Lớp học cần có giờ bắt đầu và kết thúc', code: 'BAD_REQUEST' } };
      }
    } else {
      const required = ['ten_lop', 'ngay_bat_dau', 'ngay_ket_thuc', 'open_at', 'close_at'];
      for (const field of required) {
        if (!data[field]) return { success: false, error: { message: `Thiếu trường: ${field}`, code: 'BAD_REQUEST' } };
      }
    }

    if (data.ngay_bat_dau) {
      try { data.ngay_bat_dau = formatDate(data.ngay_bat_dau); }
      catch (e) { return { success: false, error: { message: `Ngày bắt đầu không hợp lệ: ${data.ngay_bat_dau}`, code: 'BAD_REQUEST' } }; }
    }
    if (data.ngay_ket_thuc) {
      try { data.ngay_ket_thuc = formatDate(data.ngay_ket_thuc); }
      catch (e) { return { success: false, error: { message: `Ngày kết thúc không hợp lệ: ${data.ngay_ket_thuc}`, code: 'BAD_REQUEST' } }; }
    }
    if (data.ngay_thi) {
      try { data.ngay_thi = formatDate(data.ngay_thi); }
      catch (e) { return { success: false, error: { message: `Ngày thi không hợp lệ: ${data.ngay_thi}`, code: 'BAD_REQUEST' } }; }
    }

    if (!data.ngay_thi && data.ngay_bat_dau) data.ngay_thi = data.ngay_bat_dau;

    if (data.open_at) {
      const openDate = new Date(data.open_at);
      if (isNaN(openDate.getTime())) return { success: false, error: { message: `Thời gian mở đăng ký không hợp lệ: ${data.open_at}`, code: 'BAD_REQUEST' } };
      data.open_at = openDate.toISOString();
    }
    if (data.close_at) {
      const closeDate = new Date(data.close_at);
      if (isNaN(closeDate.getTime())) return { success: false, error: { message: `Thời gian đóng đăng ký không hợp lệ: ${data.close_at}`, code: 'BAD_REQUEST' } };
      data.close_at = closeDate.toISOString();
    }

    const result = await createClass(db, data);
    if (!result || !result.meta || !result.meta.last_row_id) {
      return { success: false, error: { message: 'Lỗi tạo lớp: Không thể tạo lớp. ' + (result?.error || ''), code: 'INTERNAL_SERVER_ERROR' } };
    }

    const classId = result.meta.last_row_id;

    if (data.class_type === 'hoc' && data.schedule_days && data.schedule_days.length > 0) {
      for (const dayOfWeek of data.schedule_days) {
        try {
          await createClassSchedule(db, {
            class_id: classId,
            day_of_week: parseInt(dayOfWeek),
            start_time: data.schedule_start_time,
            end_time: data.schedule_end_time,
            room: data.schedule_location || null,
            notes: null,
          });
        } catch (scheduleError) {}
      }
    }

    return { success: true, data: { class_id: classId } };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function modifyClass(env: Env, id: number | string, data: any): Promise<any> {
  try {
    const db = env.DB;
    if (data.ngay_thi) data.ngay_thi = formatDate(data.ngay_thi);
    if (data.ngay_bat_dau) data.ngay_bat_dau = formatDate(data.ngay_bat_dau);
    if (data.ngay_ket_thuc) data.ngay_ket_thuc = formatDate(data.ngay_ket_thuc);

    const result: any = await updateClass(db, Number(id), data);
    if (!result.success) {
      return { success: false, error: { message: 'Lỗi cập nhật: ' + result.error, code: 'INTERNAL_SERVER_ERROR' } };
    }

    if (data.schedule_days && data.schedule_days.length > 0 && data.schedule_start_time && data.schedule_end_time) {
      const existingSchedules = await getClassSchedules(db, Number(id));
      if (existingSchedules.results) {
        for (const schedule of existingSchedules.results as any[]) {
          if (schedule.google_event_id) {
            try { await deleteCalendarEvent(env, schedule.google_event_id); } catch (e) {}
          }
          await deleteClassSchedule(db, schedule.id);
        }
      }

      for (const dayOfWeek of data.schedule_days) {
        try {
          await createClassSchedule(db, {
            class_id: Number(id),
            day_of_week: parseInt(dayOfWeek),
            start_time: data.schedule_start_time,
            end_time: data.schedule_end_time,
            room: data.schedule_location || null,
            notes: null,
          });
        } catch (e) {}
      }
    }

    if (data.ten_lop) {
      try {
        const schedules = await getClassSchedules(db, Number(id));
        if (schedules && schedules.results) {
          for (const schedule of schedules.results as any[]) {
            if (schedule.google_event_id) {
              try { await updateCalendarEventSafe(env, schedule.google_event_id, { class_name: data.ten_lop }); } catch (e) {}
            }
          }
        }
      } catch (e) {}
    }

    return { success: true, data: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}

export async function removeClass(env: Env, id: number | string): Promise<any> {
  try {
    const db = env.DB;
    try {
      const schedules = await getClassSchedules(db, Number(id));
      if (schedules && schedules.results) {
        for (const schedule of schedules.results as any[]) {
          if (schedule.google_event_id) {
            try { await deleteCalendarEvent(env, schedule.google_event_id); } catch (e) {}
          }
        }
      }
    } catch (e) {}

    const result: any = await deleteClass(db, Number(id));
    if (!result.success) {
      return { success: false, error: { message: result.error || 'Lỗi xóa lớp', code: 'BAD_REQUEST' } };
    }

    return { success: true, data: null };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: 'INTERNAL_SERVER_ERROR' } };
  }
}
