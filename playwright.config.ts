import { defineConfig } from '@playwright/test';

const PORT = 5190;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The installed Chrome is signed. Playwright's own browser download is not,
    // and Windows Smart App Control blocks unsigned binaries on the development machine.
    channel: 'chrome',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
