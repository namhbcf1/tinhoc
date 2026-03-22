import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import {
  createProgramLevel,
  listProgramLevels,
  updateProgramLevel,
} from '../lib/program-platform/repository.js';
import {
  getProgramPlatformErrorMessage,
  hasProgramPlatformOperatorAccess,
} from '../lib/program-platform/http.js';

const programLevels = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

programLevels.get('/', async (c) => {
  try {
    const includeInactive = c.req.query('includeInactive') === '1';
    const programUuid = c.req.query('programUuid');

    return jsonResponse({
      success: true,
      data: await listProgramLevels(c.env.DB, { programUuid, includeInactive }),
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Không thể lấy danh sách trình độ', 500);
  }
});

programLevels.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await createProgramLevel(c.env.DB, payload, user, 'edu');
    return jsonResponse({ success: true, data: item }, 201);
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể tạo trình độ'), 400);
  }
});

programLevels.put('/:uuid', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await updateProgramLevel(c.env.DB, c.req.param('uuid'), payload, user, 'edu');
    return jsonResponse({ success: true, data: item });
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể cập nhật trình độ'), 400);
  }
});

export default programLevels;
