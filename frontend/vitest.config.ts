import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    // Playwright specs live in e2e/ and must be run by `playwright test`,
    // not Vitest. Excluding them keeps the unit-test signal clean.
    include: ['test/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Đồng bộ với vite.config.ts: gsap/@gsap/react map sang stub nội bộ
      // (2 package thật đã gỡ khỏi dependencies ngày 2026-10-07).
      gsap: path.resolve(__dirname, './src/lib/gsap-runtime.ts'),
      '@gsap/react': path.resolve(__dirname, './src/lib/gsap-react.ts'),
    },
  },
});
