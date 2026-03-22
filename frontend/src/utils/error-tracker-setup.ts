/**
 * Error Tracker Setup
 * Registers global error handlers for uncaught exceptions and unhandled promise rejections.
 * Forwards errors to the existing trackError utility and prepares for Sentry integration.
 *
 * Usage: import and call setupErrorTracking() once at app entry point (main.jsx).
 *
 * // TODO: Replace console-based reporting with Sentry.init() when Sentry DSN available:
 * //   import * as Sentry from "@sentry/react";
 * //   Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, ... });
 */

import { trackError } from './errorTracker.js';

const IS_DEV = import.meta.env.DEV;

/**
 * Log error info to console (dev only) or send to external service (prod).
 * @param {string} source - Where the error originated ('window.onerror' | 'unhandledrejection')
 * @param {string} message
 * @param {Error|null} error
 * @param {Object} extra - Additional metadata (filename, lineno, colno, etc.)
 */
function reportError(source, message, error, extra = {}) {
  if (IS_DEV) {
    // Dev: surface full details in console so developers see them immediately
    console.error(`[ErrorTracker][${source}]`, message, error, extra);
  }

  // Forward to the app's centralized error tracker (stores to localStorage + backend)
  trackError({
    component: source,
    action: 'global-error-handler',
    error: error instanceof Error ? error : new Error(message),
    context: {
      ...extra,
      source,
    },
  });

  // TODO: Replace with Sentry.captureException() when Sentry DSN available
  // Example:
  //   if (!IS_DEV && typeof Sentry !== 'undefined') {
  //     Sentry.captureException(error ?? new Error(message), { extra });
  //   }
}

/**
 * Register global window-level error handlers.
 * Should be called once, as early as possible in the app lifecycle.
 */
export function setupErrorTracking() {
  if (typeof window === 'undefined') return; // SSR / non-browser guard

  // ── 1. Uncaught synchronous errors ────────────────────────────────────────
  const prevOnError = window.onerror;

  window.onerror = function onGlobalError(message, source, lineno, colno, error) {
    reportError('window.onerror', String(message), error ?? null, {
      filename: source,
      lineno,
      colno,
    });

    // Preserve any existing handler
    if (typeof prevOnError === 'function') {
      return prevOnError(message, source, lineno, colno, error);
    }

    // Return false so the browser still logs the error to its own console
    return false;
  };

  // ── 2. Unhandled promise rejections ───────────────────────────────────────
  window.addEventListener('unhandledrejection', function onUnhandledRejection(event) {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
        ? reason
        : 'Unhandled promise rejection';

    reportError(
      'unhandledrejection',
      message,
      reason instanceof Error ? reason : null,
      { reason: IS_DEV ? reason : String(reason) }
    );

    // Do NOT call event.preventDefault() — let the browser surface it normally in dev
  });

  if (IS_DEV) {
    console.info('[ErrorTracker] Global error tracking initialised (dev mode).');
  }
}
