// Lịch sử làm đề thi (vantrangexam) theo kỳ thi/lớp ở vantrangedu.
// Liên kết: exam_schedules.exam_category_id === vstep_exams.category_id (cùng bảng exam_categories).
// Học viên của kỳ thi = exam_registrations (pending/approved/registered).

export async function getExamAttemptHistory(db: D1Database, scheduleId: number) {
  const schedule = await db
    .prepare(
      `SELECT id, exam_name, exam_category_id
       FROM exam_schedules
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`
    )
    .bind(scheduleId)
    .first<any>();

  if (!schedule) {
    return null;
  }

  const categoryId = schedule.exam_category_id;

  // Đề thi thuộc đúng loại (Tiếng Anh / Tin học) của kỳ thi.
  const examsResult = await db
    .prepare(
      `SELECT id, title, code, level, status
       FROM vstep_exams
       WHERE category_id = ? AND status = 'published'
       ORDER BY id`
    )
    .bind(categoryId)
    .all();
  const exams = (examsResult.results || []) as any[];
  const examIds = exams.map((exam) => exam.id);

  // Học viên đăng ký trong kỳ thi này.
  const regsResult = await db
    .prepare(
      `SELECT student_id
       FROM exam_registrations
       WHERE exam_id = ? AND status IN ('pending', 'approved', 'registered')`
    )
    .bind(scheduleId)
    .all();
  const studentIds = ((regsResult.results || []) as any[]).map((row) => row.student_id);

  const perStudent: Record<
    number,
    {
      student_id: number;
      ho_ten_full: string;
      cccd: string | null;
      total_attempts: number;
      distinct_exams: number;
      completed_attempts: number;
      in_progress_attempts: number;
      avg_score: number | null;
      best_score: number | null;
      first_start: string | null;
      last_activity: string | null;
      exams: Record<number, { exam_id: number; exam_title: string; attempts: number; completed_attempts: number; in_progress_attempts: number; avg_score: number | null; best_score: number | null }>;
    }
  > = {};

  if (studentIds.length > 0 && examIds.length > 0) {
    const studentPlaceholders = studentIds.map(() => '?').join(',');
    const examPlaceholders = examIds.map(() => '?').join(',');
    const rowsResult = await db
      .prepare(
        `SELECT
           a.student_id,
           s.ho_ten_full,
           s.cccd,
           e.id as exam_id,
           e.title as exam_title,
           a.status,
           a.total_score,
           a.start_time,
           COALESCE(a.submit_time, a.start_time) as activity_time
         FROM vstep_exam_attempts a
         JOIN students s ON s.id = a.student_id
         JOIN vstep_exams e ON e.id = a.exam_id
         WHERE a.student_id IN (${studentPlaceholders})
           AND a.exam_id IN (${examPlaceholders})
         ORDER BY a.student_id, e.id, a.start_time`
      )
      .bind(...studentIds, ...examIds)
      .all();
    const rows = (rowsResult.results || []) as any[];

    for (const row of rows) {
      const sid = Number(row.student_id);
      let entry = perStudent[sid];
      if (!entry) {
        entry = {
          student_id: sid,
          ho_ten_full: row.ho_ten_full || '',
          cccd: row.cccd || null,
          total_attempts: 0,
          distinct_exams: 0,
          completed_attempts: 0,
          in_progress_attempts: 0,
          avg_score: null,
          best_score: null,
          first_start: null,
          last_activity: null,
          exams: {},
        };
        perStudent[sid] = entry;
      }

      const eid = Number(row.exam_id);
      let examAgg = entry.exams[eid];
      if (!examAgg) {
        examAgg = {
          exam_id: eid,
          exam_title: row.exam_title || '',
          attempts: 0,
          completed_attempts: 0,
          in_progress_attempts: 0,
          avg_score: null,
          best_score: null,
        };
        entry.exams[eid] = examAgg;
        entry.distinct_exams += 1;
      }

      examAgg.attempts += 1;
      entry.total_attempts += 1;

      if (row.status === 'completed') {
        examAgg.completed_attempts += 1;
        entry.completed_attempts += 1;
      } else if (row.status === 'in_progress') {
        examAgg.in_progress_attempts += 1;
        entry.in_progress_attempts += 1;
      }

      const score = row.total_score === null || row.total_score === undefined ? null : Number(row.total_score);
      if (score !== null) {
        if (examAgg.avg_score === null) {
          examAgg.avg_score = score;
          examAgg.best_score = score;
        } else {
          examAgg.avg_score = (examAgg.avg_score * (examAgg.attempts - 1) + score) / examAgg.attempts;
          examAgg.best_score = Math.max(examAgg.best_score as number, score);
        }
        if (entry.avg_score === null) {
          entry.avg_score = score;
          entry.best_score = score;
        } else {
          entry.avg_score = (entry.avg_score * (entry.completed_attempts + entry.in_progress_attempts - 1) + score) / (entry.completed_attempts + entry.in_progress_attempts);
          entry.best_score = Math.max(entry.best_score as number, score);
        }
      }

      if (entry.first_start === null || row.activity_time < entry.first_start) {
        entry.first_start = row.activity_time;
      }
      if (entry.last_activity === null || row.activity_time > entry.last_activity) {
        entry.last_activity = row.activity_time;
      }
    }
  }

  const students = Object.values(perStudent).map((entry) => {
    const roundScore = (value: number | null) => (value === null ? null : Number(value.toFixed(2)));
    return {
      ...entry,
      avg_score: roundScore(entry.avg_score),
      best_score: roundScore(entry.best_score),
      exams: Object.values(entry.exams).map((examAgg) => ({
        ...examAgg,
        avg_score: roundScore(examAgg.avg_score),
        best_score: roundScore(examAgg.best_score),
      })),
    };
  });

  return {
    schedule: {
      id: schedule.id,
      exam_name: schedule.exam_name,
      exam_category_id: categoryId,
    },
    exams,
    students,
  };
}