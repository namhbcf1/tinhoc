import { Hono } from 'hono';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import { createProgram, listPrograms, updateProgram, } from '../lib/program-platform/repository.js';
import { getProgramPlatformErrorMessage, hasProgramPlatformOperatorAccess, } from '../lib/program-platform/http.js';
const programs = new Hono();
programs.get('/', async (c) => {
    try {
        const includeInactive = c.req.query('includeInactive') === '1';
        const organizerUuid = c.req.query('organizerUuid');
        return jsonResponse({
            success: true,
            data: await listPrograms(c.env.DB, { organizerUuid, includeInactive }),
        });
    }
    catch (error) {
        return errorResponse(error.message || 'Không thể lấy danh sách chương trình', 500);
    }
});
programs.post('/', async (c) => {
    try {
        const user = c.get('user');
        if (!hasProgramPlatformOperatorAccess(user)) {
            return errorResponse('Unauthorized', 401);
        }
        const payload = (await c.req.json().catch(() => ({})));
        const item = await createProgram(c.env.DB, payload, user, 'edu');
        return jsonResponse({ success: true, data: item }, 201);
    }
    catch (error) {
        return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể tạo chương trình'), 400);
    }
});
programs.put('/:uuid', async (c) => {
    try {
        const user = c.get('user');
        if (!hasProgramPlatformOperatorAccess(user)) {
            return errorResponse('Unauthorized', 401);
        }
        const payload = (await c.req.json().catch(() => ({})));
        const item = await updateProgram(c.env.DB, c.req.param('uuid'), payload, user, 'edu');
        return jsonResponse({ success: true, data: item });
    }
    catch (error) {
        return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể cập nhật chương trình'), 400);
    }
});
export default programs;
