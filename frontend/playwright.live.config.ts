import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /live-.*\.spec\.ts/,
  timeout: 300_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: process.env.LIVE_BASE_URL || 'https://vantrangedu.pages.dev',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1365, height: 900 },
      },
    },
  ],
});
