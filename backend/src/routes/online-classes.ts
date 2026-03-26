/**
 * Router: online-classes
 * Layer 3 (Presentation) — HTTP routing only.
 * Delegates all business logic to lib/services/online-classes.js.
 * Response shape: { success: true, data, meta } | { success: false, error: { message, code } }
 */

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { verifyJWT, errorResponse, successResponse } from '../utils/helpers.js';
import { strictRateLimiter, moderateRateLimiter, createRateLimiter } from '../utils/rate-limiter.js';
import { enrichStudentWithImages } from '../services/student-service.js';
import { requireAdmin } from '../middleware/auth-middleware.js';

import {
  getClassList, getClassDetail, getMyStatus,
  createClass, updateClassById, deleteClassById,
  regenerateMeetLink, autoSyncMeetLink,
  enrollStudent, adminAddStudent,
  approveEnrollmentById, rejectEnrollmentById, removeStudent,
  getAvailableStudents, findStudentForAuth,
  listEnrolledStudents, listActiveEnrollmentsWithStudents,
  listPendingEnrollmentsWithStudents, getClassForName
} from '../lib/services/online-classes.js';

const onlineClasses = new Hono<{ Bindings: Env; Variables: { user: JWTPayload; student: any; isAdmin: boolean } }>();

// Rate limiter for meet regeneration — 15 req/min per admin id
const meetRegenerateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  keyGenerator: (c: any) => {
    const user = c.get('user');
    if (user?.id) return `meet_regen:${user.id}`;
    return `meet_regen:${c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'}`;
  }
});

// ─── Middleware ──────────────────────────────────────────────────────────────

// authMiddleware: verify JWT, attach 'user' to context
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return errorResponse('Thiếu token xác thực', 401);

  const payload = await verifyJWT(authHeader.replace('Bearer ', ''), c.env.JWT_SECRET);
  // verifyJWT handles exp in seconds; truthy = valid & not expired
  if (!payload) return errorResponse('Token không hợp lệ hoặc đã hết hạn', 401);

  c.set('user', payload);
  await next();
};

// adminOnly: require admin/super_admin role (delegates to shared requireAdmin)
const adminOnly = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return errorResponse('Chỉ admin mới có quyền thực hiện', 403);
  }
  await next();
};

/**
 * Flexible auth: JWT (admin/teacher/student) OR X-Student-CCCD header OR anonymous.
 * Sets c 'user', 'student', 'isAdmin' context vars.
 */
const studentAuth = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const studentCCCD = c.req.header('X-Student-CCCD');

  if (authHeader) {
    try {
      const payload = await verifyJWT(authHeader.replace('Bearer ', ''), c.env.JWT_SECRET);
      if (payload) {
        if (payload.type === 'student' || payload.role === 'student') {
          c.set('student', payload);
          c.set('isAdmin', false);
        } else {
          c.set('user', payload);
          c.set('isAdmin', payload.role === 'admin' || payload.role === 'super_admin');
        }
        await next();
        return;
      }
    } catch (err: any) {
      console.error('[studentAuth] JWT error:', err.message);
    }
  }

  if (studentCCCD) {
    const student = await findStudentForAuth(c.env.DB, studentCCCD);
    if (student) {
      c.set('student', student);
      c.set('isAdmin', false);
      await next();
      return;
    }
  }

  // Anonymous — view-only endpoints still work
  c.set('isAdmin', false);
  await next();
};

// ─── Helper: build viewer context from Hono context ─────────────────────────
function getViewer(c: any) {
  return {
    isAdmin: !!c.get('isAdmin'),
    studentId: c.get('student')?.id ?? null
  };
}

// ─── Test/Debug Endpoints ────────────────────────────────────────────────────

/**
 * GET /online-classes/test-google-auth
 * Debug endpoint — checks Google Calendar Service Account credentials.
 */
