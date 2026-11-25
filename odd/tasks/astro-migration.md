# astro-migration

Objective: migrate hlorenzoz.com from Next.js 16 (static export) to Astro 7 with the same URLs, head, design, commands, agents and scripts. Branch: `main` (new repo). Delivery: work-unit commits, push to github.com/hlorenzoz/hlorenzoz-astro. Test runner: Vitest (`bun x vitest run`), Playwright, Lighthouse CI.
Backlog entry: `#T0052` in `.agents/data/TODO.json`. Writer contract: `docs/astro-migration-contract.md`.

## Specs

- **S1** Full migration, nothing visible changes. User: "La idea es migrar el proyecto hlorenzoz-nextjs a hlorenzoz-astro por completo y dejarlo completamente funcional, manteniendo las mismas funcionalidades, diseño, estilos, etc. Es decir, migrar por completo el sitio a Astro sin que cambie su diseño, comandos, agentes de IA, scripts, etc. Es decir, reutiliza todo lo que puedas." Acceptance: same route set as Next `out/`; same head tags and JSON-LD per page; same visual design (screenshot review); same `just` recipes and `package.json` script names; agents, commands and scripts work against the new paths.
- **S2** Stack kept. User: "Sigue utilizando Tailwind CSS , Glassmorfismo, Lucide Icons" (https://lucide.dev/guide/astro/). Acceptance: Tailwind v4 CSS unchanged in `src/styles/global.css`; icons from `@lucide/astro`.
- **S3** Astro MCP. User: "Instala el MCP de Astro dentro del proyecto" with server `https://mcp.docs.astro.build/mcp` (Streamable HTTP). Acceptance: `.mcp.json` at project root.
- **S4** Deploy target. User: "el proyecto se va a seguir desplegando en Cloudflare Workers, así que sigue utilizando Wrangler". Acceptance: `wrangler.jsonc` serves `dist/` as static assets, same Worker name and trailing-slash/404 handling.
- **S5** Docs. User: "Actualiza el @CLAUDE.md con los pasos para la migración, y el @hlorenzoz-astro/CLAUDE.md propio del proyecto en Astro según corresponda siguiendo las mejores prácticas" (https://code.claude.com/docs/en/best-practices#keep-claude-md-short).
- **S6** Repo. User: "Inicializa y añade el respectivo proyecto en Astro a: git remote add origin https://github.com/hlorenzoz/hlorenzoz-astro.git / git branch -M main / git push -u origin main".
- **S7** Component strategy (user answer): "Astro nativo": every component `.astro` + vanilla `<script>`; React only for the ElevenLabs island, loaded after scroll.
- **S8** Execution. User: "Usa múltiples agentes (3) de ser necesario. Crea las tareas con ogg y distribúyelas entre ellos".

## Tasks

| ID | Specs | Task | Route | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | S1-S4 | Scaffold: copy repo, Astro config, wrangler, MCP, lib seams (i18n, PageMeta, image), BaseLayout/Head/JsonLd | inline | done | 3e4cc83 |
| T2 | S5 | Docs: project CLAUDE.md, root CLAUDE.md steps, AGENTS.md, commands, TODO.json | inline | done | dfc0cec |
| T3 | S1, S2, S7 | Shell: Navbar, Footer, Breadcrumbs, FadeInImage, FAQ, CookieBanner, PWA, ElevenLabs island+loader, CalBooking, PageSidebar/LegalSidebar, root/404/sitemap.xml/robots.txt + tests | agent `astro-shell` | done | 17dda9b (61 tests green, sitemap/robots byte-identical to out/) |
| T4 | S1, S2, S7 | Home: page + NewsCarousel, PortfolioCarousel, LinkedInArticles, numbers/*, pricing/* + tests | agent `astro-home` | in progress | |
| T5 | S1, S2, S7 | Portfolio, news, card: pages + PortfolioBusiness, PortfolioTypeFilter, FullScreenshotCarousel, VerticalFeatureCarousel, ArticleByline + tests | agent `astro-portfolio` | in progress | |
| T6 | S1, S2, S7 | Services hub + 4 service pages + services/* components, 3 legal pages, HTML sitemap + tests | agent `astro-shell` (after T3) | in progress | |
| T7 | S1 | Cross-cutting tests: tests/seo, tests/styles, lib/routing-purity, docs/pipeline-docs, build-output head test over dist/ | first free agent | pending | |
| T8 | S1, S4 | Parity: route set, head/JSON-LD diff vs Next out/, sitemap/robots bytes, screenshots, `just verify`, `wrangler dev` smoke | inline + verifier | pending | |
| T9 | S6 | pre-commit install + run, push to origin main | inline | pending | |

Parallel writers share one tree with disjoint edit surfaces; the parent owns git and commits each unit after checking its diff.

## Log

- **L1** (2026-11-25, user, verbatim): "Mira, recientemente he creado un sitio web para un amigo con Astro (https://astro.build/) https://gerp-dj.com/ Y me encanta su performance [...] La idea es migrar el proyecto hlorenzoz-nextjs a hlorenzoz-astro por completo y dejarlo completamente funcional, manteniendo las mismas funcionalidades, diseño, estilos, etc. Es decir, migrar por completo el sitio a Astro sin que cambie su diseño, comandos, agentes de IA, scripts, etc. Es decir, reutiliza todo lo que puedas. Sigue utilizando Tailwind CSS , Glassmorfismo, Lucide Icons [...] Instala el MCP de Astro dentro del proyecto [...] Y el proyecto se va a seguir desplegando en Cloudflare Workers, así que sigue utilizando Wrangler. Actualiza el @CLAUDE.md con los pasos para la migración, y el @hlorenzoz-astro/CLAUDE.md propio del proyecto en Astro según corresponda siguiendo las mejores prácticas [...] Inicializa y añade el respectivo proyecto en Astro a: git remote add origin https://github.com/hlorenzoz/hlorenzoz-astro.git git branch -M main git push -u origin main"
- **L2** (2026-11-25, user answer): component strategy "Astro nativo (Recommended)".
- **L3** (2026-11-25, user, verbatim): "Usa múltiples agentes (3) de ser necesario. Crea las tareas con ogg y distribúyelas entre ellos". Read "ogg" as ODD (this document).
- **L4** Findings: the Next site is fully static (lib/actions are build-time JSON wrappers; `/` 301 lives in public/_redirects). Dead code not migrated: PWAInstaller, PageTransition, MotionWrapper, ScrollRevealer, components/ui, lib/design-system, tailwindcss-motion/intersect (never registered). Container API needs the Vitest `node` environment. Pre-commit hooks are installed at T9, once `just validate` is green, so intermediate unit commits run without the hook.
- **L5** (2026-11-25) T3 done. Shared fixes by parent: next/image getWidths ported to lib/image.ts + fetchpriority on srcset preloads (5d0d9f9, reported by astro-portfolio); string-keyed Translator, @types/jsdom, vitest globals types (17dda9b); renderAstro url/params (990fd2b). Deliberate behaviour changes in the shell: language switcher is `<a>` links, Escape closes the menu, 404 language links go to `/{loc}/`, ElevenLabs contact fallback is `/{locale}/#contact`, FAQ answers and cookie banner are in the HTML with `hidden`.
