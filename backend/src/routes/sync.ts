import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import { recordProgramPlatformSyncEvent } from '../lib/program-platform/repository.js';
import {
  getProgramPlatformErrorMessage,
  hasProgramPlatformOperatorAccess,
} from '../lib/program-platform/http.js';

const sync = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

sync.post('/master-data-events', async (c) => {
  try {
    const user = c.get('user');
    if (!hasProgramPlatformOperatorAccess(user)) {
      return errorResponse('Unauthorized', 401);
    }

    const payload = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const eventUuid = await recordProgramPlatformSyncEvent(c.env.DB, {
      eventUuid: typeof payload.event_uuid === 'string' ? payload.event_uuid : null,
      entityType: String(payload.entity_type || ''),
      entityUuid: String(payload.entity_uuid || ''),
      action: String(payload.action || 'upsert'),
      sourceSite: 'edu',
      changedAt: typeof payload.changed_at === 'string' ? payload.changed_at : undefined,
      payload: payload.payload ?? payload,
    });

    return jsonResponse({ success: true, eventUuid });
  } catch (error: any) {
    return errorResponse(getProgramPlatformErrorMessage(error, 'Không thể ghi sync event'), 400);
  }
});

export default sync;
