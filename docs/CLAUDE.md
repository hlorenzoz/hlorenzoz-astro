> [!IMPORTANT]
> **This file is a TEMPLATE, not active instructions for the repository it currently
> lives in.** It ships alongside [`scaffold-prompt.md`](./scaffold-prompt.md) and is meant
> to be copied, unmodified, into the root of a new project directory. The scaffolding
> agent deletes this banner as its first step. If you are an agent working inside *this*
> repo, ignore everything below and follow the root `CLAUDE.md` instead.

---

# CLAUDE.md

Project-level instructions for AI agents working on this project.
Read this before touching code. It documents the decisions, not the syntax.

## Commands

`just` is the single entry point. Run `just` with no arguments to list every recipe.

| Command | What it does | When |
| :--- | :--- | :--- |
| `just setup` | `bun install` + `pre-commit install` | once, after cloning |
| `just dev` | Next.js dev server | daily loop |
| `just validate` | lint + type-check + coverage | **before every commit** |
| `just verify` | build + lint + type-check + coverage + E2E + Lighthouse | before every PR |
| `just test-watch` | Vitest in watch mode | while writing tests |
| `just preview` | build + run in the workerd runtime | before every deploy |
| `just deploy` | build + `opennextjs-cloudflare deploy` | releases |
| `just typegen` | regenerate `cloudflare-env.d.ts` from bindings | after editing `wrangler.jsonc` |

`package.json` scripts are the machine interface; the `Justfile` is the human one. A recipe
**calls** its script, it never reimplements it. If the two drift, the Justfile is wrong.

Never claim work is done without running `just validate` and pasting the real output.

## Project defaults

Nothing in this file needs to be filled in. Where a name or value is needed and no one has
specified it, use these:

| Value | Default |
| :--- | :--- |
| Project and Worker name | the project directory name |
| `BASE_URL` | `http://localhost:3000` until a real domain is set, with a comment saying so |
| Brand primary color | `#3b82f6` |
| Locales | a single locale, `en`, with no i18n library |
| `BUSINESS` contact fields | reserved non-routable values: `contact@example.com` (RFC 2606) and `+15555550100` (the 555-01xx range, permanently unassigned) |
| `BUSINESS` address | a clearly provisional structured address, never a real street |

Seed the `BUSINESS` block with those reserved values rather than inventing a plausible
phone number or address. A made-up number can belong to a real person, and a plausible
placeholder is one that ships unnoticed. Reserved values are safe and obviously wrong,
and because everything derives from this one object, replacing them is a single edit.

## Stack

Next.js 16 (App Router, React 19), TypeScript 5 strict, Tailwind CSS v4, Zod,
lucide-react, CVA, Bun, Cloudflare Workers via `@opennextjs/cloudflare` (SSR),
Vitest 5 with Testing Library, Playwright, Lighthouse CI, ESLint 9 flat, pre-commit, Just.

Three of these are non-negotiable and break the build if you forget them:

- **Bun**, not npm/pnpm/yarn. It is pinned in `packageManager`.
- **Tailwind v4 is CSS-first.** There is no `tailwind.config.ts` and there must never be
  one. Tokens live in the `@theme` block of `app/globals.css`.
- **Node.js runtime, never Edge.** The adapter runs on `nodejs_compat`. `export const
  runtime = 'edge'` does not work here.

## Architecture

```
app/          ROUTING ONLY: layouts, pages, route handlers, metadata
components/   ui/ holds dumb primitives, <feature>/ holds domain components
lib/          all business logic, data shaping, config, validation
tests/    mirrors the source tree; e2e/ holds Playwright specs
scripts/      one-off tooling, never imported at runtime
```

### `app/` holds no logic

A route file composes and nothing else: no data shaping, no business rules, no
presentation detail. This is the container/presentational split expressed at the
filesystem level. When a page grows past composition, the logic moves to `lib/` and the
markup moves to `components/`, not the other way around.

### `lib/routes.ts` vs `lib/routing.ts` is load-bearing, not cosmetic

`routes.ts` is the **composition root**: it imports concrete data sources (JSON, CMS
clients) to derive the route list. Derivation happens at module scope, so a bundler cannot
tree-shake it. Importing *any* symbol from it drags the whole data source into that bundle.

