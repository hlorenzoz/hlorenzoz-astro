# Next.js -> Astro migration: writer contract

> Historical record of the 2026-11-25 migration. The SOURCE repo below is archived at
> github.com/hlorenzoz/hlorenzoz-nextjs and no longer exists locally.

User request (verbatim, Spanish): "La idea es migrar el proyecto hlorenzoz-nextjs a hlorenzoz-astro por completo y dejarlo completamente funcional, manteniendo las mismas funcionalidades, diseño, estilos, etc. Es decir, migrar por completo el sitio a Astro sin que cambie su diseño, comandos, agentes de IA, scripts, etc. Es decir, reutiliza todo lo que puedas. Sigue utilizando Tailwind CSS , Glassmorfismo, Lucide Icons"

Decision taken with the user: Astro-native components (`.astro` + vanilla `<script>`), React ONLY for the ElevenLabs widget island. Goal: near-zero JS, same URLs, same HTML head, same visual design.

## Paths
- SOURCE (read-only reference, never edit): `/Users/hlorenzoz/databank/COD3/projects/Lorenzoz Agency/projects/hlorenzoz.com/website/hlorenzoz-nextjs`
  - pages: `app/[locale]/**/page.tsx`, components: `components/**`, old tests: `tests/**`
  - reference build output: `out/` (e.g. `out/en/index.html`) shows the exact HTML Next emitted.
- TARGET repo: `/Users/hlorenzoz/databank/COD3/projects/Lorenzoz Agency/projects/hlorenzoz.com/website/hlorenzoz-astro`
  - `lib/`, `messages/`, `public/` stay at repo root, unchanged unless your unit says otherwise.
  - Components: `src/components/<same relative path as components/>` with `.astro` extension (e.g. `components/services/ServiceHero.tsx` -> `src/components/services/ServiceHero.astro`).
  - Pages: `src/pages/[locale]/<same path as app/[locale]/>`, e.g. `app/[locale]/news/[slug]/page.tsx` -> `src/pages/[locale]/news/[slug]/index.astro`. Use `getStaticPaths()` reproducing `generateStaticParams` exactly (locales from `LOCALES` in `lib/site-config.ts`, slugs from the same lib functions).
  - Old tests for your unit are already copied into the target `tests/` and must be ported in place (same file names, `.tsx` -> `.ts` when no JSX remains).

## Already in place (reuse, do not re-implement)
- `src/layouts/BaseLayout.astro`: props `locale`, `meta?: PageMeta`, `preloadImages?: {href?|srcset,sizes}[]`. Renders html/head (layout default metadata merged SHALLOWLY with `meta`, like Next), skip link, `<main id="main-content">` wrapping the slot, org JSON-LD. Pages render Navbar/Footer inside the slot exactly as the Next pages did.
- `src/components/Head.astro`, `src/components/JsonLd.astro` (prop `data`).
- `lib/i18n.ts`: `getTranslations(locale, namespace?)` -> use-intl translator. Replace `await getTranslations('ns')` / `useTranslations('ns')` with `getTranslations(locale, 'ns')`. `t()`, `t.raw()`, `t.has()` work. `t.rich(key, { tag: (c) => <b>{c}</b> })` becomes `t.markup(key, { tag: (c) => `<b>${c}</b>` })` rendered with `<Fragment set:html={...} />`.
- `lib/page-metadata.ts`: `PageMeta` type (alias `Metadata`) + `pageMetadata()`. A page's old `generateMetadata` body moves into frontmatter and its result is passed as `<BaseLayout meta={...}>`.
- `lib/image.ts`: `imageUrl`, `imageSrcSet`, `imageFallbackSrc` reproduce next/image + the Cloudflare loader (same widths, quality 50, format=auto).
- `lib/utils/cn.ts` (clsx + tailwind-merge) works in frontmatter too; `class:list` is also fine.
- `src/styles/global.css` = old `app/globals.css` (already imported by BaseLayout).
- Test helper `tests/helpers/render.ts`: `const r = await renderAstro(Component, props, slots)` returns `{ html, document, body, ...within(body) }` (testing-library queries). Vitest env is `node` by default (Astro components only compile server-side); jest-dom matchers are loaded. Run tests with `bun x vitest run <path>`.

## Porting rules
1. Markup and Tailwind classes 1:1. Same element types, same order, same `id`s, `aria-*`, `data-*`. Visual design must not change.
2. `next/link` -> `<a href>`. Keep `localeHref()` / `absoluteUrl()` from lib. `next/image` -> `src/components/FadeInImage.astro` (or a plain `<img>` with `imageSrcSet` when the original used `<Image>` directly). Images marked `priority` -> no lazy loading, `fetchpriority="high"`, and pass a `preloadImages` entry to BaseLayout.
3. `lucide-react` -> `@lucide/astro` (`import { ArrowRight } from '@lucide/astro'`), same `class`/size/strokeWidth/aria-hidden props. All 43 icons exist (some via aliases).
4. `usePathname()` / `useParams()` -> build-time `Astro.url.pathname` / `Astro.params`.
5. Interactivity -> a `<script>` in the same `.astro` file (Astro bundles and dedupes it; it runs once per page, so query ALL instances, e.g. `document.querySelectorAll('[data-faq]')`). Strings needed at runtime go in `data-*` attributes or a `<script type="application/json">` blob; never ship whole message files. Preserve every behaviour of the React version (keyboard handlers, body scroll lock, timers, localStorage keys, bot skips, ARIA state toggling like `aria-expanded`).
6. Delete nothing in `lib/` that other units use. Do not touch files outside your allowed edit surfaces. If a shared file needs a change, report it instead.
7. Keep the code comments that explain WHY (they carry SEO/a11y rationale); update references to Next-specific APIs.
8. Generated artifacts in English. Plain ASCII in comments you write (no smart quotes / em dashes), per AGENTS.md.
9. Do not commit, do not run git commands that change state, do not run `bun install` or formatters over the whole repo. The parent owns git.
10. Test discipline: for each component/page you port, port its existing test file so it asserts the same observable behaviour (text, roles, hrefs, attributes, JSON-LD). Behaviour that only exists in a client `<script>` cannot be exercised by the Container API: assert the server-rendered initial state + data attributes, and list the dropped interactive assertions in your report (they move to Playwright later). Do not reduce assertions about static output.

## Verification you run
- `bun x astro check` limited noise is fine, but your files must have 0 errors: run `bun x astro check 2>&1 | grep -E "error" | grep -E "<your paths>"`.
- `bun x vitest run <your test files>` green.
- `bun run build` succeeds (other units may be mid-flight: if the build fails only because of files outside your surface, say so).
- For each page you port, diff its built `dist/<locale>/<path>/index.html` visible text and head tags against the SOURCE `out/<locale>/<path>/index.html` (e.g. a small python -I script in a `mktemp -d` dir, never in the repo) and report any difference.

## Report format
- Files created/changed, tests ported (+ dropped interactive assertions), verification commands with observed results, differences vs `out/`, and anything you needed but could not touch.
- Scratch paths you created (the parent deletes them).
- Close with a `## Key Learnings` block of 1-5 numbered standalone factual sentences.
