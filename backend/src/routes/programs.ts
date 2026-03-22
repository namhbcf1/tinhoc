import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import {
  createProgram,
  listPrograms,
  updateProgram,
} from '../lib/program-platform/repository.js';
import {
  getProgramPlatformErrorMessage,
  hasProgramPlatformOperatorAccess,
} from '../lib/program-platform/http.js';

const programs = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

programs.get('/', async (c) => {
  try {
    const includeInactive = c.req.query('includeInactive') === '1';
    const organizerUuid = c.req.query('organizerUuid');

    return jsonResponse({
      success: true,
      data: await listPrograms(c.env.DB, { organizerUuid, includeInactive }),
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Không thể lấy danh sách chương trình', 500);
  }
});

programs.post('/', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await createProgram(c.env.DB, payload, user, 'edu');
    return jsonResponse({ success: true, data: item }, 201);
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể tạo chương trình'), 400);
  }
});

programs.put('/:uuid', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const item = await updateProgram(c.env.DB, c.req.param('uuid'), payload, user, 'edu');
    return jsonResponse({ success: true, data: item });
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể cập nhật chương trình'), 400);
  }
});

export default programs;
