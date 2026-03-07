import { Hono } from 'hono';
import type { Env } from '../types/env.js'
import type { JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse } from '../utils/helpers.js';
import {
  createClassSchedule,
  getClassSchedules,
  updateClassSchedule,
  deleteClassSchedule,
  getScheduleByWeek
} from '../db/class-schedule-queries.js';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/google-calendar.js';
import { requireAdmin } from '../middleware/auth-middleware.js';

const classSchedules = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; teacher: JWTPayload } }>();

// ========================================
// ADMIN AUTH MIDDLEWARE — use shared requireAdmin
// ========================================
const adminAuthMiddleware = async (c: any, next: any) => {
  await requireAdmin(c, async () => {
    // requireAdmin sets c.get('user'); mirror to 'admin' key for backward compat
    c.set('admin', c.get('user'));
    await next();
  });
};

// ========================================
// GET /class-schedules/class/:class_id - Get schedules for a class (public)
// ========================================
classSchedules.get('/class/:class_id', async (c) => {
  try {
    const class_id = parseInt(c.req.param('class_id'));

    if (isNaN(class_id)) {
      return errorResponse('ID lớp học không hợp lệ', 400);
    }

    const schedules = await getClassSchedules(c.env.DB, class_id);

    return jsonResponse({
      success: true,
      data: schedules.results || [],
    });
  } catch (error: any) {
    console.error('Get class schedules error:', error);
    return errorResponse('Lỗi lấy lịch học', 500);
  }
});

// ========================================
// POST /class-schedules - Create schedule (admin only)
// ========================================
classSchedules.post('/', adminAuthMiddleware, async (c) => {
  try {
    const data = await c.req.json();
    const {
      class_id, day_of_week, start_time, end_time, room, notes,
      create_meet_link, class_name, ma_lop, is_recurring, start_date
    } = data;

    if (!class_id || day_of_week === undefined || !start_time || !end_time) {
      return errorResponse('Thiếu thông tin bắt buộc', 400);
    }

    if (day_of_week < 0 || day_of_week > 6) {
      return errorResponse('day_of_week phải từ 0-6 (0=Chủ nhật, 6=Thứ 7)', 400);
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return errorResponse('Format thời gian không đúng (HH:mm)', 400);
    }

    // Check if start_time < end_time
    const [startHour, startMin] = start_time.split(':').map(Number);
    const [endHour, endMin] = end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      return errorResponse('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc', 400);
    }

    let meetLink = null;
    let googleEventId = null;

    // Tạo Google Calendar event với Meet link nếu được yêu cầu
    if (create_meet_link) {
      try {
        const calendarResult = await createCalendarEvent(c.env, {
          className: class_name || `Lớp ${class_id}`,
          maLop: ma_lop || `LOP-${class_id}`,
          startTime: start_time,
          endTime: end_time,
          dayOfWeek: parseInt(day_of_week),
          room: room,
          notes: notes,
          isRecurring: is_recurring || false,
          startDate: start_date
        });

        meetLink = calendarResult.meetLink;
        googleEventId = calendarResult.eventId;
        console.log('Google Meet link created:', meetLink);
      } catch (calendarError: any) {
        console.error('Google Calendar error (continuing without Meet):', calendarError);
        // Không fail request, chỉ log lỗi và tiếp tục tạo schedule không có meet link
      }
    }

    const result = await createClassSchedule(c.env.DB, {
      class_id: parseInt(class_id),
      day_of_week: parseInt(day_of_week),
      start_time,
      end_time,
      room: room || null,
      notes: notes || null,
      meeting_link: meetLink,
      google_event_id: googleEventId
    });

    const newSchedule = await getClassSchedules(c.env.DB, parseInt(class_id));
    const created = newSchedule.results?.find(s => s.id === result.meta.last_row_id);

    return jsonResponse({
      success: true,
      data: created,
      message: meetLink
        ? 'Tạo lịch học thành công với Google Meet link'
        : 'Tạo lịch học thành công',
    }, 201);
  } catch (error: any) {
    console.error('Create class schedule error:', error);
    return errorResponse('Lỗi tạo lịch học', 500);
  }
});

