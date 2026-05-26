import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.CUEFORGE_PLAYWRIGHT_PORT || 5177);
const baseURL = `http://127.0.0.1:${PORT}`;
const chromeChannel = process.env.PLAYWRIGHT_CHROME_CHANNEL === 'bundled'
  ? null
  : process.env.PLAYWRIGHT_CHROME_CHANNEL || 'chrome';
const browserUse = chromeChannel ? { channel: chromeChannel } : {};

export default defineConfig({
  testDir: './qa/playwright/web',
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 7_500
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'qa/playwright/report', open: 'never' }]
  ],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  webServer: {
    command: `npm.cmd run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...browserUse,
        viewport: { width: 1366, height: 900 }
      }
    },
    {
      name: 'chromium-compact',
      use: {
        ...devices['Pixel 7'],
        ...browserUse
      }
    }
  ]
});
