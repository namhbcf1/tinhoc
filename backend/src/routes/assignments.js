import { Hono } from 'hono';
import { errorResponse, successResponse, jsonResponse, verifyJWT } from '../utils/helpers.js';
import { strictRateLimiter } from '../utils/rate-limiter.js';
import { authMiddleware, requireAdmin } from '../middleware/auth-middleware.js';

const assignments = new Hono();

// ========================================
// HELPERS
// ========================================

// Blocked file extensions (security)
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.sh', '.zip', '.rar', '.7z'];

// Magic bytes check for common safe file types
const MAGIC_BYTES = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'video/mp4': null, // Complex, skip magic check
    'video/webm': null,
};

function checkMagicBytes(buffer, expectedType) {
    const expected = MAGIC_BYTES[expectedType];
    if (!expected) return true; // Skip check for complex types

    const bytes = new Uint8Array(buffer.slice(0, expected.length));
    return expected.every((b, i) => bytes[i] === b);
}

function isBlockedFile(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return BLOCKED_EXTENSIONS.includes(ext);
}

// authMiddleware and requireAdmin imported from shared auth-middleware.js
// adminOnly alias for route-level use (imported as requireAdmin)
const adminOnly = requireAdmin;

/**
 * Student auth via CCCD header or JWT
 */
const studentAuth = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const studentCCCD = c.req.header('X-Student-CCCD');

    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyJWT(token, c.env.JWT_SECRET);
        // verifyJWT handles exp validation (seconds standard); truthy = valid & not expired
        if (payload) {
            c.set('user', payload);
            c.set('isAdmin', payload.role === 'admin' || payload.role === 'super_admin');
            await next();
            return;
        }
    }

    if (studentCCCD) {
        const db = c.env.DB;
        const student = await db.prepare('SELECT id, cccd, ho_ten_full FROM students WHERE cccd = ?')
            .bind(studentCCCD).first();

        if (student) {
            c.set('student', student);
            c.set('isAdmin', false);
            await next();
            return;
        }
    }

    return errorResponse('Vui lòng đăng nhập', 401);
};

// ========================================
// ADMIN ROUTES
// ========================================

/**
 * GET /assignments - List assignments (filter by class)
 */
assignments.get('/', authMiddleware, async (c) => {
    const db = c.env.DB;
    const { class_id, status = 'open' } = c.req.query();

    let query = 'SELECT * FROM assignments WHERE 1=1';
    const params = [];

    if (class_id) {
        query += ' AND class_id = ?';
        params.push(parseInt(class_id));
    }

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const results = await db.prepare(query).bind(...params).all();

    return successResponse({
        assignments: results.results,
        count: results.results.length
    });
});

/**
 * POST /assignments - Create new assignment (Admin only)
 */
