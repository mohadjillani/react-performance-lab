import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * Lighthouse needs a Chrome binary. Honour CHROME_PATH if set (CI runners
 * usually have Chrome installed and chrome-launcher finds it on its own);
 * otherwise use the Chromium that `npx playwright install chromium` put in
 * Playwright's cache, so a laptop needs no separate Chrome install.
 */
export function resolveChromePath(): string | undefined {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  try {
    const candidate = chromium.executablePath();
    if (existsSync(candidate)) return candidate;
  } catch {
    // Playwright is installed but its browsers are not; fall through.
  }
  return undefined;
}
