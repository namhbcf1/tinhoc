import { Hono } from 'hono';
import { jsonResponse, errorResponse, verifyJWT } from '../utils/helpers.js';
import {
  createExamSchedule,
  getExamSchedulesByClass,
  getUpcomingExams,
  updateExamSchedule,
  deleteExamSchedule,
  restoreExamSchedule,
  getDeletedExamSchedules,
  permanentlyDeleteExamSchedule,
  cleanupOldDeletedExams,
  getStudentExams,
  registerStudentForExam,
  cancelExamRegistration,
  getExamRegistrations,
  getPendingExamRegistrations,
  approveExamRegistration,
  approveAllExamRegistrations,
  rejectExamRegistration,
} from '../db/attendance-queries.js';
import {
  getExamTestById,
  checkRegistrationStatus,
  approveExamTestRegistration,
  registerForExamTest
} from '../db/exam-queries.js';
import { createActivityLog } from '../db/admin-queries.js';
import { getClassById } from '../db/queries.js';
import { authMiddleware } from '../middleware/auth-middleware.js';

const examSchedules = new Hono();

// Auth guard for all exam schedule routes — use shared authMiddleware
examSchedules.use('*', authMiddleware);

// ========================================
// GET /exam-schedules/my-exams - Get student's exams
// ========================================
examSchedules.get('/my-exams', async (c) => {
  try {
    const user = c.get('user');

    // Check if user is student (type='student' set in students.js login)
    if (!user || user.type !== 'student') {
      /* Allow admin/teacher debugging? For now restrict. */
      return errorResponse('Chức năng danh cho sinh viên', 403);
    }

    const exams = await getStudentExams(c.env.DB, user.id);

    return jsonResponse({
      success: true,
      data: exams
    });
  } catch (error) {
    return errorResponse('Lỗi lấy dữ liệu: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/upcoming - Get upcoming exams
// ========================================
examSchedules.get('/upcoming', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit')) || 10;
    const exams = await getUpcomingExams(c.env.DB, limit);

    return jsonResponse({
      success: true,
      data: exams,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy lịch thi: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/trash - Get deleted exams (thùng rác)
// ========================================
examSchedules.get('/trash', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền xem thùng rác', 403);
    }

    // Auto cleanup expired items first
    await cleanupOldDeletedExams(c.env.DB);

    const deletedExams = await getDeletedExamSchedules(c.env.DB);

    return jsonResponse({
      success: true,
      data: deletedExams,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy thùng rác: ' + error.message, 500);
  }
});


// ========================================
// GET /exam-schedules/class/:id - Get exams by class
// ========================================
examSchedules.get('/class/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const exams = await getExamSchedulesByClass(c.env.DB, parseInt(id));

    return jsonResponse({
      success: true,
      data: exams,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy lịch thi: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules - List all exam schedules (admin only)
// ========================================
examSchedules.get('/', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền xem tất cả lịch thi', 403);
    }

    const limit = parseInt(c.req.query('limit')) || 100;
    const offset = parseInt(c.req.query('offset')) || 0;

    // Get all active exam schedules (not deleted)
    const exams = await c.env.DB.prepare(`
      SELECT * FROM exam_schedules 
      WHERE deleted_at IS NULL 
      ORDER BY exam_date DESC 
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM exam_schedules WHERE deleted_at IS NULL
    `).first();

    return jsonResponse({
      success: true,
      data: exams.results || [],
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy danh sách lịch thi: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/conflicts - Admin: students with multiple active exam registrations
// ========================================
examSchedules.get('/conflicts', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền xem dữ liệu trùng', 403);
    }

    const rows = await c.env.DB.prepare(`
      SELECT
        s.id AS student_id,
        s.ho_ten_full,
        s.cccd,
        er.exam_id,
        er.status AS registration_status,
        er.created_at AS registration_created_at,
        es.exam_name,
        es.exam_date
      FROM exam_registrations er
      JOIN students s ON s.id = er.student_id
      LEFT JOIN exam_schedules es ON es.id = er.exam_id
      WHERE er.status IN ('pending','approved','registered')
        AND er.student_id IN (
          SELECT student_id
          FROM exam_registrations
          WHERE status IN ('pending','approved','registered')
          GROUP BY student_id
          HAVING COUNT(*) > 1
        )
      ORDER BY s.ho_ten_full ASC, datetime(er.created_at) DESC, er.id DESC
    `).all();

    const grouped = new Map();
    for (const r of (rows.results || [])) {
      const key = String(r.student_id);
      if (!grouped.has(key)) {
        grouped.set(key, {
          student_id: r.student_id,
          ho_ten_full: r.ho_ten_full,
          cccd: r.cccd,
          active_registrations: []
        });
      }
      grouped.get(key).active_registrations.push({
        exam_id: r.exam_id,
        exam_name: r.exam_name,
        exam_date: r.exam_date,
        registration_status: r.registration_status,
        registration_created_at: r.registration_created_at
      });
    }

    return jsonResponse({
      success: true,
      data: Array.from(grouped.values())
    });
  } catch (error) {
    return errorResponse('Lỗi lấy dữ liệu trùng: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/student/:studentId/registrations - Admin: student's exam registration history
// ========================================
examSchedules.get('/student/:studentId/registrations', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền xem lịch sử đăng ký', 403);
    }

    const studentId = parseInt(c.req.param('studentId'));
    if (Number.isNaN(studentId)) {
      return errorResponse('studentId không hợp lệ', 400);
    }

    const rows = await c.env.DB.prepare(`
      SELECT
        er.id AS registration_id,
        er.exam_id,
        er.status AS registration_status,
        er.created_at AS registration_created_at,
        es.exam_name,
        es.exam_date,
        es.class_id,
        c.ten_lop AS class_name
      FROM exam_registrations er
      LEFT JOIN exam_schedules es ON es.id = er.exam_id
      LEFT JOIN classes c ON c.id = es.class_id
      WHERE er.student_id = ?
      ORDER BY datetime(er.created_at) DESC, er.id DESC
    `).bind(studentId).all();

    return jsonResponse({
      success: true,
      data: rows.results || [],
      count: (rows.results || []).length,
    });
  } catch (error) {
    return errorResponse('Lỗi lấy lịch sử đăng ký: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules - Create exam schedule
// ========================================
examSchedules.post('/', async (c) => {
  try {
    const user = c.get('user');

    // Debug logging
    console.log('POST /exam-schedules - User from context:', user);

    if (!user) {
      console.error('No user in context - middleware may have failed');
      return errorResponse('Chưa đăng nhập hoặc token không hợp lệ', 401);
    }

    if (!user.role) {
      console.error('User has no role:', user);
      return errorResponse('Tài khoản không có quyền truy cập', 403);
    }

    // Allow admin and super_admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('Chỉ admin mới có quyền tạo lịch thi', 403);
    }

    const { class_id, exam_name, exam_date, duration_minutes, location, notes, template_id, zoom_link, zoom_meeting_id, zoom_passcode, exam_type } = await c.req.json();

    // Validate required fields
    if (!exam_name || !exam_date) {
      return errorResponse('Thiếu thông tin bắt buộc: exam_name, exam_date', 400);
    }

    // Validate class_id if present
    let classIdNum = null;
    if (class_id) {
      classIdNum = parseInt(class_id);
      if (isNaN(classIdNum)) {
        return errorResponse('class_id phải là số hợp lệ', 400);
      }

      // Check if class exists
      const classExists = await getClassById(c.env.DB, classIdNum);
      if (!classExists) {
        return errorResponse(`Lớp học với ID ${classIdNum} không tồn tại`, 404);
      }
    }

    // Validate and format exam_date
    let formattedDate;
    try {
      const dateObj = new Date(exam_date);
      if (isNaN(dateObj.getTime())) {
        return errorResponse('Ngày thi không hợp lệ. Vui lòng nhập đúng định dạng', 400);
      }
      formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
    } catch (dateError) {
      return errorResponse('Ngày thi không hợp lệ: ' + dateError.message, 400);
    }

    // Validate duration_minutes
    const duration = duration_minutes ? parseInt(duration_minutes) : 120;
    if (isNaN(duration) || duration < 1) {
      return errorResponse('Thời lượng phải là số dương', 400);
    }

    const templateIdNum = template_id ? parseInt(template_id) : null;

    // Insert with zoom fields and exam_type directly
    const result = await c.env.DB.prepare(`
      INSERT INTO exam_schedules (class_id, exam_name, exam_date, duration_minutes, location, notes, template_id, zoom_link, zoom_meeting_id, zoom_passcode, exam_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      classIdNum, exam_name.trim(), formattedDate, duration,
      location ? location.trim() : null,
      notes ? notes.trim() : null,
      templateIdNum,
      zoom_link ? zoom_link.trim() : null,
      zoom_meeting_id ? zoom_meeting_id.trim() : null,
      zoom_passcode ? zoom_passcode.trim() : null,
      exam_type ? exam_type.trim() : null
    ).run();

    // Log activity (fire-and-forget for performance)
    createActivityLog(
      c.env.DB,
      user.id,
      'create_exam_schedule',
      'exam_schedules',
      result.meta.last_row_id,
      `Created exam schedule: ${exam_name}`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Tạo lịch thi thành công',
      data: {
        id: result.meta.last_row_id,
      },
    }, 201);
  } catch (error) {
    // Better error handling
    console.error('Error creating exam schedule:', error);

    // Check for foreign key constraint error
    if (error.message && error.message.includes('FOREIGN KEY constraint')) {
      return errorResponse('Lớp học không tồn tại hoặc đã bị xóa', 400);
    }

    // Check for other SQL errors
    if (error.message && error.message.includes('SQLITE')) {
      return errorResponse('Lỗi database: ' + error.message, 500);
    }

    return errorResponse('Lỗi tạo lịch thi: ' + error.message, 500);
  }
});

// ========================================
// PUT /exam-schedules/:id - Update exam schedule
// ========================================
examSchedules.put('/:id', async (c) => {
  try {
    const user = c.get('user');

    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền cập nhật lịch thi', 403);
    }

    const { id } = c.req.param();
    const updateData = await c.req.json();

    await updateExamSchedule(c.env.DB, parseInt(id), updateData);

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'update_exam_schedule',
      'exam_schedules',
      parseInt(id),
      `Updated exam schedule`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Cập nhật lịch thi thành công',
    });
  } catch (error) {
    return errorResponse('Lỗi cập nhật lịch thi: ' + error.message, 500);
  }
});

// ========================================
// DELETE /exam-schedules/:id - Delete exam schedule
// ========================================
examSchedules.delete('/:id', async (c) => {
  try {
    const user = c.get('user');

    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền xóa lịch thi', 403);
    }

    const { id } = c.req.param();

    await deleteExamSchedule(c.env.DB, parseInt(id));

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'delete_exam_schedule',
      'exam_schedules',
      parseInt(id),
      `Moved exam schedule to trash`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Đã chuyển vào thùng rác. Có thể khôi phục trong 7 ngày.',
    });
  } catch (error) {
    return errorResponse('Lỗi xóa lịch thi: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/restore - Restore from trash
// ========================================
examSchedules.post('/:id/restore', async (c) => {
  try {
    const user = c.get('user');

    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền khôi phục lịch thi', 403);
    }

    const { id } = c.req.param();

    const result = await restoreExamSchedule(c.env.DB, parseInt(id));

    if (result.meta?.changes === 0) {
      return errorResponse('Không tìm thấy lịch thi trong thùng rác', 404);
    }

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'restore_exam_schedule',
      'exam_schedules',
      parseInt(id),
      `Restored exam schedule from trash`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Khôi phục lịch thi thành công',
    });
  } catch (error) {
    return errorResponse('Lỗi khôi phục lịch thi: ' + error.message, 500);
  }
});

// ========================================
// DELETE /exam-schedules/:id/permanent - Permanently delete
// ========================================
examSchedules.delete('/:id/permanent', async (c) => {
  try {
    const user = c.get('user');

    if (!user || !user.role) {
      return errorResponse('Chỉ admin mới có quyền xóa vĩnh viễn', 403);
    }

    const { id } = c.req.param();

    const result = await permanentlyDeleteExamSchedule(c.env.DB, parseInt(id));

    if (result.meta?.changes === 0) {
      return errorResponse('Không tìm thấy lịch thi trong thùng rác', 404);
    }

    // Log activity (fire-and-forget)
    createActivityLog(
      c.env.DB,
      user.id,
      'permanent_delete_exam_schedule',
      'exam_schedules',
      parseInt(id),
      `Permanently deleted exam schedule`,
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
      c.req.header('User-Agent')
    ).catch(err => console.error('Activity log error:', err));

    return jsonResponse({
      success: true,
      message: 'Đã xóa vĩnh viễn lịch thi',
    });
  } catch (error) {
    return errorResponse('Lỗi xóa vĩnh viễn: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/register - Student registers for exam
// ========================================
examSchedules.post('/:id/register', async (c) => {
  try {
    const user = c.get('user');
    if (!user || user.type !== 'student') {
      return errorResponse('Chỉ sinh viên mới có thể đăng ký thi', 403);
    }
    const { id } = c.req.param();

    // Lấy thông tin kỳ thi để kiểm tra
    const exam = await c.env.DB.prepare(`
      SELECT exam_date, exam_name FROM exam_schedules WHERE id = ? AND deleted_at IS NULL
    `).bind(parseInt(id)).first();

    if (!exam) {
      return errorResponse('Không tìm thấy kỳ thi', 404);
    }



    try {
      await registerStudentForExam(c.env.DB, parseInt(id), user.id);
    } catch (e) {
      if (e?.code === 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION') {
        return jsonResponse({
          success: false,
          code: e.code,
          message: `Bạn đã đăng ký tối đa ${e.details?.max || 2} kỳ thi cùng lúc. Vui lòng hủy một đăng ký trước khi đăng ký thêm.`,
          details: e.details || {}
        }, 400);
      }
      throw e;
    }

    return jsonResponse({ success: true, message: 'Đăng ký thành công' });
  } catch (error) {
    return errorResponse('Lỗi đăng ký: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/cancel - Student cancels registration
// ========================================
examSchedules.post('/:id/cancel', async (c) => {
  try {
    const user = c.get('user');
    if (!user || user.type !== 'student') {
      return errorResponse('Chỉ sinh viên mới có thể hủy đăng ký', 403);
    }
    const { id } = c.req.param();
    await cancelExamRegistration(c.env.DB, parseInt(id), user.id);

    return jsonResponse({ success: true, message: 'Hủy đăng ký thành công' });
  } catch (error) {
    return errorResponse('Lỗi hủy đăng ký: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/:id/students - Admin gets registered students
// ========================================
examSchedules.get('/:id/students', async (c) => {
  try {
    const user = c.get('user');
    // Admin, Teacher, Super Admin
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id } = c.req.param();
    const students = await getExamRegistrations(c.env.DB, parseInt(id));

    return jsonResponse({ success: true, data: students });
  } catch (error) {
    return errorResponse('Lỗi lấy danh sách thí sinh: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/students - Admin adds students to exam (Bulk)
// ========================================
examSchedules.post('/:id/students', async (c) => {
  try {
    const user = c.get('user');
    // Admin, Teacher, Super Admin
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id } = c.req.param();
    const { student_ids, force } = await c.req.json();

    if (!student_ids || !Array.isArray(student_ids)) {
      return errorResponse('Danh sách student_ids không hợp lệ', 400);
    }

    // Process all registrations - Admin thêm = auto approved
    const results = [];
    for (const studentId of student_ids) {
      try {
        await registerStudentForExam(c.env.DB, parseInt(id), studentId, user.id, { force: !!force });
        results.push({ student_id: studentId, status: 'success' });
      } catch (err) {
        if (err?.code === 'STUDENT_ALREADY_HAS_ACTIVE_EXAM_REGISTRATION') {
          results.push({ student_id: studentId, status: 'blocked', code: err.code, details: err.details || {} });
        } else {
          results.push({ student_id: studentId, status: 'error', error: err.message });
        }
      }
    }

    return jsonResponse({
      success: true,
      message: `Đã xử lý ${results.length} yêu cầu`,
      results
    });
  } catch (error) {
    return errorResponse('Lỗi thêm thí sinh: ' + error.message, 500);
  }
});

// ========================================
// DELETE /exam-schedules/:id/students/:studentId - Admin removes student
// ========================================
examSchedules.delete('/:id/students/:studentId', async (c) => {
  try {
    const user = c.get('user');
    // Admin, Teacher, Super Admin
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id, studentId } = c.req.param();
    await cancelExamRegistration(c.env.DB, parseInt(id), parseInt(studentId));

    return jsonResponse({ success: true, message: 'Đã xóa thí sinh khỏi kỳ thi' });
  } catch (error) {
    return errorResponse('Lỗi xóa thí sinh: ' + error.message, 500);
  }
});

// ========================================
// GET /exam-schedules/:id/pending - Get pending registrations
// ========================================
examSchedules.get('/:id/pending', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id } = c.req.param();
    const students = await getPendingExamRegistrations(c.env.DB, parseInt(id));

    return jsonResponse({ success: true, data: students });
  } catch (error) {
    return errorResponse('Lỗi lấy danh sách chờ duyệt: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/approve/:studentId - Approve 1 student
// ========================================
examSchedules.post('/:id/approve/:studentId', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id, studentId } = c.req.param();
    await approveExamRegistration(c.env.DB, parseInt(id), parseInt(studentId), user.id);

    const examSchedule = await c.env.DB.prepare(`
      SELECT exam_test_id FROM exam_schedules WHERE id = ?
    `).bind(parseInt(id)).first();

    if (examSchedule?.exam_test_id) {
      const registration = await checkRegistrationStatus(c.env.DB, parseInt(studentId), examSchedule.exam_test_id);
      if (registration && registration.status === 'pending') {
        await approveExamTestRegistration(c.env.DB, registration.id, user.id);
      } else if (!registration) {
        try {
          await registerForExamTest(c.env.DB, parseInt(studentId), examSchedule.exam_test_id);
          const newReg = await checkRegistrationStatus(c.env.DB, parseInt(studentId), examSchedule.exam_test_id);
          if (newReg) {
            await approveExamTestRegistration(c.env.DB, newReg.id, user.id);
          }
        } catch (err) {
          console.error('Error auto-registering for exam test:', err);
        }
      }
    }

    return jsonResponse({ success: true, message: 'Đã duyệt thí sinh' });
  } catch (error) {
    return errorResponse('Lỗi duyệt thí sinh: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/approve-all - Approve all pending
// ========================================
examSchedules.post('/:id/approve-all', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id } = c.req.param();
    const result = await approveAllExamRegistrations(c.env.DB, parseInt(id), user.id);

    const examSchedule = await c.env.DB.prepare(`
      SELECT exam_test_id FROM exam_schedules WHERE id = ?
    `).bind(parseInt(id)).first();

    if (examSchedule?.exam_test_id) {
      const approvedRegistrations = await getExamRegistrations(c.env.DB, parseInt(id));
      for (const reg of approvedRegistrations) {
        if (reg.registration_status === 'approved') {
          const testReg = await checkRegistrationStatus(c.env.DB, reg.student_id, examSchedule.exam_test_id);
          if (testReg && testReg.status === 'pending') {
            await approveExamTestRegistration(c.env.DB, testReg.id, user.id);
          } else if (!testReg) {
            try {
              await registerForExamTest(c.env.DB, reg.student_id, examSchedule.exam_test_id);
              const newReg = await checkRegistrationStatus(c.env.DB, reg.student_id, examSchedule.exam_test_id);
              if (newReg) {
                await approveExamTestRegistration(c.env.DB, newReg.id, user.id);
              }
            } catch (err) {
              console.error(`Error auto-registering student ${reg.student_id} for exam test:`, err);
            }
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      message: `Đã duyệt ${result.meta?.changes || 0} thí sinh`
    });
  } catch (error) {
    return errorResponse('Lỗi duyệt tất cả: ' + error.message, 500);
  }
});

// ========================================
// POST /exam-schedules/:id/reject/:studentId - Reject 1 student
// ========================================
examSchedules.post('/:id/reject/:studentId', async (c) => {
  try {
    const user = c.get('user');
    if (!user || !['admin', 'super_admin', 'teacher'].includes(user.role)) {
      return errorResponse('Không có quyền truy cập', 403);
    }

    const { id, studentId } = c.req.param();
    await rejectExamRegistration(c.env.DB, parseInt(id), parseInt(studentId), user.id);

    return jsonResponse({ success: true, message: 'Đã từ chối thí sinh' });
  } catch (error) {
    return errorResponse('Lỗi từ chối thí sinh: ' + error.message, 500);
  }
});

export default examSchedules;
