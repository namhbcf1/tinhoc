/**
 * Standardized API response utilities for Hono
 */

import type { Context } from 'hono';

export const ok = (c: Context, data: unknown = null, message = 'Success') => {
    return c.json({ success: true, message, data });
};

export const error = (c: Context, message = 'Internal Server Error', status: 400 | 401 | 403 | 404 | 409 | 422 | 500 = 500) => {
    return c.json({ success: false, error: message }, status);
};

export const unauthorized = (c: Context, message = 'Unauthorized') => {
    return c.json({ success: false, error: message }, 401);
};

export const notFound = (c: Context, message = 'Not Found') => {
    return c.json({ success: false, error: message }, 404);
};
