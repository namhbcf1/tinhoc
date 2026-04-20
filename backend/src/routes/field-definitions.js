import { Hono } from 'hono';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import { createFieldDefinition, listFieldDefinitions, updateFieldDefinition, } from '../lib/program-platform/repository.js';
import { getProgramPlatformErrorMessage, hasProgramPlatformOperatorAccess, } from '../lib/program-platform/http.js';
const fieldDefinitions = new Hono();
fieldDefinitions.get('/', async (c) => {
    try {
        const includeInactive = c.req.query('includeInactive') === '1';
        return jsonResponse({
            success: true,
            data: await listFieldDefinitions(c.env.DB, {
                targetEntityType: c.req.query('targetEntityType'),
                ownerEntityType: c.req.query('ownerEntityType'),
                ownerEntityUuid: c.req.query('ownerEntityUuid'),
                includeInactive,
            }),
        });
    }
    catch (error) {
        return errorResponse(error.message || 'Không thể lấy field definitions', 500);
    }
});
fieldDefinitions.post('/', async (c) => {
    try {
        const user = c.get('user');
        if (!hasProgramPlatformOperatorAccess(user)) {
            return errorResponse('Unauthorized', 401);
        }
        const payload = (await c.req.json().catch(() => ({})));
        const item = await createFieldDefinition(c.env.DB, payload, user, 'edu');
        return jsonResponse({ success: true, data: item }, 201);
    }
    catch (error) {
        return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể tạo field definition'), 400);
    }
});
fieldDefinitions.put('/:uuid', async (c) => {
    try {
        const user = c.get('user');
        if (!hasProgramPlatformOperatorAccess(user)) {
            return errorResponse('Unauthorized', 401);
        }
        const payload = (await c.req.json().catch(() => ({})));
        const item = await updateFieldDefinition(c.env.DB, c.req.param('uuid'), payload, user, 'edu');
        return jsonResponse({ success: true, data: item });
    }
    catch (error) {
        return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể cập nhật field definition'), 400);
    }
});
export default fieldDefinitions;