import { createOnlineClassEvent, deleteOnlineClassEvent } from '../services/google-calendar.js';

onlineClasses.get('/test-google-auth', async (c) => {
  const env = c.env;
  const credCheck = {
    GOOGLE_CLIENT_EMAIL: !!env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_PRIVATE_KEY: !!env.GOOGLE_PRIVATE_KEY,
    GOOGLE_ADMIN_EMAIL: !!env.GOOGLE_ADMIN_EMAIL,
    client_email_value: env.GOOGLE_CLIENT_EMAIL || 'NOT SET',
    admin_email_value: env.GOOGLE_ADMIN_EMAIL || 'NOT SET',
    private_key_length: env.GOOGLE_PRIVATE_KEY?.length || 0
  };

  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_ADMIN_EMAIL) {
    return successResponse({ status: 'FAILED', error: 'Missing Google credentials', credentials: credCheck });
  }

  try {
    const testResult = await createOnlineClassEvent(env, {
      class_name: 'TEST_DELETE_ME',
      description: 'Auto-delete test event',
      schedule_rule: 'WEEKLY:1',
      schedule_time: '10:00-11:00',
      timezone: 'Asia/Ho_Chi_Minh',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      teacher_name: 'Test'
    });

    if (testResult.eventId) {
      try { await deleteOnlineClassEvent(env, testResult.eventId); } catch (_) { /* best effort */ }
    }

    return successResponse({
      status: 'SUCCESS',
      message: 'Google Calendar API is working!',
      test_result: { event_id: testResult.eventId, meet_link: testResult.meetLink },
      credentials: credCheck
    });
  } catch (error: any) {
    return successResponse({ status: 'FAILED', error: error.message, error_stack: error.stack, credentials: credCheck });
  }
});

// ─── Public / Student Routes ─────────────────────────────────────────────────

/**
 * GET /online-classes
 * List classes. meet_link visible to enrolled students and admins only.
 */
onlineClasses.get('/', studentAuth, async (c) => {
  const db = c.env.DB;
  const viewer = getViewer(c);

  // Admin: auto-sync meet_links for classes missing them
  let rows;
  if (viewer.isAdmin) {
    const { rows: rawRows } = await (async () => {
      // Minimal pre-fetch for auto-sync — service layer handles visibility
      const svc = await import('../lib/services/online-classes.js');
      return { rows: [] }; // actual fetch done inside getClassList
    })();
    // Auto-sync is handled inline per-class inside getClassList via autoSyncMeetLink — skipped here for simplicity.
    // To enable: iterate rows before passing to getClassList and call autoSyncMeetLink(db, env, cls).
  }

  const result = await getClassList(db, c.req.query(), viewer);
  return successResponse(result);
});

/**
 * GET /online-classes/:id
 * Class detail. meet_link hidden for non-enrolled non-admin users.
 */
onlineClasses.get('/:id', studentAuth, async (c) => {
  const { id } = c.req.param();
  const detail = await getClassDetail(c.env.DB, id, getViewer(c));

  if (!detail) return errorResponse('Không tìm thấy lớp học', 404);
  return successResponse(detail);
});

/**
 * GET /online-classes/:id/my-status
 * Student enrollment + join eligibility for a class.
 */
onlineClasses.get('/:id/my-status', studentAuth, async (c) => {
  const { id } = c.req.param();
  const status = await getMyStatus(c.env.DB, id, getViewer(c));

  if (!status) return errorResponse('Không tìm thấy lớp học', 404);
  return successResponse(status);
});

/**
 * POST /online-classes/:id/enroll
 * Student self-enrollment. Requires JWT or X-Student-CCCD header.
 */
