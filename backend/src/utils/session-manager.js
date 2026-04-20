// ========================================
// SESSION MANAGER - Quản lý session tốt hơn
// ========================================
// In-memory session store (in production, use Redis/KV)
const sessions = new Map();
/**
 * Create a new session
 * @param {string} userId - User ID
 * @param {Object} userData - User data to store in session
 * @param {number} expiresIn - Expiration time in milliseconds
 * @returns {string} Session ID
 */
export function createSession(userId, userData = {}, expiresIn = 24 * 60 * 60 * 1000) {
    const sessionId = generateSessionId();
    const expiresAt = Date.now() + expiresIn;
    sessions.set(sessionId, {
        userId,
        userData,
        createdAt: Date.now(),
        expiresAt,
        lastActivity: Date.now(),
    });
    // Clean up expired sessions periodically
    cleanupExpiredSessions();
    return sessionId;
}
/**
 * Get session data
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session data or null if not found/expired
 */
export function getSession(sessionId) {
    // Cleanup expired sessions periodically (every 100 requests)
    if (Math.random() < 0.01) {
        cleanupExpiredSessions();
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }
    if (Date.now() > session.expiresAt) {
        sessions.delete(sessionId);
        return null;
    }
    // Update last activity
    session.lastActivity = Date.now();
    sessions.set(sessionId, session);
    return session;
}
/**
 * Update session
 * @param {string} sessionId - Session ID
 * @param {Object} updates - Updates to apply
 */
export function updateSession(sessionId, updates) {
    const session = sessions.get(sessionId);
    if (session) {
        Object.assign(session, updates);
        session.lastActivity = Date.now();
        sessions.set(sessionId, session);
    }
}
/**
 * Delete session
 * @param {string} sessionId - Session ID
 */
export function deleteSession(sessionId) {
    sessions.delete(sessionId);
}
/**
 * Delete all sessions for a user
 * @param {string} userId - User ID
 */
export function deleteUserSessions(userId) {
    for (const [sessionId, session] of sessions.entries()) {
        if (session.userId === userId) {
            sessions.delete(sessionId);
        }
    }
}
/**
 * Generate a secure session ID
 * @returns {string} Session ID
 */
function generateSessionId() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(sessionId);
        }
    }
}
// Clean up expired sessions periodically (called on demand)
// Note: setInterval không thể dùng trong Cloudflare Workers global scope
// Sẽ cleanup khi có request đến
/**
 * Session middleware for Hono
 */
export function sessionMiddleware() {
    return async (c, next) => {
        const sessionId = c.req.header('X-Session-ID') ||
            c.req.raw.headers.get('cookie')?.match(/session_id=([^;]+)/)?.[1];
        if (sessionId) {
            const session = getSession(sessionId);
            if (session) {
                c.set('session', session);
                c.set('user', session.userData);
            }
        }
        await next();
        // Set session cookie if session was created
        const newSessionId = c.get('newSessionId');
        if (newSessionId) {
            c.header('Set-Cookie', `session_id=${newSessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${24 * 60 * 60}`);
        }
    };
}
