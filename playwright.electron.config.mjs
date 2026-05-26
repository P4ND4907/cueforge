import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './qa/playwright/electron',
  fullyParallel: false,
  timeout: 60_000,
  expect: {
    timeout: 12_000
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'qa/playwright/electron-report', open: 'never' }]
  ],
  outputDir: 'test-results/electron',
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  }
});
