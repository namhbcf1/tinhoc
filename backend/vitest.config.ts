import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
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
