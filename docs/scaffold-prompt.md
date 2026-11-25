<!-- HOW TO USE: copy CLAUDE.md into the empty project directory, then paste this ENTIRE
     file to your coding agent. Nothing to edit, nothing to fill in. -->

# START HERE: BUILD THIS NOW

This file is your task, not a document to review. **Begin immediately.**

Do not reply asking what to do with this, and do not ask for project names, domains,
colors or locales. There is nothing to fill in anywhere: `CLAUDE.md` carries the decisions
and a table of defaults for every value you might need. Read it, then build.

There is exactly one condition that stops you before you start, described in Phase 0.

# ROLE

You are a senior frontend architect scaffolding a **production-grade Next.js application
from zero**. This is not a demo. Every file you create must compile, lint clean, be
type-safe, and be covered by the quality gates below.

# PHASE 0: ORIENT AND START

### 1. Find `CLAUDE.md`

It has already been placed in the project directory. Read it in full before anything else.

It is the authority on this project's stack, architecture, styling rules, testing layout,
deployment constraints, and anti-patterns. **This prompt deliberately does not repeat that
content.** Where a phase says "per `CLAUDE.md`", go read the named section rather than
inventing an answer. If the two ever disagree, `CLAUDE.md` wins: it is what the project
lives with after you are gone.

**The one stop condition:** if `CLAUDE.md` is not in the working directory or anywhere
obvious below it, stop and say so in one line. Without it you are missing half the brief.
Do not improvise a substitute.

### 2. Activate it

Delete the leading "this is a template" banner from `CLAUDE.md`. From that moment it is a
live contract: every file you write must satisfy it, and Phase 8 makes you re-read it and
confirm compliance.

Its **Project defaults** table settles every naming and configuration question. Use it. Do
not invent a production domain, and do not ask for one: `BASE_URL` starts at
`http://localhost:3000` with a comment saying it must be set before the first deploy. That
is working configuration, not a stub.

### 3. Preflight

Print the versions of `bun`, `just`, `pre-commit`, `git`, and `wrangler` (via `bunx`). If
`just` or `pre-commit` are missing, install them (`brew install just pre-commit`) and say
so. Do not silently skip them: they are two of the project's gates.

# PROCESS RULES

1. **Decide, do not ask.** If something is genuinely ambiguous, pick the option most
   consistent with `CLAUDE.md`, write it down, and keep building. Collect every such call
   in an "Assumptions" list and present it with the final report. The only thing worth
   stopping for is an action that would destroy existing work.
2. **No placeholders.** No `// TODO`, no `throw new Error('not implemented')`, no empty
   component bodies. Anything you create must actually run.
3. **Verify, don't assume.** After each phase run the relevant command (`bun install`,
   `bun run type-check`, `bun run lint`, `bun run test`, `bun run build`). If it fails, fix
   it before moving on. Report real output, never a summary of what "should" happen.
4. **Check the docs before writing config.** Cloudflare, OpenNext, Next and Tailwind move
   fast. For every version-sensitive file below, consult the current official docs and
   adapt. The specs here are intent and shape, not frozen truth.
5. **Commit in logical slices** using conventional commits (`chore(setup):`, `feat(ui):`,
   `test(e2e):` and so on), so the scaffold is reviewable as a sequence rather than one dump.

# PHASE 1: INITIALIZATION

`CLAUDE.md` already sits in the project directory, so scaffold **in place** rather than
into a new subfolder:

```bash
bun create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"
bun add -d @opennextjs/cloudflare wrangler
```

If the generator refuses because the directory is not empty, move `CLAUDE.md` aside,
scaffold, and move it back. Do not delete it.

Then `git init` if needed and make the first commit before changing anything else, so the
scaffold diff stays readable.

# PHASE 2: DIRECTORY STRUCTURE

Create exactly this tree. The **reasoning** behind it, meaning why `app/` holds no logic,
why the `routes.ts` / `routing.ts` split is load-bearing, and which files are single
sources of truth, is in the **Architecture** section of `CLAUDE.md`. Read it before you
start; the structure is meaningless if you do not implement the constraints that justify it.

