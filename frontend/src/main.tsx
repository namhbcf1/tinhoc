import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from './contexts/LanguageContext';
import { initViewportFix } from './utils/viewportFix';
import { initAnalytics } from './utils/analytics-init';
import { initAdaptiveViewport } from './utils/deviceDetection';
import './index.css';
import App from './App';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';

const CHUNK_RELOAD_GUARD_KEY = 'vt_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 15000;

function shouldReloadForChunkError(message: string) {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Expected a JavaScript-or-Wasm module script') ||
    message.includes('Failed to load module script') ||
    message.includes('Unable to preload CSS') ||
    message.includes('dynamically imported module')
  );
}

function reloadForStaleChunk() {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) || '0');
    const now = Date.now();
    if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) {
      return;
    }
    sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, String(now));
  } catch {
    // Ignore storage access issues and still try a hard reload.
  }

  window.location.reload();
}

// Initialize viewport fix for mobile browsers
initViewportFix();

// Initialize adaptive layout vars for device + resolution
initAdaptiveViewport();

// ⛔ Dark mode bị cấm hoàn toàn — xóa dữ liệu cũ và đảm bảo chế độ sáng
localStorage.removeItem('theme');
document.documentElement.classList.remove('dark');

// Initialize analytics (GA4, Clarity, FB Pixel) — skips gracefully if env vars not set
initAnalytics();

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault?.();
  reloadForStaleChunk();
});

window.addEventListener('error', (event) => {
  const message = event.message || '';
  if (shouldReloadForChunkError(message)) {
    reloadForStaleChunk();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message =
    typeof reason === 'string'
      ? reason
      : reason?.message || '';

  if (shouldReloadForChunkError(message)) {
    event.preventDefault?.();
    reloadForStaleChunk();
  }
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('[vantrangedu] Root element #root not found in DOM');
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// Dispatch render-event after React mounts — used by vite-plugin-prerender (Puppeteer)
// to know when to take the HTML snapshot for static prerendering
document.dispatchEvent(new Event('render-event'));
