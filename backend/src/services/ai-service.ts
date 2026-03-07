import * as StudentRepo from '../repositories/student-repository.js';
import { errorResponse } from '../utils/helpers.js';
import { AI_PERSONA_GUIDELINES } from './ai-persona.js';
import type { Env } from '../types/env.js';

export async function queryAI(c: { env: Env }, studentCCCD: string, userMessage: string): Promise<string> {
    const db = c.env.DB;
    const ai = c.env.AI;

    // 1. Fetch Student Context
    const student = await StudentRepo.findStudentByCCCD(db, studentCCCD);
    if (!student) throw new Error('Không tìm thấy thông tin học viên');

    const registrations = await StudentRepo.getStudentRegistrations(db, student.id);

    // 2. Build Context String
    const context = `
    [THÔNG TIN HỌC VIÊN]
    - Tên học viên: ${student.ho_ten_full || student.name || 'Học viên'}
    - CCCD/CMND: ${studentCCCD || student.cccd || 'Chưa cập nhật'}
    - Email: ${student.email || 'Chưa cập nhật'}
    - SĐT: ${student.sdt || 'Chưa cập nhật'}
    - Giới tính: ${student.gioi_tinh || 'Chưa cập nhật'}
    - Ngày sinh: ${student.ngay_sinh || 'Chưa cập nhật'}

    [LỚP HỌC & ĐĂNG KÝ THI CỦA HỌC VIÊN]
    ${registrations.length > 0 ? registrations.map((r: any) => `- Lớp: ${r.ten_lop} (Mã: ${r.ma_lop}). Trạng thái tham gia: ${r.status === 'active' || r.status === 'approved' ? 'Đang học/Đã duyệt' : r.status === 'completed' ? 'Đã hoàn thành' : r.status === 'cancelled' || r.status === 'rejected' ? 'Đã hủy/Từ chối' : r.status === 'pending' ? 'Chờ duyệt' : r.status}. Tình trạng học phí: ${r.payment_status === 'paid' ? 'Đã thanh toán' : r.payment_status === 'partial' ? 'Đã thanh toán một phần' : 'Chưa thanh toán'}`).join('\n') : '- Học viên chưa đăng ký lớp học hoặc kỳ thi nào.'}
    `;

    // 3. System Prompt
    const systemPrompt = `
    Bạn là "Trợ lý AI của Vân Trang Edu" (Vân Trang Edu AI Assistant), một nhân viên tư vấn nhiệt tình, thân thiện và tận tâm của Trung tâm Ngoại ngữ và Tin học Vân Trang Edu.
    Vân Trang Edu là đơn vị hàng đầu chuyên luyện thi chứng chỉ tiếng Anh (VSTEP B1, B2), VEPT, và chứng chỉ Tin học Ứng dụng. Hotline hỗ trợ của trung tâm là 096.244.5963.

    Bạn đang chat trực tiếp (1-1) để hỗ trợ cho học viên cụ thể có thông tin chi tiết dưới đây. Hãy đọc thật kỹ:
    ${context}

    ${AI_PERSONA_GUIDELINES}
    `;

    // 4. Call Cloudflare Workers AI
    try {
        const response = await (ai as any).run('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            stream: false
        });

        return response.response;
    } catch (err: any) {
        console.error('AI Error:', err);
        throw new Error('Lỗi từ hệ thống AI: ' + err.message);
    }
}
