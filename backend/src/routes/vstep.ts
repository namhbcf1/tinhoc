// backend/src/routes/vstep.ts
import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { jsonResponse, errorResponse, verifyJWT } from '../utils/helpers.js';
import {
    getVStepExams,
    getVStepFullExamData,
    importVStepExam,
    createVStepAttempt,
    getVStepAttempt,
    saveVStepAnswer,
    submitVStepAttempt
} from '../db/vstep-queries.js';

const vstep = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// Middleware: Verify Token
const authMiddleware = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return errorResponse('Missing Token', 401);
    const token = authHeader.replace('Bearer ', '');
    const user = await verifyJWT(token, c.env.JWT_SECRET);
    if (!user) return errorResponse('Invalid Token', 401);
    c.set('user', user);
    await next();
};

// Middleware: Admin Only
const adminMiddleware = async (c: any, next: any) => {
    const user = c.get('user') as any;
    if (user.role !== 'admin' && user.role !== 'super_admin') {
        return errorResponse('Admin Access Required', 403);
    }
    await next();
};

// ==========================================
// PUBLIC / STUDENT ROUTES
// ==========================================

// List Exams — filters by student's class types if student token is present
vstep.get('/exams', async (c) => {
    try {
        const { status } = c.req.query();

        // Attempt to identify student from token (optional auth — don't block if missing)
        let classTypeFilter: string[] | null = null;
        try {
            const authHeader = c.req.header('Authorization');
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const user = await verifyJWT(token, c.env.JWT_SECRET);

                // Only filter for students — admins/teachers see all exams
                if (user && (user as any).type === 'student') {
                    const { results: regs } = await c.env.DB.prepare(`
                        SELECT DISTINCT c.class_type
                        FROM registrations r
                        JOIN classes c ON r.class_id = c.id
                        WHERE r.student_id = ? AND r.status != 'cancelled' AND c.class_type IS NOT NULL
                    `).bind((user as any).id).all();

                    if (regs && regs.length > 0) {
                        classTypeFilter = regs.map((r: any) => r.class_type.toLowerCase());
                    }
                }
            }
        } catch {
            // Token invalid or missing — serve full list (no filter)
        }

        const exams = await getVStepExams(c.env.DB, {
            status,
            exam_type: classTypeFilter ?? undefined, // null = no filter (admin/no token/no registrations)
        });
        return jsonResponse({ success: true, data: exams });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});

// Get Full Exam (Structure + Questions)
// NOTE: For students, we might want to hide correct_answer.
// For now, we return distinct fields or frontend hides it.
// Ideally, use a "Student View" projection.
vstep.get('/exams/:id', authMiddleware, async (c) => {
    try {
        const { id } = c.req.param();
        const data = await getVStepFullExamData(c.env.DB, parseInt(id));
        if (!data) return errorResponse('Exam not found', 404);

        // Security: Remove correct_answers for students
        const user = c.get('user') as any;
        if (user.role === 'student') {
            data.sections.forEach((sec: any) => {
                if (sec.groups) {
                    sec.groups.forEach((g: any) => {
                        g.questions.forEach((q: any) => delete q.correct_answer);
                    });
                }
                if (sec.standalone_questions) {
                    sec.standalone_questions.forEach((q: any) => delete q.correct_answer);
                }
            });
        }

        return jsonResponse({ success: true, data });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});

// My exam history — MUST be before /:id routes
vstep.get('/attempts/my-history', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as any;
        const limit = parseInt(c.req.query('limit') || '5');
        const { results } = await c.env.DB.prepare(`
            SELECT a.*, e.title as exam_title, e.level, e.code
            FROM vstep_exam_attempts a
            LEFT JOIN vstep_exams e ON e.id = a.exam_id
            WHERE a.student_id = ?
            ORDER BY a.start_time DESC
            LIMIT ?
        `).bind(user.id, limit).all();
        return jsonResponse({ success: true, data: results });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});

// Get single attempt
vstep.get('/attempts/:id', authMiddleware, async (c) => {
    try {
        const { id } = c.req.param();
        const attempt = await getVStepAttempt(c.env.DB, parseInt(id));
        if (!attempt) return errorResponse('Attempt not found', 404);
        return jsonResponse({ success: true, data: attempt });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});

// Start Attempt
vstep.post('/attempts', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as any;
        const { exam_id } = await c.req.json();

        // TODO: Check if exam is published
        const result = await createVStepAttempt(c.env.DB, user.id, exam_id);

        return jsonResponse({
            success: true,
            data: { attempt_id: result.meta.last_row_id }
        });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});

// Save Answer (Debounced auto-save)
vstep.post('/attempts/:id/save', authMiddleware, async (c) => {
    try {
        const { id } = c.req.param();
        const { question_id, answer_text } = await c.req.json();

        // Verify ownership (security)
        const user = c.get('user') as any;
        const attempt = await getVStepAttempt(c.env.DB, parseInt(id));
        if (!attempt || (attempt as any).student_id !== user.id) {
            return errorResponse('Access Denied', 403);
        }

        await saveVStepAnswer(c.env.DB, parseInt(id), question_id, answer_text);
        return jsonResponse({ success: true });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});

// Submit Attempt
vstep.post('/attempts/:id/submit', authMiddleware, async (c) => {
    try {
        const { id } = c.req.param();
        await submitVStepAttempt(c.env.DB, parseInt(id));
        // TODO: Trigger Auto-grading for Reading/Listening
        return jsonResponse({ success: true, message: 'Exam Submitted' });
    } catch (e: any) {
        return errorResponse(e.message, 500);
    }
});


// ==========================================
// ADMIN ROUTES
// ==========================================

vstep.use('/import', authMiddleware, adminMiddleware);
vstep.post('/import', async (c) => {
    try {
        const data = await c.req.json(); // Full JSON structure

        if (!data.exam || !data.sections) {
            return errorResponse('Invalid JSON Structure', 400);
        }

        const result = await importVStepExam(c.env.DB, data);
        return jsonResponse({
            success: true,
            message: 'Import Successful',
            data: { exam_id: result.examId }
        });
    } catch (e: any) {
        return errorResponse('Import Failed: ' + e.message, 500);
    }
});

export default vstep;