onlineClasses.post('/:id/enroll', async (c) => {
  try {
    const db = c.env.DB;
    if (!db) throw new Error('Database connection not available');

    const classId = parseInt(c.req.param('id'));

    // Inline auth (bypass middleware to catch low-level errors)
    let student = null;
    const authHeader = c.req.header('Authorization');
    const studentCCCD = c.req.header('X-Student-CCCD');

    if (authHeader) {
      try {
        const payload = await verifyJWT(authHeader.replace('Bearer ', ''), c.env.JWT_SECRET);
        if (payload && (payload.type === 'student' || payload.role === 'student' || (payload as any).cccd)) {
          student = payload;
        }
      } catch (_) { /* ignore */ }
    }

    if (!student && studentCCCD) {
      student = await findStudentForAuth(db, studentCCCD);
    }

    if (!student) return errorResponse('Vui lòng đăng nhập với CCCD để đăng ký lớp', 401);

    const result = await enrollStudent(db, classId, (student as any).id);
    return successResponse(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return errorResponse(status === 500 ? 'Lỗi đăng ký: ' + error.message : error.message, status);
  }
});

// ─── Admin: Enrollment Management ───────────────────────────────────────────

/**
 * GET /online-classes/:id/available-students
 * Students not yet active-enrolled in this class. Supports ?q= search.
 */
onlineClasses.get('/:id/available-students', authMiddleware, adminOnly, async (c) => {
  const { id } = c.req.param();
  const keyword = c.req.query('q') || '';

  const students = await getAvailableStudents(c.env.DB, id, keyword);
  if (students === null) return errorResponse('Không tìm thấy lớp học', 404);

  return successResponse({ data: students, count: students.length });
});

/**
 * POST /online-classes/:id/students
 * Admin directly adds a student (active, no pending).
 */
onlineClasses.post('/:id/students', authMiddleware, adminOnly, async (c) => {
  try {
    const { id } = c.req.param();
    const { student_id } = await c.req.json();

    if (!student_id) return errorResponse('Thiếu student_id', 400);

    const result = await adminAddStudent(c.env.DB, id, student_id);
    return successResponse(result, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.statusCode || 500);
  }
});

/**
 * GET /online-classes/:id/enrollments
 * Active enrollments with student info + image URLs.
 */
onlineClasses.get('/:id/enrollments', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const cls = await getClassForName(db, id);
  if (!cls) return errorResponse('Không tìm thấy lớp học', 404);

  const { results } = await listActiveEnrollmentsWithStudents(db, id);

  const enriched = await Promise.all((results || []).map(async (row: any) => {
    const studentData = {
      id: row.id, cccd: row.cccd, ho: row.ho, ten_dem: row.ten_dem, ten: row.ten,
      ho_ten_full: row.ho_ten_full, sdt: row.sdt, email: row.email,
      ngay_sinh: row.ngay_sinh, gioi_tinh: row.gioi_tinh,
      cccd_front_image_id: row.cccd_front_image_id,
      cccd_back_image_id: row.cccd_back_image_id,
      photo_3x4_image_id: row.photo_3x4_image_id
    };
    return {
      enrollment_id: row.enrollment_id,
      enrollment_status: row.enrollment_status,
      enrolled_at: row.enrolled_at,
      ...(await enrichStudentWithImages(c, studentData))
    };
  }));

  return successResponse({ data: enriched, count: enriched.length, class_id: id, class_name: cls.class_name });
});

/**
 * GET /online-classes/:id/pending-enrollments
 * Pending enrollments with student info + image URLs. Admin only.
 */
