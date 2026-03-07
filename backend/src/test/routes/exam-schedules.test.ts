import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as attendanceQueries from '../../db/attendance-queries.js';
import * as examRepo from '../../repositories/exam-repository.js';

vi.mock('../../db/attendance-queries.js', () => ({
    getStudentExams: vi.fn(),
    registerStudentForExam: vi.fn(),
}));

vi.mock('../../repositories/exam-repository.js', () => ({
    getExamTestById: vi.fn(),
}));

describe('Exam Schedules - Mocked 3-Tier Tests', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('getStudentExams returns array of exams', async () => {
        (attendanceQueries.getStudentExams as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1, name: 'VSTEP Midterm', room: 'A101' }]);
        const exams = await attendanceQueries.getStudentExams(99);
        expect(exams).toHaveLength(1);
        expect(exams[0].room).toBe('A101');
        expect(attendanceQueries.getStudentExams).toHaveBeenCalledWith(99);
    });

    it('registerStudentForExam processes exam seating successfully', async () => {
        (attendanceQueries.registerStudentForExam as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, bookingId: 'BOOK123' });
        const res = await attendanceQueries.registerStudentForExam({ student_id: 99, exam_id: 1 });
        expect(res.success).toBe(true);
        expect(res.bookingId).toBe('BOOK123');
    });
});
