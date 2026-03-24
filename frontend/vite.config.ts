import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Prerendering for SEO: generates static HTML snapshots for Googlebot
// Requires Puppeteer/Chromium — only active in production builds.
// Install: vite-plugin-prerender is already in devDependencies.
// To skip prerender (e.g. on CI without Chromium), set SKIP_PRERENDER=true.
function getPrerenderPlugin() {
    if (process.env.SKIP_PRERENDER === 'true') return null;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { default: vitePrerender } = require('vite-plugin-prerender');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const PuppeteerRenderer = require('@prerenderer/renderer-puppeteer');
        return vitePrerender({
            // Static HTML will be generated for each of these routes
            routes: [
                '/',
                '/about',
                '/training',
                '/admissions',
                '/research',
                '/connections',
                '/hub4',
                '/life',
                '/units',
                '/services',
                '/news',
                '/contact',
                '/certificate/lookup',
                '/ho-tro-tieng-anh',
                '/day-ngon-ngu',
                '/trung-tam-tieng-anh',
                '/english-support',
                '/language-center',
                '/privacy',
                '/terms',
            ],
            renderer: new PuppeteerRenderer({
                // Render after all React components have mounted
                renderAfterDocumentEvent: 'render-event',
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }),
        });
    } catch {
        // vite-plugin-prerender or Puppeteer not available in this environment
        console.warn('[vite-config] vite-plugin-prerender not available — skipping prerender.');
        return null;
    }
}

const prerenderPlugin = getPrerenderPlugin();

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        // Only include prerender plugin if it loaded successfully
        ...(prerenderPlugin ? [prerenderPlugin] : []),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            gsap: path.resolve(__dirname, './src/lib/gsap-runtime.ts'),
            '@gsap/react': path.resolve(__dirname, './src/lib/gsap-react.ts'),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8787', // Cloudflare Worker local dev
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
    build: {
        modulePreload: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'icon-vendor': ['lucide-react'],
                    'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
                    'image-vendor': ['browser-image-compression'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