`routing.ts` holds **pure helpers only**, such as `localeHref`, date parsers and types,
and is safe for client components.

Keep the two surfaces disjoint. Do not re-export one from the other "for convenience":
that is precisely what makes the wrong import compile instead of failing loudly. A unit
test asserts `routing.ts` pulls in nothing server-only. Do not weaken it.

### Single sources of truth

| Fact | Lives in | Everything else derives from it |
| :--- | :--- | :--- |
| Business identity: name, address, phone, email, hours, socials | `lib/site-config.ts` (`BUSINESS`) | footer, contact page, header, JSON-LD, metadata, `tel:`/`mailto:` links |
| URLs, locales, schema `@id`s | `lib/site-config.ts` | canonicals, sitemap, OG tags |
| Indexable routes | `lib/routes.ts` | `app/sitemap.ts`, HTML sitemap, breadcrumbs |
| Design tokens | `@theme` in `app/globals.css` | `lib/design-system/tokens.ts` mirrors it |
| Structured data | `lib/schema/index.ts` | every `<JsonLd>` render |

Never hardcode a URL in a page, use `absoluteUrl()` so canonicals and the sitemap emit the
same form. Never declare a page in two places; that is how a sitemap starts lying.

### Business data has exactly one home

Name, address, phone, email and opening hours are the facts most likely to be typed twice:
once in the footer, again on the contact page, again in the JSON-LD, again in a `tel:`
link. Then the business changes its phone number, five of the six get updated, and the site
publishes two different numbers. Search engines read that as an inconsistent NAP and it
costs local ranking; a visitor reads it as a dead line.

So there is exactly one `BUSINESS` object, exported `as const` from `lib/site-config.ts`,
and **every** surface derives from it: visible copy, metadata, JSON-LD, `tel:` and `mailto:`
hrefs, the footer, the contact page, `llms.txt`, and any generated content.

Two rules about its shape:

**Store it structured, never as display strings.** An address is its parts
(`streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry`), not
one line of text, because schema.org `PostalAddress` needs the parts and a one-line string
cannot be split back apart reliably. A phone number is stored once in E.164
(`+34600123456`), which is the only form `tel:` hrefs and schema.org accept, with a
separate display string or formatter for what the reader sees. Storing the pretty version
and regex-ing it back into E.164 at the point of use is how the two drift.

**Separate where the business IS from where it SELLS.** `address` is the physical
registration and belongs in schema.org `address`. The markets it serves belong in
`areaServed`. Collapsing them misstates the business: putting one town into `areaServed`
understates reach, putting a country into `address` fabricates a location. Keep them as
distinct fields even when they happen to overlap.

Provide the derived helpers next to the data so no caller has to build them: `telHref()`,
`mailtoHref()`, `formattedPhone()`, `formattedAddress()`. A caller that formats a phone
number itself is a caller that will format it differently from the next one.

**This is enforced, not requested.** `tests/lib/business-identity.test.ts` takes every
literal value out of `BUSINESS`, scans `app/`, `components/`, `lib/`, `messages/` and
`public/`, and fails if any of them appears anywhere except `lib/site-config.ts`. Taking
the needles from the data rather than from a regex means the guard has no false positives
and no maintenance: add a field to `BUSINESS` and it is guarded from that moment. When it
fails, the fix is to import from `site-config`, never to add the file to the ignore list.

### Validation happens at the boundary

Every external input (route handler bodies, form submissions, env vars, third-party
responses) is parsed with a Zod schema from `lib/validation/` before it reaches anything
else. Export `z.infer` types alongside each schema. Inside the boundary, types are
trustworthy; outside it, nothing is.

## Styling

All CSS lives in `app/globals.css`. There is no other stylesheet.

- **`@theme`**: brand colors, radius scale, glass shadows, font families wired to
  `next/font` CSS variables.
- **`@layer components`**: the glass vocabulary, namely `.glass-panel`, `.glass-card`,
  `.glass-header`, `.btn-primary` and `.text-gradient`.
- **`.text-gradient` declares a solid `color` first**, then the clipped gradient. Without
  the fallback, browsers lacking `background-clip: text` render nothing at all.

### Dark mode is a decision, not a default

