import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'
import { Plugin } from 'vite'

/**
 * Vite plugin: resolve .js imports to .ts files when the .js file doesn't exist.
 * Needed because route files use .js extensions in imports (for Bundler moduleResolution)
 * but some target files were migrated to .ts.
 */
function resolveJsToTs(): Plugin {
  return {
    name: 'resolve-js-to-ts',
    resolveId(source, importer) {
      if (!source.endsWith('.js') || !importer) return null
      // Only handle relative imports
      if (!source.startsWith('.')) return null
      const dir = importer.substring(0, importer.lastIndexOf('/') + 1)
      const jsPath = dir + source.replace(/^\.\//, '').replace(/^\.\.\//, () => {
        // go up one level
        return ''
      })
      // Simple approach: let Vite try .ts extension
      const tsSource = source.replace(/\.js$/, '.ts')
      return this.resolve(tsSource, importer, { skipSelf: true })
    },
  }
}

/**
 * Cấu hình test backend (Hono trên Cloudflare Workers, D1 in-memory).
 *
 * Cập nhật 2026-10-07: nâng `@cloudflare/vitest-pool-workers` 0.5.41 → 0.22.0 và
 * `vitest` 2.1.9 → 4.1.11.
 * - Bản 0.5.41 kéo workerd 2024-12-30 chạy qua miniflare 3; trên máy này workerd crash
 *   native (`std::terminate() called with no exception` → ERR_RUNTIME_FAILURE) nên TOÀN BỘ
 *   197 test không chạy được.
 * - Từ 0.6+, package bỏ subpath `/config`: thay `defineWorkersConfig` bằng plugin
 *   `cloudflareTest()` (đúng như codemod `vitest-v3-to-v4` của chính Cloudflare), và bỏ
 *   `test.pool` / `test.poolOptions`.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.toml' },
      // D1 binding: vitest-pool-workers khởi tạo SQLite in-memory
      // dùng đúng tên binding "DB" như khai báo trong [[d1_databases]].
      miniflare: {
        d1Databases: ['DB'],
      },
    }),
    resolveJsToTs(),
  ],
  test: {
    // Only run TypeScript test sources. Stale compiled .js test files (and
    // any future build output) must never be picked up — they shadow the
    // real .ts sources and cause false failures.
    include: ['src/**/*.test.ts'],
    exclude: ['**/*.test.js', '**/node_modules/**'],
  },
})
