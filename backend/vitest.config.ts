import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { Plugin } from 'vite'
import fs from 'fs'

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

export default defineWorkersConfig({
  plugins: [resolveJsToTs()],
  test: {
    // Only run TypeScript test sources. Stale compiled .js test files (and
    // any future build output) must never be picked up — they shadow the
    // real .ts sources and cause false failures.
    include: ['src/**/*.test.ts'],
    exclude: ['**/*.test.js', '**/node_modules/**'],
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.test.toml' },
        // D1 binding: vitest-pool-workers khởi tạo SQLite in-memory
        // dùng đúng tên binding "DB" như khai báo trong [[d1_databases]].
        miniflare: {
          d1Databases: ['DB'],
        },
      },
    },
  },
})