```
.
├── app/                          # ROUTING ONLY: layouts, pages, route handlers, metadata
│   ├── layout.tsx                # fonts, <html lang>, global JSON-LD
│   ├── page.tsx
│   ├── globals.css               # the ONLY css file: @theme + layers
│   ├── icon.svg
│   ├── robots.ts
│   ├── sitemap.ts                # derives from lib/routes.ts, never hand-written
│   └── api/health/route.ts       # proves the SSR/Node runtime path works
├── components/
│   ├── ui/                       # primitives: Button, Card, Input, GlassPanel
│   │   └── index.ts              # barrel, the public surface of the primitives
│   └── <feature>/                # domain components, grouped by domain not by type
├── lib/
│   ├── site-config.ts            # identity, urls, locales, schema ids, absoluteUrl()
│   ├── routes.ts                 # route registry, SERVER ONLY (see CLAUDE.md)
│   ├── routing.ts                # PURE helpers, safe for client components
│   ├── design-system/tokens.ts   # TS mirror of the CSS @theme block
│   ├── schema/index.ts           # JSON-LD builders
│   ├── validation/               # Zod schemas + inferred types
│   ├── hooks/
│   └── utils/cn.ts
├── tests/                    # mirrors the source tree, layout per CLAUDE.md
│   ├── components/  lib/  seo/  a11y/
│   └── e2e/                      # Playwright specs, excluded from Vitest
├── public/
├── scripts/
├── .github/
│   ├── actions/setup/action.yml
│   └── workflows/pipeline.yml
├── docs/
└── CLAUDE.md
```

Add the unit test that `CLAUDE.md` requires: an assertion that `lib/routing.ts` imports
nothing server-only. Without it the split is a convention, and conventions decay.

# PHASE 3: CONFIGURATION FILES

Read the current official docs for each, then write it. The **deployment constraints**
(minimum `compatibility_date`, `nodejs_compat`, module-scope clients, the Turbopack
caveat, bundle size limits) are all documented in the **Deployment** section of
`CLAUDE.md`. Treat that section as the checklist for `wrangler.jsonc` and `next.config.ts`.

### `next.config.ts`

`reactStrictMode: true`, `poweredByHeader: false`, `compress: true`; `images` with
`formats: ['image/avif', 'image/webp']` and explicit `deviceSizes`/`imageSizes`; call
`initOpenNextCloudflareForDev()` so Cloudflare bindings resolve in `next dev`. Apply the
Turbopack decision from `CLAUDE.md` and leave a comment with the link explaining it.

### `open-next.config.ts`

```ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default defineCloudflareConfig({
  // Caching: https://opennext.js.org/cloudflare/caching
});
```

### `wrangler.jsonc`

`$schema` from `node_modules/wrangler/config-schema.json`; the Worker name per the defaults
table; `compatibility_date` and `compatibility_flags` per `CLAUDE.md`; `main` + `assets`
pointing at the OpenNext build output exactly as the current adapter docs specify;
`"observability": { "enabled": true }`; commented, documented stubs for `d1_databases`,
`r2_buckets`, `kv_namespaces` and `ai`.

### `tsconfig.json`

