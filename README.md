# Lorenzoz Agency - Local SEO | Website Development | AI Voice Receptionist | AI Business Automation | Software Development / Mobile App Development

Production-grade Astro website and PWA for Lorenzoz Agency, a partner focused on the
success of local businesses: it analyses each client's needs, then implements a tailored
solution built from local SEO, website development, AI voice receptionists, AI business
automation, and custom software / mobile app development.

## 🎯 What This Site Does

Lorenzoz Agency's multilingual marketing site (nine locales, published page by page; see
Internationalization below). This section documents
the full commercial context so the site and its content can be evolved against it.

> **Source of truth:** the agency's positioning, services, way of working and terms live in
> [AGENTS.md](./AGENTS.md#project-focus). The summary below is a pointer. When they
> disagree, AGENTS.md wins.

### Agency Services

Lorenzoz Agency is a partner focused on its clients' success. It builds solutions for
local businesses of any size, with several years of
experience delivering them. The client focuses on delivering their own service; the
agency owns customer acquisition and follow-up. The mission is to create the conditions
for clients to generate 1M+ in revenue per year (an objective, not a guarantee).

It serves clients worldwide, focusing primarily on six markets (Australia, Canada, Costa
Rica, Europe, United Kingdom, United States). These are commercial
target markets, not the site's local GBP service area, see
[AGENTS.md](./AGENTS.md#target-markets) for why the two must not be conflated.

It works in two steps: a free first call that is the needs analysis, then the
implementation of one tailored solution. Five services are the building blocks of that
solution, combined per client and sometimes included at no extra cost: **Local SEO**
(authority content, authority on Google and AI, and review management), **Website Development**, **AI Voice Receptionist**, **AI Business Automation** and **Software / Mobile
App Development**.

The only published price is the entry price, 500 EUR + VAT for a first implementation that
commits both sides; after it, a monthly fee tied to the results agreed in the proposal.
Everything else is quoted after the free needs analysis. Positioning, services and
terms are versioned in [AGENTS.md](./AGENTS.md#how-we-work) and are not repeated here.
`tests/seo/no-published-prices.test.ts` fails on any figure in the copy or any offer in
the JSON-LD.

#### Local SEO delivery: the Core 30 structure

Local SEO is delivered with the **Core 30** methodology: the client site's URL hierarchy
mirrors their Google Business Profile (GBP) hierarchy exactly, so Google can align the two
and build topical relevance. Homepage targets the primary GBP category plus the city
("Plumber Houston"), category pages cover each secondary GBP category ("Drain Cleaning
Service"), and service pages cover each individual service in that category ("Emergency
Drain Cleaning"). Internal linking mirrors the same hierarchy.

Run `/local-seo:website-structure-review` to audit a site against this structure. The full
tree, naming rules, and linking rules live in
[AGENTS.md](./AGENTS.md#local-seo--gbp-site-architecture-core-30), which is the single
source of truth for the methodology. Do not duplicate the tree here.

### What this site currently implements

The home page and five service pages under `/services/`, built as landing pages around
the partner model, with no price and the commercial dossier as a download
(`public/dossier/`). See
[AGENTS.md](./AGENTS.md#what-this-site-currently-implements).

## 🚀 Tech Stack

- **Framework**: Astro 7, static output (`dist/`), no server code at runtime
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (CSS-first, `src/styles/global.css`) with a glassmorphism design system
- **Icons**: Lucide (`@lucide/astro`)
- **Interactivity**: vanilla `<script>` in `.astro` components; React only for the ElevenLabs voice widget island, loaded on scroll
- **Fonts**: Inter, self-hosted through the Astro Fonts API
- **Internationalization**: `use-intl` translator over `messages/<locale>.json` (`lib/i18n.ts`)
- **Testing**: Vitest (Astro Container API), Playwright, Lighthouse CI
- **Deployment**: Cloudflare Workers (static assets, serving `dist/`)
- **Package Manager**: Bun

> This is the stack of THIS marketing site. The agency's Software Development /
> Mobile App Development service uses a separate stack for client deliverables:
> Flutter (frontend) + a full-stack backend, targeting all devices and screens.

## ⚙️ Setup

```bash
just setup   # bun install + pre-commit install
just dev     # Astro dev server at http://localhost:4321
```

Run `just` to list every recipe.

## 📁 Project Structure

```
hlorenzoz-astro/
├── src/
│   ├── pages/[locale]/   # Routes: /en/... and /es/..., one index.astro per page
│   ├── layouts/          # BaseLayout: <head>, skip link, site-wide widgets
│   ├── components/       # .astro components (vanilla scripts for interactivity)
│   ├── islands/          # React island: ElevenLabs voice widget
│   └── styles/           # global.css (Tailwind v4)
├── lib/                  # Data, service keys, routes, SEO metadata and JSON-LD builders
├── messages/             # <locale>.json, one per locale in lib/routing.ts
├── public/               # Static assets, _redirects, _headers, llms.txt, sw.js
├── tests/                # Vitest suites mirroring the source tree; tests/e2e for Playwright
├── scripts/              # CDN image sync, commercial dossier
├── astro.config.mjs      # Astro configuration
└── wrangler.jsonc        # Cloudflare Worker (static assets from dist/)
```

## 🎨 Design System

The project uses a **glassmorphism** design pattern with:
- Frosted glass effects with backdrop blur
- Gradient overlays
- Modern color palette (brand blues & golds)
- Smooth animations and transitions
- Dark mode support

### CSS Utilities

```css
.glass              // Base glassmorphism effect
.glass-card         // Interactive glass card with hover
```

## 🔒 Security Features

### Implemented
- ✅ Strict security headers (CSP, X-Frame-Options, HSTS)
- ✅ TypeScript strict mode
- ✅ Environment variable templates

### Planned
- Rate limiting middleware
- Bot detection
- Input validation with Zod
- CSRF protection
- Email validation
- Form protection

## 🧪 Testing Strategy

```bash
just validate   # lint + astro check + Vitest with coverage (same as the pre-commit hook)
just verify     # build + validate + Playwright E2E + Lighthouse CI against dist/
```

- **Unit and component tests (Vitest)**: `.astro` components render with the Container API
  (`tests/helpers/render.ts`); `tests/seo/dist-head.test.ts` checks the head of every built page.
- **E2E (Playwright)**: `just test-e2e-static` runs against `dist/`, including the client scripts.
- **Lighthouse CI**: `just test-lighthouse-static`.

## 🌍 Internationalization

Every page lives under `/{locale}/`, and the site supports the nine locales of `LOCALES` in `lib/routing.ts` (`en`, `es`,
`en-gb`, `gl`, `pt`, `it`, `fr`, `de`, `nl`) and is published page by page: a page exists in a
locale once its copy is translated into `messages/<locale>.json` (`pageLocales` in
`lib/i18n.ts`); until then it is not built there and gets no hreflang to it. Image alt text,
captions and titles, and every aria-label, are copy: they live in `messages/<locale>.json`, are
translated with the page, and a locale missing one does not publish that page. Words are fixed
in `docs/i18n-glossary.md`.
`en` is the default (x-default); `tests/i18n/messages-parity.test.ts` keeps `en` and `es` in
step, and `tests/i18n/no-hardcoded-a11y-text.test.ts` fails on any alt, title, aria-label or
caption written into a component instead of the messages.

## 📦 Build & Deploy

```bash
just build-pages   # static build into dist/
just preview       # build and serve dist/ with Wrangler
```

Deployed as a static-assets Cloudflare Worker (`wrangler.jsonc`, serving `dist/`). Deploys
run **automatically on every push** via Cloudflare Workers Builds once the Worker is linked
to this GitHub repo. Manual deploy: `just deploy`.

> CI/CD previously ran on a **GitHub Actions** pipeline. That workflow is disabled
> (`.github/workflows/pipeline.yml.disabled`), with quality gates in pre-commit and
> deploys on Cloudflare Workers Builds.

## 🔧 Environment Variables

Copy `.env.example` to `.env` and fill in the values. Only scripts read them (Cloudflare
uploads); the built site has no runtime environment.

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) (TBD) for development guidelines.

## 🔐 Security

See [SECURITY.md](./SECURITY.md) (TBD) for security policies and reporting.

## 📄 License

Private - All Rights Reserved
