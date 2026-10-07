import type { Context, Next } from 'hono';
import type { Env } from '../types/env.js';

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  name?: string;
  keyGenerator?: (c: Context<{ Bindings: Env }>) => string;
  bypassAdmin?: boolean;
  /**
   * true  → đếm bằng D1 (`rate_limits`), chính xác trên mọi isolate. Dùng cho
   *         endpoint nhạy cảm (đăng nhập, thanh toán, nộp bài…) vì mỗi request = 1 write.
   * false → đếm in-memory trong isolate hiện tại (rẻ, best-effort). Dùng cho
   *         middleware chạy trên MỌI request.
   */
  distributed?: boolean;
}

interface WindowState {
  count: number;
  windowStart: number;
}

const MEMORY_MAX_ENTRIES = 5_000;
const memoryStore = new Map<string, WindowState>();

function defaultKeyGenerator(c: Context<{ Bindings: Env }>): string {
  const cfIp = c.req.header('CF-Connecting-IP');
  const forwarded = c.req.header('X-Forwarded-For');
  return cfIp || forwarded?.split(',')[0]?.trim() || 'unknown';
}

function bumpMemory(key: string, now: number, windowMs: number): WindowState {
  const existing = memoryStore.get(key);
  const state: WindowState =
    !existing || now - existing.windowStart >= windowMs
      ? { count: 1, windowStart: now }
      : { count: existing.count + 1, windowStart: existing.windowStart };

  memoryStore.set(key, state);

  if (memoryStore.size > MEMORY_MAX_ENTRIES) {
    for (const [storedKey, stored] of memoryStore) {
      if (now - stored.windowStart >= windowMs) memoryStore.delete(storedKey);
    }
    if (memoryStore.size > MEMORY_MAX_ENTRIES) memoryStore.clear();
  }

  return state;
}

/**
 * UPSERT nguyên tử: hết cửa sổ thì reset về 1, còn trong cửa sổ thì +1.
 * Bảng `rate_limits` (key TEXT PRIMARY KEY, count, window_start) đã có sẵn từ
 * migration `add-rate-limits-table.sql` nhưng trước đây chưa từng được dùng.
 */
async function bumpD1(
  db: D1Database,
  key: string,
  now: number,
  windowMs: number,
): Promise<WindowState | null> {
  const windowStartThreshold = now - windowMs;

  const row = await db
    .prepare(
      `
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start <= ? THEN 1
          ELSE rate_limits.count + 1
        END,
        window_start = CASE
          WHEN rate_limits.window_start <= ? THEN ?
          ELSE rate_limits.window_start
        END
      RETURNING count, window_start
    `,
    )
    .bind(key, now, windowStartThreshold, windowStartThreshold, now)
    .first<{ count: number; window_start: number }>();

  if (!row) return null;
  return { count: Number(row.count), windowStart: Number(row.window_start) };
}

async function cleanupD1(db: D1Database, now: number): Promise<void> {
  if (Math.random() > 0.02) return;
  try {
    await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(now - 3_600_000).run();
  } catch {
    // best-effort
  }
}

/**
 * Middleware giới hạn tần suất THẬT (trước đây là no-op: chỉ `await next()`).
 *
 * Fail-open khi D1 không dùng được (ví dụ bảng chưa được tạo): request vẫn được
 * phục vụ nhưng có log cảnh báo — sự cố hạ tầng không được làm chết cả app.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const {
    windowMs = 60_000,
    maxRequests = 100,
    name = 'default',
    keyGenerator,
    bypassAdmin = false,
    distributed = false,
  } = options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    if (bypassAdmin) {
      const user = (c as any).get?.('user');
      const role = user?.role;
      if (role === 'admin' || role === 'super_admin') return next();
    }

    const identifier = keyGenerator ? keyGenerator(c) : defaultKeyGenerator(c);
    const key = `${name}:${identifier}`;
    const now = Date.now();

    let state: WindowState | null = null;

    if (distributed) {
      try {
        state = await bumpD1(c.env.DB, key, now, windowMs);
        if (state) await cleanupD1(c.env.DB, now);
      } catch (error) {
        console.warn(`[rate-limit:${name}] D1 không dùng được, chuyển sang in-memory:`, error);
      }
    }

    if (!state) state = bumpMemory(key, now, windowMs);

    if (state.count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((state.windowStart + windowMs - now) / 1000),
      );
      c.header('Retry-After', String(retryAfterSeconds));
      return c.json(
        {
          success: false,
          error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
        },
        429,
      );
    }

    await next();
  };
}

// ─── Các limiter dùng sẵn ────────────────────────────────────────────────────
// Ngưỡng chọn RỘNG có chủ ý: học viên trong cùng một trường/phòng máy đi ra Internet
// bằng CÙNG một IP (NAT). Hạn mức theo IP phải đủ chỗ cho vài chục người dùng đồng thời,
// nếu không sẽ chặn oan người dùng thật. Đây vẫn là bước nhảy vọt so với bản cũ (no-op).
// Muốn siết chặt hơn: xem cột count trong bảng rate_limits sau vài ngày chạy thật.
//
// Chỉ những limiter gắn vào endpoint NHẠY CẢM mới đếm bằng D1 (mỗi request = 1 write).
// moderateRateLimiter chạy trên MỌI request (src/index.ts) nên giữ in-memory cho rẻ.

export const strictRateLimiter = createRateLimiter({
  name: 'strict',
  windowMs: 60_000,
  maxRequests: 120,
  distributed: true,
});

export const moderateRateLimiter = createRateLimiter({
  name: 'moderate',
  windowMs: 60_000,
  maxRequests: 600,
  distributed: false,
});

export const lenientRateLimiter = createRateLimiter({
  name: 'lenient',
  windowMs: 60_000,
  maxRequests: 1200,
  distributed: false,
});

export const loginRateLimiter = createRateLimiter({
  name: 'login',
  windowMs: 5 * 60_000,
  maxRequests: 30,
  distributed: true,
});