assignments.post('/', authMiddleware, adminOnly, async (c) => {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();

    const {
        title,
        description,
        class_id,
        due_date,
        max_file_size = 10485760, // 10MB
        allowed_types = 'image/*,video/*,application/pdf',
        max_attempts = 1
    } = body;

    if (!title || !class_id) {
        return errorResponse('Thiếu title hoặc class_id', 400);
    }

    // Verify class exists
    const classExists = await db.prepare('SELECT id FROM online_classes WHERE id = ?')
        .bind(class_id).first();

    if (!classExists) {
        return errorResponse('Lớp học không tồn tại', 404);
    }

    const result = await db.prepare(`
    INSERT INTO assignments (title, description, class_id, due_date, max_file_size, allowed_types, max_attempts, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
        title,
        description || null,
        class_id,
        due_date || null,
        max_file_size,
        allowed_types,
        max_attempts,
        user.id
    ).run();

    const newAssignment = await db.prepare('SELECT * FROM assignments WHERE id = ?')
        .bind(result.meta.last_row_id).first();

    return successResponse({
        message: 'Tạo bài tập thành công',
        assignment: newAssignment
    }, 201);
});

/**
 * PUT /assignments/:id - Update assignment (Admin only)
 */
assignments.put('/:id', authMiddleware, adminOnly, async (c) => {
    const db = c.env.DB;
    const { id } = c.req.param();
    const body = await c.req.json();

    const existing = await db.prepare('SELECT * FROM assignments WHERE id = ?')
        .bind(id).first();

    if (!existing) {
        return errorResponse('Bài tập không tồn tại', 404);
    }

    const { title, description, due_date, status, max_attempts } = body;

    const updates = [];
    const params = [];

    if (title) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (max_attempts) { updates.push('max_attempts = ?'); params.push(max_attempts); }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await db.prepare(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params).run();

    const updated = await db.prepare('SELECT * FROM assignments WHERE id = ?')
        .bind(id).first();

    return successResponse({
        message: 'Cập nhật thành công',
        assignment: updated
    });
});

/**
 * DELETE /assignments/:id - Delete assignment + cleanup R2 (Admin only)
 */
assignments.delete('/:id', authMiddleware, adminOnly, async (c) => {
    const db = c.env.DB;
    const r2 = c.env.R2;
    const { id } = c.req.param();

    const existing = await db.prepare('SELECT * FROM assignments WHERE id = ?')
        .bind(id).first();

    if (!existing) {
        return errorResponse('Bài tập không tồn tại', 404);
    }

    // Get all submissions to delete R2 objects
    const submissions = await db.prepare(
        'SELECT r2_key FROM assignment_submissions WHERE assignment_id = ?'
    ).bind(id).all();

    // Delete R2 objects
    for (const sub of submissions.results) {
        try {
            await r2.delete(sub.r2_key);
        } catch (e) {
            console.error('Failed to delete R2 object:', sub.r2_key, e);
        }
    }

    // Delete from DB (cascade will delete submissions)
    await db.prepare('DELETE FROM assignments WHERE id = ?').bind(id).run();

    return successResponse({
        message: 'Xóa bài tập thành công',
        deleted_files: submissions.results.length
    });
});

// ========================================
// STUDENT SUBMISSION ROUTES
// ========================================

/**
 * GET /assignments/student - Get assignments for logged-in student's classes
 */
assignments.get('/student', studentAuth, async (c) => {
    const db = c.env.DB;
    const student = c.get('student');

    if (!student) {
        return errorResponse('Vui lòng đăng nhập với CCCD', 401);
    }

    // Get classes student is enrolled in
    const enrollments = await db.prepare(`
    SELECT online_class_id FROM online_class_enrollments 
    WHERE student_id = ? AND status = 'active'
  `).bind(student.id).all();

    if (enrollments.results.length === 0) {
        return successResponse({ assignments: [], count: 0 });
    }

    const classIds = enrollments.results.map(e => e.online_class_id);
    const placeholders = classIds.map(() => '?').join(',');

    // Get open assignments for enrolled classes
    const results = await db.prepare(`
    SELECT a.*, 
           (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND student_id = ?) as submission_count,
           (SELECT status FROM assignment_submissions WHERE assignment_id = a.id AND student_id = ? ORDER BY attempt DESC LIMIT 1) as latest_status,
           (SELECT grade FROM assignment_submissions WHERE assignment_id = a.id AND student_id = ? ORDER BY attempt DESC LIMIT 1) as latest_grade
    FROM assignments a
    WHERE a.class_id IN (${placeholders}) AND a.status = 'open'
    ORDER BY a.due_date ASC, a.created_at DESC
  `).bind(student.id, student.id, student.id, ...classIds).all();

    // Add computed fields
    const now = new Date().toISOString();
    const assignments = results.results.map(a => ({
        ...a,
        is_overdue: a.due_date && a.due_date < now,
        can_submit: a.status === 'open' && (!a.due_date || a.due_date >= now) && a.submission_count < a.max_attempts
    }));

    return successResponse({
        assignments,
        count: assignments.length
    });
});

/**
 * POST /assignments/:id/submit - Student submit file
 * Rate limited: max 5/minute
 */
assignments.post('/:id/submit', studentAuth, strictRateLimiter, async (c) => {
    const db = c.env.DB;
    const r2 = c.env.R2;
    const student = c.get('student');
    const { id } = c.req.param();

    if (!student) {
        return errorResponse('Vui lòng đăng nhập với CCCD', 401);
    }

    // 1. Get assignment
    const assignment = await db.prepare('SELECT * FROM assignments WHERE id = ?')
        .bind(id).first();

    if (!assignment) {
        return errorResponse('Bài tập không tồn tại', 404);
    }

    // 2. Check assignment status
    if (assignment.status !== 'open') {
        return errorResponse('Bài tập đã đóng', 400);
    }

    // 3. Check due date
    const now = new Date().toISOString();
    if (assignment.due_date && assignment.due_date < now) {
        return errorResponse('Đã quá hạn nộp bài', 400);
    }

    // 4. Check enrollment (student must be in the class)
    const enrolled = await db.prepare(`
    SELECT 1 FROM online_class_enrollments 
    WHERE online_class_id = ? AND student_id = ? AND status = 'active'
  `).bind(assignment.class_id, student.id).first();

    if (!enrolled) {
        return errorResponse('Bạn không thuộc lớp học này', 403);
    }

    // 5. Check attempt count
    const submissionCount = await db.prepare(`
    SELECT COUNT(*) as count FROM assignment_submissions 
    WHERE assignment_id = ? AND student_id = ?
  `).bind(id, student.id).first();

    if (submissionCount.count >= assignment.max_attempts) {
        return errorResponse(`Bạn đã nộp tối đa ${assignment.max_attempts} lần`, 400);
    }

    // 6. Get file from form data
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
        return errorResponse('Thiếu file', 400);
    }

    // 7. Check file extension (blocked list)
    if (isBlockedFile(file.name)) {
        return errorResponse('Loại file không được phép', 400);
    }

    // 8. Check file size
    if (file.size > assignment.max_file_size) {
        return errorResponse(`File quá lớn. Tối đa: ${Math.round(assignment.max_file_size / 1024 / 1024)}MB`, 400);
    }

    // 9. Read file and check magic bytes
    const buffer = await file.arrayBuffer();
    if (!checkMagicBytes(buffer, file.type)) {
        return errorResponse('File không hợp lệ (header không khớp)', 400);
    }

    // 10. Determine attempt number
    const attempt = submissionCount.count + 1;

    // 11. Generate R2 key with submission ID to prevent overwrite
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const r2Key = `assignments/${id}/${student.id}/${timestamp}-${sanitizedName}`;

    // 12. Upload to R2
    await r2.put(r2Key, buffer, {
        httpMetadata: {
            contentType: file.type,
        },
    });

    // 13. Save to database
    const result = await db.prepare(`
    INSERT INTO assignment_submissions 
    (assignment_id, student_id, attempt, r2_key, file_name, file_size, file_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
        id,
        student.id,
        attempt,
        r2Key,
        file.name,
        file.size,
        file.type
    ).run();

    return successResponse({
        message: 'Nộp bài thành công',
        submission: {
            id: result.meta.last_row_id,
            attempt,
            file_name: file.name
        }
    }, 201);
});

/**
 * GET /assignments/:id/my-submissions - Get student's own submissions
 */
assignments.get('/:id/my-submissions', studentAuth, async (c) => {
    const db = c.env.DB;
    const student = c.get('student');
    const { id } = c.req.param();

    if (!student) {
        return errorResponse('Vui lòng đăng nhập', 401);
    }

    const submissions = await db.prepare(`
    SELECT id, attempt, file_name, file_size, file_type, status, grade, feedback, submitted_at, graded_at
    FROM assignment_submissions
    WHERE assignment_id = ? AND student_id = ?
    ORDER BY attempt DESC
  `).bind(id, student.id).all();

    return successResponse({
        submissions: submissions.results
    });
});

/**
 * GET /assignments/submissions/:subId/file - Secure file download
 */
assignments.get('/submissions/:subId/file', studentAuth, async (c) => {
    const db = c.env.DB;
    const r2 = c.env.R2;
    const student = c.get('student');
    const isAdmin = c.get('isAdmin');
    const { subId } = c.req.param();

    const submission = await db.prepare(`
    SELECT s.*, a.class_id 
    FROM assignment_submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.id = ?
  `).bind(subId).first();

    if (!submission) {
        return errorResponse('Không tìm thấy bài nộp', 404);
    }

    // Check access: admin or owner
    if (!isAdmin && (!student || student.id !== submission.student_id)) {
        return errorResponse('Không có quyền xem file', 403);
    }

    // Stream from R2
    const object = await r2.get(submission.r2_key);

    if (!object) {
        return errorResponse('File không tồn tại trên storage', 404);
    }

    return new Response(object.body, {
        headers: {
            'Content-Type': submission.file_type || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${encodeURIComponent(submission.file_name)}"`,
            'Cache-Control': 'private, max-age=3600',
        },
    });
});

// ========================================
// ADMIN: VIEW & GRADE SUBMISSIONS
// ========================================

/**
 * GET /assignments/:id/submissions - List all submissions for an assignment (Admin)
 */
assignments.get('/:id/submissions', authMiddleware, adminOnly, async (c) => {
    const db = c.env.DB;
    const { id } = c.req.param();

    const submissions = await db.prepare(`
    SELECT s.*, st.ho_ten_full as student_name, st.cccd as student_cccd
    FROM assignment_submissions s
    JOIN students st ON s.student_id = st.id
    WHERE s.assignment_id = ?
    ORDER BY s.submitted_at DESC
  `).bind(id).all();

    return successResponse({
        submissions: submissions.results,
        count: submissions.results.length
    });
});

/**
 * PUT /assignments/submissions/:subId/grade - Grade a submission (Admin)
 */
assignments.put('/submissions/:subId/grade', authMiddleware, adminOnly, async (c) => {
    const db = c.env.DB;
    const { subId } = c.req.param();
    const body = await c.req.json();

    const { grade, feedback, status = 'graded' } = body;

    const existing = await db.prepare('SELECT * FROM assignment_submissions WHERE id = ?')
        .bind(subId).first();

    if (!existing) {
        return errorResponse('Bài nộp không tồn tại', 404);
    }

    await db.prepare(`
    UPDATE assignment_submissions 
    SET grade = ?, feedback = ?, status = ?, graded_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(grade, feedback || null, status, subId).run();

    const updated = await db.prepare('SELECT * FROM assignment_submissions WHERE id = ?')
        .bind(subId).first();

    return successResponse({
        message: 'Chấm điểm thành công',
        submission: updated
    });
});

export default assignments;
