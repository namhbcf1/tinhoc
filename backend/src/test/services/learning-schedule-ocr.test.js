import { describe, expect, it } from 'vitest';
import { isHourMinute, isIsoDate, parseLearningScheduleText, } from '../../services/learning-schedule-ocr.js';
describe('learning schedule OCR parser', () => {
    it('normalizes table-like lines into sessions', () => {
        const text = [
            'Buổi 1-Khai giảng Thứ 7 21/03/2026 19h45-21h30',
            'Buổi 2 Thứ 3 24/03/2026 19h45-21h30',
            'Buổi 3 Thứ 4 25/03/2026 19h45-21h30',
        ].join('\n');
        const rows = parseLearningScheduleText(text, { anchorYear: 2026 });
        expect(rows).toHaveLength(3);
        expect(rows[0]).toMatchObject({
            session_date: '2026-03-21',
            start_time: '19:45',
            end_time: '21:30',
            status: 'ready',
        });
    });
    it('auto-corrects OCR year drift 25/03/206 -> 2026 with warning metadata', () => {
        const text = 'Buổi 3 Thứ 4 25/03/206 19h45-21h30';
        const rows = parseLearningScheduleText(text, { anchorYear: 2026 });
        expect(rows).toHaveLength(1);
        expect(rows[0].session_date).toBe('2026-03-25');
        expect(rows[0].auto_corrected).toBe(true);
        expect(rows[0].corrections.some((item) => item.includes('Tự sửa năm 206'))).toBe(true);
    });
    it('marks invalid date 31/04/2026 as needs_review', () => {
        const text = 'Buổi 6 Thứ 2 31/04/2026 19h45-21h30';
        const rows = parseLearningScheduleText(text, { anchorYear: 2026 });
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe('needs_review');
        expect(rows[0].session_date).toBeNull();
        expect(rows[0].warnings.some((item) => item.includes('Ngày không tồn tại'))).toBe(true);
    });
    it('validates normalized date/time helpers', () => {
        expect(isIsoDate('2026-03-25')).toBe(true);
        expect(isIsoDate('2026-02-30')).toBe(false);
        expect(isHourMinute('19:45')).toBe(true);
        expect(isHourMinute('24:01')).toBe(false);
    });
});
