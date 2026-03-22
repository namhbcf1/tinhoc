import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import {
  createFieldOption,
  listFieldOptions,
  updateFieldOption,
} from '../lib/program-platform/repository.js';
import {
  getProgramPlatformErrorMessage,
  hasProgramPlatformOperatorAccess,
} from '../lib/program-platform/http.js';

const fieldOptions = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

fieldOptions.get('/', async (c) => {
  try {
    const includeInactive = c.req.query('includeInactive') === '1';
    return jsonResponse({
      success: true,
      data: await listFieldOptions(c.env.DB, {
        fieldDefinitionUuid: c.req.query('fieldDefinitionUuid'),
        includeInactive,
      }),
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Không thể lấy field options', 500);
  }
});

fieldOptions.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await createFieldOption(c.env.DB, payload, user, 'edu');
    return jsonResponse({ success: true, data: item }, 201);
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể tạo field option'), 400);
  }
});

fieldOptions.put('/:uuid', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await updateFieldOption(c.env.DB, c.req.param('uuid'), payload, user, 'edu');
    return jsonResponse({ success: true, data: item });
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể cập nhật field option'), 400);
  }
});

export default fieldOptions;
