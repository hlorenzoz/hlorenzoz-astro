import { defineConfig } from '@playwright/test';
import config from './playwright.config';

/**
 * Playwright configuration for verifying the static build.
 * This configuration uses 'sirv dist' to boot the pre-rendered 'dist/'
 * directory instead of the Astro dev server.
 * This ensures that E2E tests verify the EXACT bytes being deployed to Cloudflare.
 */
export default defineConfig({
  ...config,
  webServer: {
    command: 'bun x sirv dist -p 45723 --host 127.0.0.1',
    url: 'http://127.0.0.1:45723',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