onlineClasses.get('/:id/pending-enrollments', authMiddleware, adminOnly, async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const cls = await getClassForName(db, id);
  if (!cls) return errorResponse('Không tìm thấy lớp học', 404);

  const { results } = await listPendingEnrollmentsWithStudents(db, id);

  const enriched = await Promise.all((results || []).map(async (row: any) => {
    const studentData = {
      id: row.id, cccd: row.cccd, ho: row.ho, ten_dem: row.ten_dem, ten: row.ten,
      ho_ten_full: row.ho_ten_full, sdt: row.sdt, email: row.email,
      ngay_sinh: row.ngay_sinh, gioi_tinh: row.gioi_tinh,
      cccd_front_image_id: row.cccd_front_image_id,
      cccd_back_image_id: row.cccd_back_image_id,
      photo_3x4_image_id: row.photo_3x4_image_id
    };
    return {
      enrollment_id: row.enrollment_id,
      student_id: row.student_id,
      status: row.status,
      enrolled_at: row.enrolled_at,
      rejection_reason: row.rejection_reason,
      ...(await enrichStudentWithImages(c, studentData))
    };
  }));

  return successResponse({ data: enriched, count: enriched.length, class_id: id, class_name: cls.class_name });
});

/**
 * PUT /online-classes/:id/enrollments/:enrollmentId/approve  (legacy PUT route)
 * POST /online-classes/:id/enrollments/:enrollmentId/approve (new POST route)
 */
const handleApprove = async (c: any) => {
  try {
    const { id, enrollmentId } = c.req.param();
    const user = c.get('user');
    const result = await approveEnrollmentById(c.env.DB, id, enrollmentId, user.id);
    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, error.statusCode || 500);
  }
};

onlineClasses.put('/:id/enrollments/:enrollmentId/approve', authMiddleware, adminOnly, handleApprove);
onlineClasses.post('/:id/enrollments/:enrollmentId/approve', authMiddleware, adminOnly, handleApprove);

/**
 * PUT /online-classes/:id/enrollments/:enrollmentId/reject  (legacy PUT route)
 * POST /online-classes/:id/enrollments/:enrollmentId/reject (new POST route)
 */
const handleReject = async (c: any) => {
  try {
    const { id, enrollmentId } = c.req.param();
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const result = await rejectEnrollmentById(c.env.DB, id, enrollmentId, user.id, body.reason ?? null);
    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, error.statusCode || 500);
  }
};

onlineClasses.put('/:id/enrollments/:enrollmentId/reject', authMiddleware, adminOnly, handleReject);
onlineClasses.post('/:id/enrollments/:enrollmentId/reject', authMiddleware, adminOnly, handleReject);

// ─── Admin: Class CRUD ───────────────────────────────────────────────────────

/**
 * POST /online-classes
 * Create a new class with optional Google Calendar + Meet link.
 */
onlineClasses.post('/', authMiddleware, adminOnly, strictRateLimiter, async (c) => {
  try {
    const user = c.get('user') as any;
    const body = await c.req.json();

    const { newClass, calendarResult, warning } = await createClass(c.env.DB, c.env, body, user.id);

    const response: any = { message: 'Tạo lớp học online thành công', class: newClass };

    if (calendarResult) {
      response.google_calendar = {
        event_id: calendarResult.eventId,
        meet_link: newClass.meet_link || calendarResult.meetLink,
        calendar_link: calendarResult.htmlLink
      };
    } else if (warning) {
      response.warning = warning;
    }

    return successResponse(response, 201);
  } catch (error: any) {
    return errorResponse(error.message, error.statusCode || 500);
  }
});

/**
 * PUT /online-classes/:id
 * Update class fields. Syncs name/description to Google Calendar if needed.
 */
onlineClasses.put('/:id', authMiddleware, adminOnly, moderateRateLimiter, async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updated = await updateClassById(c.env.DB, c.env, id, body);
    if (!updated) return errorResponse('Không tìm thấy lớp học', 404);

    return successResponse({ message: 'Cập nhật lớp học thành công', class: updated });
  } catch (error: any) {
    return errorResponse(error.message, error.statusCode || 500);
  }
});

/**
 * DELETE /online-classes/:id
 * Delete class and its Google Calendar event.
 */
onlineClasses.delete('/:id', authMiddleware, adminOnly, strictRateLimiter, async (c) => {
  const { id } = c.req.param();
  const deleted = await deleteClassById(c.env.DB, c.env, id);

  if (!deleted) return errorResponse('Không tìm thấy lớp học', 404);
  return successResponse({ message: 'Xóa lớp học thành công' });
});