Tailwind v4 binds `dark:` to `prefers-color-scheme`. On a light-only site that means every
`dark:` utility silently fires on the visitor's OS setting and half-darkens a white page,
including contrast failures under WCAG 1.4.11. This project gates the variant behind an
explicit class:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

A test locks this. If you ship a real dark theme, remove the gate deliberately and update
the test. Do not let the default creep back in through a config migration.

### Accessibility floors

Frosted glass over busy backgrounds is where contrast dies. Non-negotiable:

- Text at 4.5:1 or better, graphical objects and UI boundaries at 3:1 or better, on
  **every** glass surface
- `@media (prefers-reduced-transparency: reduce)` drops the blur
- `@media (prefers-reduced-motion: reduce)` drops the transitions
- Decorative `lucide-react` icons carry `aria-hidden`; meaningful ones carry a label

The Lighthouse gate asserts accessibility at 0.95 or better as an **error**, so skipping
this fails CI rather than shipping.

## Components

Primitives in `components/ui/` accept `className` and merge it through `cn()`, forward
refs, and use CVA for variants. Feature components group by domain, never by file type.

**`'use client'` is a cost, not a default.** Add it only when the component genuinely needs
state, effects, or browser APIs, and add it as low in the tree as possible. Pushing it up
to a page or layout to "make it work" turns the whole subtree into client JS.

## Testing

| Folder | Covers |
| :--- | :--- |
| `tests/components/` | one test per primitive: render, variants, keyboard |
| `tests/lib/` | pure logic, Zod schemas (valid, invalid and boundary) |
| `tests/seo/` | metadata presence, sitemap vs route-registry parity, JSON-LD shape |
| `tests/a11y/` | the dark-variant lock, reduced-motion/transparency fallbacks |
| `tests/e2e/` | Playwright, excluded from Vitest config and coverage |

Coverage thresholds are a **gate**, not a chart. Do not lower one to make a commit pass;
write the test.

Playwright has two configs. `playwright.config.ts` runs against the Next.js server;
`playwright.preview.config.ts` runs against workerd. They are different runtimes, so green
on one is not green on the other, and only the second matches what Cloudflare executes.

## Deployment

Cloudflare Workers via `@opennextjs/cloudflare`. Four constraints that cost real debugging
time when forgotten:

1. **`compatibility_date` of `2025-05-05` or later.** Older dates lack
   `FinalizationRegistry` and the Worker throws at runtime, not at build.
2. **`compatibility_flags: ["nodejs_compat"]`** is mandatory.
3. **Never construct a DB or API client at module scope.** Workers throw "Cannot perform
   I/O on behalf of a different request". Build clients inside the request handler.
4. **Turbopack.** Next 16 builds with Turbopack by default and the adapter has historically
   choked on that output ("Failed to load chunk server/chunks/ssr/"). Check the current
   OpenNext compatibility notes before changing the build command.

Worker bundles are capped at 3 MiB (free) or 10 MiB (paid), gzipped. If the deploy fails on
size, analyze `.open-next/server-functions/default/handler.mjs.meta.json` rather than
guessing at dependencies.

Always run `just preview` before `just deploy`.

## Conventions

- **Comments explain WHY.** Document the decision, the constraint, or the bug the code
  prevents. Never narrate what the line does.
- **Conventional commits**, in logical slices. No AI attribution or co-author trailers.
- **No `any`, no `@ts-ignore`, no `eslint-disable`** without a comment saying exactly why
  the rule is wrong in that spot.
- **Plain ASCII punctuation only.** No em dashes, en dashes, curly quotes, ellipsis
  characters or non-breaking spaces, in any file: content, code, comments, tests, scripts
  or commit messages.
- Imports use the `@/` alias, never deep relative chains.
- `lucide-react` icons are named imports, never the default barrel.

## Never do this

- Create a `tailwind.config.ts`
- Put business logic in `app/`
- Re-export `routes.ts` symbols from `routing.ts`
- `export const runtime = 'edge'`
- Hardcode a URL, phone number, email, address, price, or brand string outside its
  source-of-truth module. The business-identity test will fail the build.
- Lower a coverage threshold or flip a Lighthouse `error` assertion to `warn` to get green
- Commit `.env.local`, or put a real value in `.env.example`
- Report a gate as passing without running it
