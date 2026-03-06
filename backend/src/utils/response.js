/**
 * Standardized API response utilities for Hono
 */

export const ok = (c, data = null, message = 'Success') => {
    return c.json({ success: true, message, data });
};

export const error = (c, message = 'Internal Server Error', status = 500) => {
    return c.json({ success: false, error: message }, status);
};

export const unauthorized = (c, message = 'Unauthorized') => {
    return c.json({ success: false, error: message }, 401);
};

export const notFound = (c, message = 'Not Found') => {
    return c.json({ success: false, error: message }, 404);
};
