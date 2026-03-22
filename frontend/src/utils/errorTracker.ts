/**
 * Error Tracking Utilities
 * Centralized error logging system with context and backend integration
 */

import { buildApiUrl } from './api-base-url.js';

const ERROR_STORAGE_KEY = 'error_logs';
const MAX_STORED_ERRORS = 50;
const BATCH_SIZE = 10;

/**
 * Error log entry structure
 * @typedef {Object} ErrorLog
 * @property {string} id
 * @property {number} timestamp
 * @property {string} component
 * @property {string} action
 * @property {string} error
 * @property {string} [stack]
 * @property {Record<string, any>} [context]
 * @property {string} [userAgent]
 * @property {string} [url]
 * @property {'low'|'medium'|'high'|'critical'} severity
 */

/**
 * Get stored errors from localStorage
 * @returns {Array} Array of error logs
 */
function getStoredErrors() {
    try {
        const stored = localStorage.getItem(ERROR_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to read stored errors:', error);
        return [];
    }
}

/**
 * Store errors in localStorage
 * @param {Array} errors - Array of error logs
 */
function storeErrors(errors) {
    try {
        // Keep only last N errors
        const trimmed = errors.slice(-MAX_STORED_ERRORS);
        localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Failed to store errors:', error);
    }
}

/**
 * Send errors to backend API
 * @param {Array} errors - Array of error logs
 */
async function sendErrorsToBackend(errors) {
    const apiUrl = buildApiUrl('/errors/log');

    try {
        // Send in batches
        for (let i = 0; i < errors.length; i += BATCH_SIZE) {
            const batch = errors.slice(i, i + BATCH_SIZE);

            await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ errors: batch })
            }).catch(() => {
                // Silently fail - errors are stored locally
            });
        }
    } catch (error) {
        // Silently fail - errors are stored locally
        console.debug('Failed to send errors to backend:', error);
    }
}

/**
 * Determine error severity
 * @param {Error} error
 * @param {string} component
 * @param {string} action
 * @returns {'low'|'medium'|'high'|'critical'}
 */
function getErrorSeverity(error, component, action) {
    const errorMessage = error.message?.toLowerCase() || '';

    // Critical errors
    if (
        errorMessage.includes('camera') && errorMessage.includes('permission') ||
        errorMessage.includes('network') && errorMessage.includes('failed') ||
        component === 'CameraWithOverlay' && action === 'startCamera'
    ) {
        return 'critical';
    }

    // High severity
    if (
        errorMessage.includes('upload') ||
        errorMessage.includes('compression') ||
        errorMessage.includes('detection')
    ) {
        return 'high';
    }

    // Medium severity
    if (
        errorMessage.includes('validation') ||
        errorMessage.includes('format')
    ) {
        return 'medium';
    }

    // Low severity (default)
    return 'low';
}

/**
 * Track error with context
 */
export function trackError({
    component,
    action,
    error,
    stack,
    context = {},
    severity
}) {
    // Initialize auto-flush on first error track
    if (!autoFlushInitialized) {
        initAutoFlush();
    }
    
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : stack;

    const errorLog = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        component,
        action,
        error: errorMessage,
        stack: errorStack,
        context: {
            ...context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        severity: severity || (error instanceof Error ? getErrorSeverity(error, component, action) : 'medium')
    };

    // Log to console in development
    if (import.meta.env.DEV) {
        console.error(`[${component}] ${action}:`, errorLog);
    }

    // Store locally
    const storedErrors = getStoredErrors();
    storedErrors.push(errorLog);
    storeErrors(storedErrors);

    // Try to send to backend (non-blocking)
    sendErrorsToBackend([errorLog]).catch(() => {
        // Errors are already stored locally
    });
}

/**
 * Track success (for analytics)
 */
export function trackSuccess({
    component,
    action,
    context = {}
}) {
    if (import.meta.env.DEV) {
        console.log(`[${component}] ${action} - Success:`, context);
    }

    // Could send to analytics service here
}

/**
 * Get all stored errors
 * @returns {Array} Array of error logs
 */
export function getStoredErrorLogs() {
    return getStoredErrors();
}

/**
 * Clear stored errors
 */
export function clearStoredErrors() {
    try {
        localStorage.removeItem(ERROR_STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear stored errors:', error);
    }
}

/**
 * Flush stored errors to backend
 */
export async function flushErrorsToBackend() {
    const errors = getStoredErrors();
    if (errors.length === 0) return;

    try {
        await sendErrorsToBackend(errors);
        clearStoredErrors();
    } catch (error) {
        console.error('Failed to flush errors:', error);
    }
}

// Auto-flush errors when online (completely deferred to avoid initialization issues)
// This will be initialized lazily when first error is tracked
let autoFlushInitialized = false;

function initAutoFlush() {
    if (autoFlushInitialized || typeof window === 'undefined') return;
    autoFlushInitialized = true;
    
    window.addEventListener('online', () => {
        flushErrorsToBackend().catch(() => {
            // Silently fail
        });
    });
}
