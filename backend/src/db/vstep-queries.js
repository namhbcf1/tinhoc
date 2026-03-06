// backend/src/db/vstep-queries.js

// ==========================================
// VSTEP EXAM SYSTEM QUERIES
// ==========================================

export const getVStepExams = async (db, options = {}) => {
    const { status, exam_type, limit = 50, offset = 0 } = options;
    let query = 'SELECT * FROM vstep_exams';
    const params = [];
    const conditions = [];

    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }

    // Filter by exam_type: match vstep_exams.code against allowed types (case-insensitive)
    // exam_type can be a single string or array of strings
    if (exam_type) {
        const types = Array.isArray(exam_type) ? exam_type : [exam_type];
        if (types.length > 0) {
            // Build LOWER(code) IN (?, ?, ...) condition
            const placeholders = types.map(() => '?').join(', ');
            conditions.push(`LOWER(code) IN (${placeholders})`);
            types.forEach(t => params.push(t.toLowerCase()));
        }
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await db.prepare(query).bind(...params).all();
    return results;
};

export const getVStepExamById = async (db, id) => {
    return db.prepare('SELECT * FROM vstep_exams WHERE id = ?').bind(id).first();
};

export const getVStepFullExamData = async (db, id) => {
    // 1. Get Exam Info
    const exam = await db.prepare('SELECT * FROM vstep_exams WHERE id = ?').bind(id).first();
    if (!exam) return null;

    // 2. Get Sections
    const { results: sections } = await db.prepare(
        'SELECT * FROM vstep_sections WHERE exam_id = ? ORDER BY order_index ASC'
    ).bind(id).all();

    // 3. Get Groups & Questions for each section
    for (const section of sections) {
        // Groups
        const { results: groups } = await db.prepare(
            'SELECT * FROM vstep_question_groups WHERE section_id = ? ORDER BY order_index ASC'
        ).bind(section.id).all();

        // Questions (Get all for section, then map to groups)
        const { results: questions } = await db.prepare(
            'SELECT * FROM vstep_questions WHERE section_id = ? ORDER BY order_index ASC'
        ).bind(section.id).all();

        // Map questions to groups or standalone
        // Parse JSON fields
        const parsedQuestions = questions.map(q => ({
            ...q,
            options: q.options_json ? JSON.parse(q.options_json) : [],
            settings: q.settings_json ? JSON.parse(q.settings_json) : {}
        }));

        // Attach questions to groups
        section.groups = groups.map(g => ({
            ...g,
            questions: parsedQuestions.filter(q => q.group_id === g.id)
        }));

        // Standalone questions (group_id is null)
        section.standalone_questions = parsedQuestions.filter(q => !q.group_id);
    }

    return { ...exam, sections };
};

export const createVStepExam = async (db, data) => {
    const { title, description, code, level, duration, thumbnail_url, created_by } = data;
    return db.prepare(`
    INSERT INTO vstep_exams (title, description, code, level, duration, thumbnail_url, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(title, description, code, level, duration, thumbnail_url, created_by).run();
};

// ==========================================
// IMPORT LOGIC (Transaction-like)
// ==========================================

export const importVStepExam = async (db, fullData) => {
    // SQLite D1 doesn't support massive transactions easily, so we go linear.
    // We assume valid structure from the API layer.

    // 1. Create Exam
    const examRes = await createVStepExam(db, fullData.exam);
    const examId = examRes.meta.last_row_id;

    // 2. Sections
    for (const section of fullData.sections) {
        const secRes = await db.prepare(`
      INSERT INTO vstep_sections (exam_id, type, title, order_index, duration, instructions)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
            examId, section.type, section.title, section.order_index, section.duration, section.instructions
        ).run();
        const sectionId = secRes.meta.last_row_id;

        // 3. Groups
        for (const group of section.groups) {
            const groupRes = await db.prepare(`
        INSERT INTO vstep_question_groups (section_id, title, text_content, audio_url, image_url, order_index, settings_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
                sectionId, group.title, group.text_content, group.audio_url, group.image_url, group.order_index, JSON.stringify(group.settings || {})
            ).run();
            const groupId = groupRes.meta.last_row_id;

            // 4. Questions (Grouped)
            for (const q of group.questions) {
                await db.prepare(`
          INSERT INTO vstep_questions (group_id, section_id, content, type, options_json, correct_answer, points, settings_json, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    groupId, sectionId, q.content, q.type,
                    JSON.stringify(q.options || []), q.correct_answer, q.points,
                    JSON.stringify(q.settings || {}), q.order_index
                ).run();
            }
        }

        // 3b. Standalone Questions
        if (section.standalone_questions) {
            for (const q of section.standalone_questions) {
                await db.prepare(`
          INSERT INTO vstep_questions (group_id, section_id, content, type, options_json, correct_answer, points, settings_json, order_index)
          VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    sectionId, q.content, q.type,
                    JSON.stringify(q.options || []), q.correct_answer, q.points,
                    JSON.stringify(q.settings || {}), q.order_index
                ).run();
            }
        }
    }

    return { examId };
};

// ==========================================
// ATTEMPTS
// ==========================================

export const createVStepAttempt = async (db, studentId, examId) => {
    return db.prepare(`
        INSERT INTO vstep_exam_attempts (student_id, exam_id, start_time, status)
        VALUES (?, ?, datetime('now'), 'in_progress')
    `).bind(studentId, examId).run();
};

export const getVStepAttempt = async (db, id) => {
    return db.prepare('SELECT * FROM vstep_exam_attempts WHERE id = ?').bind(id).first();
};

export const saveVStepAnswer = async (db, attemptId, questionId, answerText) => {
    // Upsert answer
    // Note: D1 SQLite upsert syntax
    return db.prepare(`
        INSERT INTO vstep_answers (attempt_id, question_id, answer_text, updated_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(attempt_id, question_id) 
        DO UPDATE SET answer_text = excluded.answer_text, updated_at = excluded.updated_at
    `).bind(attemptId, questionId, answerText).run();
};

export const submitVStepAttempt = async (db, attemptId) => {
    return db.prepare(`
        UPDATE vstep_exam_attempts 
        SET status = 'completed', submit_time = datetime('now')
        WHERE id = ?
    `).bind(attemptId).run();
};