// ========================================
// PUT /class-schedules/:id - Update schedule (admin only)
// ========================================
classSchedules.put('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const data = await c.req.json();

    const updateData: any = {};

    if (data.day_of_week !== undefined) {
      if (data.day_of_week < 0 || data.day_of_week > 6) {
        return errorResponse('day_of_week phải từ 0-6', 400);
      }
      updateData.day_of_week = parseInt(data.day_of_week);
    }

    if (data.start_time !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.start_time)) {
        return errorResponse('Format thời gian không đúng (HH:mm)', 400);
      }
      updateData.start_time = data.start_time;
    }

    if (data.end_time !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.end_time)) {
        return errorResponse('Format thời gian không đúng (HH:mm)', 400);
      }
      updateData.end_time = data.end_time;
    }

    if (data.room !== undefined) {
      updateData.room = data.room;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Validate start_time < end_time if both are provided
    if (updateData.start_time && updateData.end_time) {
      const [startHour, startMin] = updateData.start_time.split(':').map(Number);
      const [endHour, endMin] = updateData.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) {
        return errorResponse('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc', 400);
      }
    }

    // 1. Get existing schedule to check for google_event_id
    const currentSchedulesRaw = await getClassSchedules(c.env.DB, data.class_id || 0); // Need class_id to find efficiently or use getById if available
    // Note: getClassSchedules returns array. But we have ID.
    // The query 'getClassSchedules' filters by class_id.
    // If we don't trust data.class_id, we should fetch by ID directly.
    // But we don't have getScheduleById exported.
    // However, looking at the code, updateClassSchedule uses ID.
    // We need to fetch the specific schedule first.
    // Let's rely on DB queries.
    const schedule = await c.env.DB.prepare('SELECT * FROM class_schedules WHERE id = ?').bind(id).first() as any;

    if (!schedule) {
      return errorResponse('Lịch học không tồn tại', 404);
    }

    // 2. Update Google Calendar if exists
    if (schedule.google_event_id) {
      try {
        // Prepare update data for Google Calendar
        // Note: updateCalendarEvent expects { className, maLop, startTime, endTime, dayOfWeek, room, notes }
        // We might need to fetch class info if we want to update className/maLop, but here we likely only change time/room.
        // If we only change time/room, we should pass those.

        // Fetch class info to be sure (optional, but good for summary update)
        const classInfo = await c.env.DB.prepare('SELECT ten_lop, ma_lop FROM classes WHERE id = ?').bind(schedule.class_id).first();

        await updateCalendarEvent(c.env, schedule.google_event_id, {
          className: classInfo?.ten_lop || 'Lớp học',
          maLop: classInfo?.ma_lop || '',
          startTime: updateData.start_time || schedule.start_time,
          endTime: updateData.end_time || schedule.end_time,
          dayOfWeek: updateData.day_of_week !== undefined ? updateData.day_of_week : schedule.day_of_week,
          room: updateData.room !== undefined ? updateData.room : schedule.room,
          notes: updateData.notes !== undefined ? updateData.notes : schedule.notes,
          // We pass startDate just in case, though update logic involving recurrence might be tricky
          // For now, let's assume updateCalendarEvent handles it or we pass what we have
        });
        console.log('Updated Google Calendar event:', schedule.google_event_id);
      } catch (gError: any) {
        console.error('Failed to update Google Calendar event:', gError);
        // Continue with local update
      }
    }

    await updateClassSchedule(c.env.DB, id, updateData);

    // Get updated schedule
    // We need class_id to return list, or just return success
    const schedules = await getClassSchedules(c.env.DB, schedule.class_id);
    const updated = schedules.results?.find(s => s.id === id);

    return jsonResponse({
      success: true,
      data: updated,
      message: 'Cập nhật lịch học thành công',
    });
  } catch (error: any) {
    console.error('Update class schedule error:', error);
    return errorResponse('Lỗi cập nhật lịch học', 500);
  }
});

// ========================================
// DELETE /class-schedules/:id - Delete schedule (admin only)
// ========================================
classSchedules.delete('/:id', adminAuthMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // 1. Get schedule to check for google_event_id
    const schedule = await c.env.DB.prepare('SELECT * FROM class_schedules WHERE id = ?').bind(id).first() as any;

    if (schedule && schedule.google_event_id) {
      try {
        await deleteCalendarEvent(c.env, schedule.google_event_id);
        console.log('Deleted Google Calendar event:', schedule.google_event_id);
      } catch (gError: any) {
        console.error('Failed to delete Google Calendar event:', gError);
        // Continue
      }
    }

    await deleteClassSchedule(c.env.DB, id);

    return jsonResponse({
      success: true,
      message: 'Xóa lịch học thành công',
    });
  } catch (error: any) {
    console.error('Delete class schedule error:', error);
    return errorResponse('Lỗi xóa lịch học', 500);
  }
});

export default classSchedules;
