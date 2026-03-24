// ========================================
// RATE LIMITER - D1-based (Workers-safe, no in-memory state)
// ========================================
// Uses D1 table `rate_limits` for persistence across Workers instances.
// Falls back to allowing requests (with warning) if DB binding unavailable.
//
// Admin/super_admin/teacher roles bypass rate limiting entirely.

import type { Context, Next } from 'hono';
import type { Env } from '../types/env.js';
import { verifyJWT } from './helpers.js';

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (c: Context<{ Bindings: Env }>) => string;
  /** Skip rate limiting entirely for admin/super_admin/teacher roles */
  bypassAdmin?: boolean;
}

/**
 * D1-based rate limiter factory.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 100,
    bypassAdmin = false,
    keyGenerator = (c: Context<{ Bindings: Env }>) => {
      const ip =
        c.req.header('CF-Connecting-IP') ||
        c.req.header('X-Forwarded-For') ||
        'unknown';
      return `rate_limit:${ip}`;
    },
  } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Bypass rate limiting for admin users
    if (bypassAdmin) {
      try {
        const authHeader = c.req.header('Authorization');
        const cookieToken = c.req.header('Cookie')?.match(/(?:^|;\s*)token=([^;]+)/)?.[1];
        const token = authHeader ? authHeader.replace('Bearer ', '') : cookieToken || '';
        if (token && c.env?.JWT_SECRET) {
          const payload = await verifyJWT(token, c.env.JWT_SECRET) as any;
          if (payload && ['admin', 'super_admin', 'teacher'].includes(payload.role)) {
            await next();
            return;
          }
        }
      } catch {
        // Token invalid — continue with rate limiting for non-admin
      }
    }

    const db = c.env?.DB;

    if (!db) {
      console.warn('[RateLimiter] DB binding not available, skipping rate limit');
      await next();
      return;
    }

    const key = keyGenerator(c);
    const nowSec = Math.floor(Date.now() / 1000);
    const windowSec = Math.floor(windowMs / 1000);
    const windowStart = nowSec - (nowSec % windowSec);

    try {
      await db
        .prepare(
          `INSERT INTO rate_limits (key, count, window_start)
           VALUES (?, 1, ?)
           ON CONFLICT(key) DO UPDATE SET
             count = CASE
               WHEN window_start = excluded.window_start THEN count + 1
               ELSE 1
             END,
             window_start = excluded.window_start`
        )
        .bind(key, windowStart)
        .run();

      const row = await db
        .prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
        .bind(key)
        .first<{ count: number; window_start: number }>();

      if (!row) {
        await next();
        return;
      }

      const count = row.count;
      const windowEndsAt = (row.window_start + windowSec) * 1000;
      const retryAfter = Math.ceil((windowEndsAt - Date.now()) / 1000);

      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count)));
      c.header('X-RateLimit-Reset', String(windowEndsAt));

      if (count > maxRequests) {
        return new Response(
          JSON.stringify({
            error: 'Quá nhiều request. Vui lòng thử lại sau.',
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(windowEndsAt),
            },
          }
        );
      }

      await next();
    } catch (err) {
      console.error('[RateLimiter] D1 error, skipping rate limit:', (err as Error).message);
      await next();
    }
  };
}

// ─── Pre-configured limiters ────────────────────────────────────────────────

/** 10 req/min — strict endpoints (bypasses admin) */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  bypassAdmin: true,
});

/** 200 req/min — general API use, bypasses admin */
export const moderateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  bypassAdmin: true,
});

/** 200 req/min — lenient endpoints (bypasses admin) */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  bypassAdmin: true,
});

/** 30 login attempts per 15 min per IP (nới lỏng) */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  keyGenerator: (c: Context<{ Bindings: Env }>) => {
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      'unknown';
    return `login_limit:${ip}`;
  },
});
