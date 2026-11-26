/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig loads astro.config.mjs, so .astro components compile in tests
// and can be rendered with the Container API (see tests/helpers/render.ts).
export default getViteConfig({
  test: {
    // .astro components only compile for the server, so the default is node;
    // renderAstro() mounts the HTML in its own JSDOM for DOM queries.
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    // Agent worktrees live under .claude/ with their own copy of the repo and its node_modules.
    exclude: ['**/node_modules/**', 'dist/', 'coverage/', '.claude/**', '**/*.config.{ts,js}', '**/*.d.ts', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.astro/', 'coverage/', '**/*.config.{ts,js,mjs}', '**/*.d.ts', '**/tests/e2e/**'],
    },
  },
});
