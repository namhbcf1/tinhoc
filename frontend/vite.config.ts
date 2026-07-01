import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const buildId = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 8)
    || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8)
    || Date.now().toString(36);

export default defineConfig({
    define: {
        __VT_BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [
        react(),
        tailwindcss(),
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
        // modulePreload must be enabled (default) so Vite injects <link rel="modulepreload">
        // for lazy chunks into index.html. Without it, chunks are fetched lazily at runtime
        // and any race-condition / stale-cache delivers the SPA HTML fallback instead of JS,
        // producing "MIME type text/html" errors in the browser console.
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name]-${buildId}-[hash].js`,
                chunkFileNames: `assets/[name]-${buildId}-[hash].js`,
                assetFileNames: `assets/[name]-${buildId}-[hash][extname]`,
                manualChunks: {
                    'react-vendor-v4': ['react', 'react-dom', 'react-router-dom'],
                    'icon-vendor-v4': ['lucide-react'],
                    'form-vendor-v4': ['react-hook-form', '@hookform/resolvers', 'zod'],
                    'image-vendor-v4': ['browser-image-compression'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
