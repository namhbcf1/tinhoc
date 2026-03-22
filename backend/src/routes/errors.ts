import { Hono } from 'hono';
import type { Env } from '../types/env.js';

const errors = new Hono<{ Bindings: Env }>();

errors.post('/log', async (c) => {
  try {
    const payload = await c.req.json().catch(() => null);

    console.error('[frontend-error]', JSON.stringify({
      receivedAt: new Date().toISOString(),
      payload,
    }));

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error?.message || 'Unable to record frontend error log',
    }, 500);
  }
});

export default errors;
