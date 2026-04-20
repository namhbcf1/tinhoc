import type { Context, Next } from 'hono';
import type { Env } from '../types/env.js';

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (c: Context<{ Bindings: Env }>) => string;
  bypassAdmin?: boolean;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  void options;

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    void c;
    await next();
  };
}

export const strictRateLimiter = createRateLimiter();
export const moderateRateLimiter = createRateLimiter();
export const lenientRateLimiter = createRateLimiter();
export const loginRateLimiter = createRateLimiter();
