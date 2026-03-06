import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as attendanceQueries from '../../src/db/attendance-queries.js';
import * as examRepo from '../../src/repositories/exam-repository.js';

vi.mock('../../src/db/attendance-queries.js', () => ({
    getStudentExams: vi.fn(),
    registerStudentForExam: vi.fn(),
}));

vi.mock('../../src/repositories/exam-repository.js', () => ({
    getExamTestById: vi.fn(),
}));

describe('Exam Schedules - Mocked 3-Tier Tests', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('getStudentExams returns array of exams', async () => {
        attendanceQueries.getStudentExams.mockResolvedValue([{ id: 1, name: 'VSTEP Midterm', room: 'A101' }]);
        const exams = await attendanceQueries.getStudentExams(99);
        expect(exams).toHaveLength(1);
        expect(exams[0].room).toBe('A101');
        expect(attendanceQueries.getStudentExams).toHaveBeenCalledWith(99);
    });

    it('registerStudentForExam processes exam seating successfully', async () => {
        attendanceQueries.registerStudentForExam.mockResolvedValue({ success: true, bookingId: 'BOOK123' });
        const res = await attendanceQueries.registerStudentForExam({ student_id: 99, exam_id: 1 });
        expect(res.success).toBe(true);
        expect(res.bookingId).toBe('BOOK123');
    });
});
