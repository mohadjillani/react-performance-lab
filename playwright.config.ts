import { defineConfig, devices } from '@playwright/test';

// The parity suite runs against a production build: `npm run build` first,
// then `npm run test:e2e`. It deliberately does not build for you, so the same
// build that was measured is the one that is tested.
const port = Number(process.env.LAB_PORT ?? '3210');
const baseURL = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next start -p ${String(port)}`,
    url: `${baseURL}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
