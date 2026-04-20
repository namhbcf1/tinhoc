import { Hono } from 'hono';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import { createProgramOrganizer, listProgramOrganizers, updateProgramOrganizer, } from '../lib/program-platform/repository.js';
import { getProgramPlatformErrorMessage, hasProgramPlatformOperatorAccess, } from '../lib/program-platform/http.js';
const programOrganizers = new Hono();
programOrganizers.get('/', async (c) => {
    try {
        const includeInactive = c.req.query('includeInactive') === '1';
        return jsonResponse({
            success: true,
            data: await listProgramOrganizers(c.env.DB, { includeInactive }),
        });
    }
    catch (error) {
        return errorResponse(error.message || 'Không thể lấy danh sách đơn vị tổ chức', 500);
    }
});
programOrganizers.post('/', async (c) => {
    try {
        const user = c.get('user');
        if (!hasProgramPlatformOperatorAccess(user)) {
            return errorResponse('Unauthorized', 401);
        }
        const payload = (await c.req.json().catch(() => ({})));
        const item = await createProgramOrganizer(c.env.DB, payload, user, 'edu');
        return jsonResponse({ success: true, data: item }, 201);
    }
    catch (error) {
        return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể tạo đơn vị tổ chức'), 400);
    }
});
programOrganizers.put('/:uuid', async (c) => {
    try {
        const user = c.get('user');
        if (!hasProgramPlatformOperatorAccess(user)) {
            return errorResponse('Unauthorized', 401);
        }
        const payload = (await c.req.json().catch(() => ({})));
        const item = await updateProgramOrganizer(c.env.DB, c.req.param('uuid'), payload, user, 'edu');
        return jsonResponse({ success: true, data: item });
    }
    catch (error) {
        return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể cập nhật đơn vị tổ chức'), 400);
    }
});
export default programOrganizers;
