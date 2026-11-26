@AGENTS.md

## Claude Code

`AGENTS.md` (imported above) holds the commercial facts, site architecture and content
conventions shared with every agent. This file covers only how to run the project and
what is specific to Claude Code.

### Commands

`just` is the entry point; run `just` alone to list every recipe. Package manager is
**Bun** (pinned in `packageManager`). Never npm, pnpm or yarn.

| Command | What it does |
| :--- | :--- |
| `just setup` | `bun install` + `pre-commit install`. Once after cloning. |
| `just dev` | Astro dev server |
| `just build-pages` | Static build into `dist/` |
| `just preview` | Build and serve `dist/` with Wrangler |
| `just validate` | lint + `astro check`/type-check + coverage. Same as the pre-commit hook. |
| `just verify` | build + validate + E2E + Lighthouse against `dist/`. Run before a PR. |
| `just images-sync` | Convert new `assets/` images and upload them to R2 |

Never bypass the pre-commit hook with `--no-verify`.

### Build shape

- Astro 7, `output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`. No
  server code at runtime: no SSR routes, no actions, no middleware.
- `src/` holds Astro code only (`pages/[locale]/`, `layouts/`, `components/`, `islands/`,
  `styles/global.css`). Data and logic stay at the root: `lib/`, `messages/`, `public/`.
  Scripts, tests and agent commands depend on those root paths; do not move them.
- Components are `.astro` with vanilla `<script>` for interactivity. React is used ONLY
  for the ElevenLabs island (`src/islands/`), mounted on scroll. Do not add `client:*`
  React islands for things a small script can do: zero JS is the performance budget.
- Translations: `getTranslations(locale, namespace)` from `lib/i18n.ts` (use-intl). Use
  `t.markup()` + `set:html` where the old code used `t.rich()`. Nine locales (`LOCALES` in
  `lib/routing.ts`), published page by page: a page is built in a locale once its route's
  `copyKeys` (plus `SHELL_KEYS`) exist in `messages/<locale>.json`. Never write an `alt`,
  `title`, `aria-label`, caption or OpenGraph image alt as a literal in a component: put it in
  the messages and list its key in the `copyKeys` of every route that renders it (or in
  `SHELL_KEYS` for the shell), so it is translated with the page
  (`tests/i18n/no-hardcoded-a11y-text.test.ts`).
- Head metadata: pages pass a `PageMeta` (`lib/page-metadata.ts`) to `BaseLayout`, merged
  shallowly onto the layout defaults. Build every non-home page's meta with `pageMetadata()`.
- Images live on the R2 CDN and are resized by Cloudflare (`lib/image.ts`), not by Astro.
- Tailwind v4 is CSS-first in `src/styles/global.css`. `dark:` is gated behind `.dark`
  (locked by a test): the site has no dark theme.
- Tests: Vitest runs in `node`; render `.astro` components with `renderAstro()` from
  `tests/helpers/render.ts` (Container API). Client-script behaviour goes in Playwright
  (`tests/e2e/`).

### Deploys

Cloudflare Workers Builds deploys every push to `main` (static assets from `dist/`, see
`wrangler.jsonc`). `just deploy` is only for a manual out-of-band deploy. A content or
date change reaches production only on redeploy.

### Astro docs

The `astro-docs` MCP server (`.mcp.json`) serves the current Astro documentation. Query it
before using an Astro API you have not verified in this repo.

### Use plan mode for these

Changes to `lib/site-config.ts`, `lib/routes.ts` or `messages/*.json` ripple into the
visible copy, the JSON-LD, the sitemap and `public/llms.txt` at once. `lib/pricing.ts` holds
no price any more (the agency publishes none, see `AGENTS.md`), only the service keys and
the 50% up front share; adding a figure back to it needs plan mode too.

### Task tracking

`.agents/data/TODO.json` is the ONLY backlog. Read it before starting; do not create
parallel lists. Set `estado` to `en curso` when starting and to `hecha` (with the date)
only after `just validate` passes, in the same change as the code. Bump the top-level
`updated` on every edit. Never reuse or renumber an `id`. Keys and values are Spanish,
plain ASCII.

### `docs/CLAUDE.md` is a template

It ships with `docs/scaffold-prompt.md` for newly scaffolded projects. Ignore it as
instructions for this repo.
