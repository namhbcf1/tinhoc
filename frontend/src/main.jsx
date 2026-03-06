import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { initViewportFix } from './utils/viewportFix';
import { initAnalytics } from './utils/analytics-init';
import './index.css';
import App from './App';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';

// Initialize viewport fix for mobile browsers
initViewportFix();

// Initialize analytics (GA4, Clarity, FB Pixel) — skips gracefully if env vars not set
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Dispatch render-event after React mounts — used by vite-plugin-prerender (Puppeteer)
// to know when to take the HTML snapshot for static prerendering
document.dispatchEvent(new Event('render-event'));