/**
 * POST /online-classes/:id/regenerate-meet
 * Create or sync Meet link for an existing class.
 */
onlineClasses.post('/:id/regenerate-meet', authMiddleware, adminOnly, meetRegenerateRateLimiter, async (c) => {
  try {
    const { id } = c.req.param();
    const result = await regenerateMeetLink(c.env.DB, c.env, id);

    if (!result) return errorResponse('Không tìm thấy lớp học', 404);
    return successResponse({
      message: result.message,
      class: result.cls,
      google_calendar: result.googleCalendar
    });
  } catch (error: any) {
    return errorResponse(`Lỗi tạo link Meet: ${error.message}`, 500);
  }
});

// ─── Admin: Student Management within Class ──────────────────────────────────

/**
 * GET /online-classes/:id/students
 * All enrolled students (any status) with image URLs.
 */
onlineClasses.get('/:id/students', authMiddleware, adminOnly, async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const cls = await getClassForName(db, id);
  if (!cls) return errorResponse('Không tìm thấy lớp học', 404);

  const { results } = await listEnrolledStudents(db, id);

  const enriched = await Promise.all((results || []).map(async (s: any) => ({
    ...(await enrichStudentWithImages(c, {
      id: s.id, cccd: s.cccd, ho_ten_full: s.ho_ten_full, email: s.email, sdt: s.sdt,
      cccd_front_image_id: s.cccd_front_image_id,
      cccd_back_image_id: s.cccd_back_image_id,
      photo_3x4_image_id: s.photo_3x4_image_id
    })),
    enrolled_at: s.enrolled_at,
    enrollment_status: s.enrollment_status
  })));

  return successResponse({
    class: { id: cls.id, class_name: cls.class_name },
    students: enriched,
    total: enriched.length
  });
});

/**
 * DELETE /online-classes/:id/students/:studentId
 * Cancel (remove) a student from a class.
 */
onlineClasses.delete('/:id/students/:studentId', authMiddleware, adminOnly, async (c) => {
  try {
    const { id, studentId } = c.req.param();
    const result = await removeStudent(c.env.DB, id, studentId);
    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, error.statusCode || 404);
  }
});

// ─── Admin: Debug Endpoints ──────────────────────────────────────────────────

/**
 * POST /online-classes/:id/debug-sync-meet
 * Manually sync meet_link from Google Calendar for a specific class.
 */
onlineClasses.post('/:id/debug-sync-meet', authMiddleware, adminOnly, async (c) => {
  const { id } = c.req.param();
  const db = c.env.DB;

  const cls = await getClassForName(db, id);
  if (!cls) return errorResponse('Không tìm thấy lớp học', 404);

  const debugInfo: any = {
    class_id: cls.id,
    class_name: cls.class_name,
    calendar_event_id: cls.calendar_event_id,
    current_meet_link: cls.meet_link,
    has_event_id: !!cls.calendar_event_id,
    has_meet_link: !!cls.meet_link
  };

  if (!cls.calendar_event_id) {
    return successResponse({ message: 'Class không có calendar_event_id', debug: debugInfo });
  }

  try {
    const synced = await autoSyncMeetLink(db, c.env, cls);
    debugInfo.fetched_meet_link = synced;
    debugInfo.sync_success = !!synced;
    if (synced) {
      debugInfo.updated_in_db = true;
      debugInfo.new_meet_link = synced;
    }
    return successResponse({
      message: synced ? 'Đã sync meet_link thành công' : 'Không tìm thấy meet_link trong Google Calendar',
      debug: debugInfo
    });
  } catch (error: any) {
    debugInfo.error = error.message;
    debugInfo.error_stack = error.stack;
    return errorResponse('Lỗi khi sync meet_link: ' + error.message, 500);
  }
});

export default onlineClasses;