`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
`forceConsistentCasingInFileNames`, `moduleResolution: "bundler"`,
`paths: { "@/*": ["./*"] }`. Exclude the Playwright configs from the type-check program.

### `eslint.config.mjs` (flat config)

`@eslint/js` recommended + `typescript-eslint` recommended + `eslint-plugin-react` +
`react-hooks` (`rules-of-hooks: error`, `exhaustive-deps: warn`) + `jsx-a11y` + `import`.
Disable `react/react-in-jsx-scope`. `@typescript-eslint/no-unused-vars` to error with `^_`
ignore patterns. Ignore `.next/`, `.open-next/`, `out/`, `coverage/`, `playwright-report/`,
`test-results/`, lockfiles.

### `postcss.config.js`

Tailwind v4 needs only `'@tailwindcss/postcss': {}`. **No `tailwind.config.ts`**, see
`CLAUDE.md`; creating one means you have misread the v4 model.

### `vitest.config.ts` + `vitest.setup.ts`

- `environment: 'jsdom'`, `globals: true`, `plugins: [react()]`, `@` aliased to the project
  root to match `tsconfig` paths
- **Exclude `tests/e2e/**`** from both `test.exclude` and coverage, or Vitest will try
  to execute Playwright specs
- Coverage: `provider: 'v8'`, reporters `['text', 'json', 'html']`, and **real thresholds**
  (start at 80% lines/functions/statements). `CLAUDE.md` treats these as a gate.
- `vitest.setup.ts`: import `@testing-library/jest-dom`; stub `IntersectionObserver`,
  `ResizeObserver`, `matchMedia` and `HTMLElement.prototype.scrollIntoView`. jsdom
  implements none of them, and every animated or scroll-aware component crashes without them.

### `playwright.config.ts` + `playwright.preview.config.ts`

- `testDir: './tests/e2e'`, HTML + list reporters, `trace: 'on-first-retry'`,
  `screenshot: 'only-on-failure'`
- Projects: Desktop Chrome, Firefox, Safari, Pixel 5, iPhone 12
- `webServer` on a fixed non-default port (e.g. `45723`) so it never collides with a dev
  server left running
- The `preview` variant extends the base config but boots the workerd runtime
  (`opennextjs-cloudflare preview`). `CLAUDE.md` explains why both must exist.

### `lighthouserc.json`

- `collect.startServerCommand` boots the production server on the fixed port, with
  `startServerReadyPattern` and a generous `startServerReadyTimeout`
- `collect.url`: every top-level route
- `settings`: mobile form factor, `screenEmulation` 360x640 at 2x, headless flags
  (`--no-sandbox`, `--disable-dev-shm-usage`, `--headless`, `--disable-gpu`)
- `assert.assertions`: **error** on `categories:accessibility` at 0.95 or better,
  `categories:seo` at 0.95 or better, `categories:best-practices` at 0.90 or better;
  **warn** on FCP under 3000ms, LCP under 4000ms, CLS under 0.25, TBT under 600ms
- `upload.target: "temporary-public-storage"`

### `.pre-commit-config.yaml`

- Upstream `pre-commit/pre-commit-hooks`: `trailing-whitespace`, `end-of-file-fixer`,
  `check-yaml`, `check-json`, `check-merge-conflict`, `check-added-large-files`
- Local `system` hooks running `bun run lint`, `bun run type-check`, `bun run test`, each
  with `pass_filenames: false`
- A `ci:` block with `autofix_prs: true`, weekly `autoupdate_schedule`, and
  **`skip: [lint, type-check, test]`**, because pre-commit.ci has no Bun, so those hooks
  run locally and in GitHub Actions instead. Write that reason as a comment in the file.
- E2E and Lighthouse deliberately stay out: minutes-long hooks get bypassed with
  `--no-verify`, and a gate people route around is worse than no gate.

### `Justfile`

`just` with no arguments lists recipes. Implement every command in the **Commands** table
of `CLAUDE.md`; that table is the contract, and the docs you write later point at it.
Each recipe is a one-line comment plus a call into `bun run <script>`. A recipe that
reimplements its script instead of calling it is a bug waiting to happen.

### `package.json`

Scripts backing every Justfile recipe: `dev`, `build`, `start`, `lint`, `lint:fix`,
`type-check`, `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:preview`,
`test:lighthouse`, `preview`, `deploy`, `cf-typegen`, plus composite `validate` and
`test:all`. Pin `"packageManager": "bun@<version>"`.

### `.github/`

- `actions/setup/action.yml`: composite action running `oven-sh/setup-bun@v2` and
  `bun install` (checkout stays with the caller)
- `workflows/pipeline.yml`: on push + PR, one job for `validate`, one for E2E, one for
  Lighthouse CI. Declare `permissions:` explicitly (least privilege), pin third-party
  actions, cache Bun's store.

### Root files

`.env.example` (documented, no real values), `.gitignore` (`.next/`, `.open-next/`, `out/`,
`coverage/`, `playwright-report/`, `test-results/`, `.wrangler/`, `.env*.local`),
`.browserslistrc`, `README.md`, `CHANGELOG.md`.

# PHASE 4: GLASSMORPHISM DESIGN SYSTEM

All styling goes in `app/globals.css`. The **Styling** section of `CLAUDE.md` states the
rules: the dark-variant gate, the `.text-gradient` fallback ordering, the contrast floors,
and the reduced-motion and reduced-transparency fallbacks. Implement them, do not restate
them.

Build, in order:

1. `@import "tailwindcss";` then `@plugin "@tailwindcss/typography";`
2. The `@custom-variant dark` gate, with the comment explaining why it exists
3. `@theme`: brand ramp built from the primary color in the defaults table,
   surface/background/text colors, a radius scale (`--radius-default` through
   `--radius-3xl`), glass shadows (`--shadow-glass`, `--shadow-soft`, `--shadow-glow`),
   font families wired to `next/font` CSS variables
4. `@layer base`: `:root` colors, `color-scheme`, smooth scroll, font smoothing, scrollbars
5. `@layer components`: `.glass-panel` (`backdrop-filter: blur(16px) saturate(180%)`,
   translucent background, hairline low-alpha border, `--shadow-glass`), `.glass-card`
   (`.glass-panel` plus hover elevation), `.glass-header` (sticky, stronger blur),
   `.btn-primary`, `.text-gradient`
6. The reduced-transparency and reduced-motion media queries
7. `lib/design-system/tokens.ts` mirroring the `@theme` scales as typed constants, plus a
   test asserting the two agree. Mirrors drift the moment nothing checks them.

# PHASE 5: CORE LIBRARY CODE

Write each of these for real, with a unit test:

- `lib/utils/cn.ts`: `twMerge(clsx(...inputs))`, the single class-merging entry point
- `lib/site-config.ts`: `BASE_URL`, CDN URL, locales, OG image, stable schema `@id`s, and
  `absoluteUrl(path)` emitting the exact canonical form Next.js produces for your
  `trailingSlash` setting
- `lib/site-config.ts` also exports **`BUSINESS`**, the one object holding the site's
  identity and contact facts. Read the **Business data has exactly one home** section of
  `CLAUDE.md` before writing it; it governs the shape. In short: `as const`, address stored
  as structured parts rather than one display string, phone stored once in E.164, plus the
  derived helpers `telHref()`, `mailtoHref()`, `formattedPhone()` and `formattedAddress()`
  so no caller ever formats these itself. Seed the contact fields from the defaults table.
  Every consumer, meaning the footer, the header, any contact page, the metadata, the
  JSON-LD builders and `llms.txt`, imports from here. Nothing retypes a phone number, an
  email or a street
- `lib/routing.ts`: pure helpers, zero data imports
- `lib/routes.ts`: the route registry consumed by `app/sitemap.ts`
- `lib/schema/index.ts`: typed JSON-LD builders (`Organization`, `WebSite`,
  `BreadcrumbList`) rendered through a `<JsonLd>` component. Every identity field comes
  from `BUSINESS`: `name`, `address` as a `PostalAddress` built from the structured parts,
  `telephone`, `email`, `openingHoursSpecification`, `sameAs`, `geo`. Keep `address` and
  `areaServed` as distinct fields, per `CLAUDE.md`
- `lib/validation/`: Zod schemas for every external boundary, `z.infer` types exported
  alongside

# PHASE 6: UI PRIMITIVES

`components/ui/`: `Button` (CVA variants primary / secondary / ghost / glass, sizes
sm/md/lg, `asChild`-style composition), `Card` (with a glass variant), `Input` (labelled,
`aria-invalid`, error text wired via `aria-describedby`), `GlassPanel`.

Follow the **Components** section of `CLAUDE.md` for the client-boundary and `cn()` rules.
Each primitive gets a Testing Library test covering render, variants, and keyboard
interaction.

Also build a `components/SiteFooter.tsx` that renders the business name, address, phone and
email, every value read from `BUSINESS` and every link built with `telHref()` /
`mailtoHref()`. It exists to prove the single source of truth end to end: the same facts
reach the visible page, the `tel:` href and the JSON-LD from one object.

# PHASE 7: TESTS THAT ACTUALLY GATE

Populate every folder in the testing table of `CLAUDE.md`. Minimum bar:

- `tests/lib/`: `cn`, `absoluteUrl`, route registry, schema builders, and Zod schemas
  with valid, invalid **and** boundary inputs
- `tests/lib/business-identity.test.ts`: **the guard that makes the single source of
  truth real.** Collect every string literal reachable in `BUSINESS`, walk `app/`,
  `components/`, `lib/`, `messages/` and `public/`, and fail with the offending file and
  value if any of them appears outside `lib/site-config.ts`. Take the needles from the data
  itself, never from a phone-shaped regex: that gives zero false positives, and a field
  added to `BUSINESS` tomorrow is guarded the moment it exists. Skip values shorter than a
  few characters so a country code like `ES` does not match prose. Prove it works by
  temporarily inlining the phone number in a component and watching the test fail
- `tests/seo/`: also assert the JSON-LD `Organization` node carries the same
  `telephone`, `email` and `address` parts as `BUSINESS`, so the structured data and the
  visible page can never disagree
- `tests/seo/`: metadata present and non-duplicated; sitemap matches the route
  registry exactly; JSON-LD parses and carries its required fields
- `tests/a11y/`: the dark-variant lock, the reduced-motion/transparency fallbacks
- `tests/e2e/`: homepage renders, navigation works, `/api/health` returns 200 (proving
  the SSR path), no console errors, mobile viewport usable

A test that only asserts the page is not blank is not a test.

# PHASE 8: DOCUMENTATION

- `README.md`: what the project is, the stack, `just setup`, the daily loop (`just dev`,
  `just validate`), the full gate (`just verify`), deploy, env vars, and the directory map.
  Point at `CLAUDE.md` for conventions instead of duplicating them; two copies of a rule
  means one of them is already stale.
- `.env.example`: every variable, grouped and commented, no real values.
- `CLAUDE.md`: already at the root. Re-read it now and correct any drift between what it
  promises and what you actually built.

# FINISH: RUN THESE AND PASTE THE REAL OUTPUT

```bash
just setup
just validate        # lint + type-check + coverage, all green
just build           # clean production build, no warnings you can't justify
just test-e2e        # Playwright green across all projects
just test-lighthouse # every `error` assertion passes
just preview         # boots in workerd, serves the homepage and /api/health
pre-commit run --all-files
```

Then walk the **Never do this** list in `CLAUDE.md` and confirm, item by item, that the
scaffold violates none of them.

Close with two short lists:

- **Assumptions**: every ambiguous call you made, plus the values you took from the
  defaults table, so the user can correct any of them in one pass.
- **Unverified**: any gate you could not run for an environmental reason (no Cloudflare
  account, no Chrome in the sandbox), stated plainly.

The scaffold is **not done** until everything above passes. Never report a gate as green
that you did not run.
