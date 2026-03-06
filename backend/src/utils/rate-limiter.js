// ========================================
// RATE LIMITER - D1-based (Workers-safe, no in-memory state)
// ========================================
// Uses D1 table `rate_limits` for persistence across Workers instances.
// Falls back to allowing requests (with warning) if DB binding unavailable.
//
// Table schema (apply via migration if not exists):
//   CREATE TABLE IF NOT EXISTS rate_limits (
//     key TEXT NOT NULL,
//     count INTEGER NOT NULL DEFAULT 1,
//     window_start INTEGER NOT NULL,
//     PRIMARY KEY (key)
//   );

/**
 * D1-based rate limiter factory.
 * @param {Object} options
 * @param {number} options.windowMs   - Time window in milliseconds
 * @param {number} options.maxRequests - Max allowed requests per window
 * @param {function} options.keyGenerator - (c) => string key
 */
export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 100,
    keyGenerator = (c) => {
      const ip =
        c.req.header('CF-Connecting-IP') ||
        c.req.header('X-Forwarded-For') ||
        'unknown';
      return `rate_limit:${ip}`;
    },
  } = options;

  return async (c, next) => {
    const db = c.env?.DB;

    if (!db) {
      // No DB binding — skip rate limiting, log warning
      console.warn('[RateLimiter] DB binding not available, skipping rate limit');
      await next();
      return;
    }

    const key = keyGenerator(c);
    const nowSec = Math.floor(Date.now() / 1000);
    const windowSec = Math.floor(windowMs / 1000);
    const windowStart = nowSec - (nowSec % windowSec); // floor to window boundary

    try {
      // Upsert: if row exists and same window → increment; else reset
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
        .first();

      if (!row) {
        await next();
        return;
      }

      const count = row.count;
      const windowEndsAt = (row.window_start + windowSec) * 1000; // ms
      const retryAfter = Math.ceil((windowEndsAt - Date.now()) / 1000);

      // Set rate limit headers
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
      // D1 error (e.g. table missing) — fail open, log error
      console.error('[RateLimiter] D1 error, skipping rate limit:', err.message);
      await next();
    }
  };
}

// ─── Pre-configured limiters ────────────────────────────────────────────────

/** 10 req/min — strict endpoints */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

/** 200 req/min — general API use (SPA makes many calls) */
export const moderateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
});

/** 200 req/min — lenient endpoints */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
});

/** 5 login attempts per 15 min per IP */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyGenerator: (c) => {
    const ip =
      c.req.header('CF-Connecting-IP') ||
      c.req.header('X-Forwarded-For') ||
      'unknown';
    return `login_limit:${ip}`;
  },
});
