# Lorenzoz Agency - Website Development | Local SEO | Review Management | AI Voice Receptionist | Software Development / Mobile App Development

Production-grade Next.js 16 website and PWA for Lorenzoz Agency, a full-service growth
partner for local businesses covering website development, local SEO, review management,
AI voice receptionists, and custom software / mobile app development.

## 🎯 What This Site Does

Lorenzoz Agency's bilingual (English / Spanish) marketing site. This section documents
the full commercial context so the site and its content can be evolved against it.

> **Source of truth:** the agency's positioning, value ladder, and prices live in
> [AGENTS.md](./AGENTS.md#project-focus). The summary below is a pointer. When they
> disagree, AGENTS.md wins.

### Agency Services

Lorenzoz Agency builds solutions for local businesses of any size, with several years of
experience delivering them. The client focuses on delivering their own service; the
agency owns customer acquisition and follow-up. The mission is to create the conditions
for clients to generate 1M+ in revenue per year (an objective, not a guarantee).

It serves clients worldwide, focusing primarily on eight markets (Australia, Canada, Costa
Rica, Ireland, New Zealand, Spain, United Kingdom, United States). These are commercial
target markets, not the site's local GBP service area, see
[AGENTS.md](./AGENTS.md#target-markets) for why the two must not be conflated.

It sells one outcome, new customers for a local business, through one core offer:
**Local SEO**, a single monthly plan made of four pillars (authority content, backlinks
and citations, authority on Google and AI, and review management). Three optional
services sit around it: **Website Development**, **AI Voice Receptionist** and
**Software / Mobile App Development**.

Positioning, the offer, prices and terms are versioned in
[AGENTS.md](./AGENTS.md#agency-services) and are not repeated here. They are implemented
in [lib/pricing.ts](./lib/pricing.ts), which is the only place in the codebase a figure is
written down. Copy, JSON-LD, `llms.txt`, `priceRange` and the commercial dossier all
derive from it, so changing a price is one edit. Do not type a number into
`messages/*.json`.

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

Four service pages under `/services/`: Local SEO and the three optional services, each
carrying its price in both the visible copy and the structured data. The home page is
built around Local SEO. See
[AGENTS.md](./AGENTS.md#what-this-site-currently-implements).

## 🚀 Tech Stack

- **Framework**: Next.js 16 with App Router + Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with Glassmorphism design system
- **Animations**: GSAP
- **Fonts**: Inter & Outfit (Google Fonts)
- **Internationalization**: next-intl (English, Spanish)
- **Testing**: Vitest, Cypress, Playwright, Lighthouse CI
- **Deployment**: Cloudflare Workers (static assets, serving `out/`)
- **Package Manager**: Bun

> This is the stack of THIS marketing site. The agency's Software Development /
> Mobile App Development service uses a separate stack for client deliverables:
> Flutter (frontend) + a full-stack backend, targeting all devices and screens.

## ⚠️ Setup Instructions

### 1. Fix Package Manager Permissions

Before installing dependencies, you need to fix npm/Bun permissions:

```bash
# Fix npm cache permissions
sudo chown -R $(whoami) "/Users/hlorenzoz/.npm"

# OR check Bun temp directory permissions
echo $TMPDIR
```

### 2. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# OR using npm
npm install
```

### 3. Run Development Server

```bash
# Start development server with Turbopack
bun dev

# Server will be available at http://localhost:3000
```

## 📁 Project Structure

```
ai-agency-hlorenzoz/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with fonts & SEO
│   ├── page.tsx           # Home page with glassmorphism
│   └── globals.css        # Global styles & utilities
├── components/            # Reusable UI components (TBD)
├── lib/                   # Utilities & business logic (TBD)
│   ├── security/         # Security utilities (TBD)
│   └── design-system/    # Design tokens (TBD)
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   └── icons/            # App icons
├── tests/            # Test suites (TBD)
├── next.config.ts        # Next.js configuration
├── tailwind.config.ts    # Tailwind configuration
└── package.json          # Dependencies & scripts
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

### Local Development & Validation

Before pushing changes, run the validation suite:

```bash
bun run validate
```

This will run linting, type-checking, and tests.

### Unit Tests (Vitest)
```bash
bun run test:unit
```

### Component Tests (Cypress)
```bash
bun run test:component
```

### E2E Tests (Playwright)
```bash
bun run test:e2e
```

### Security Tests
```bash
bun run test:security
```

### Lighthouse CI
```bash
bun run lighthouse:local
```

## 🌍 Internationalization

Supports:
- English (default)
- Spanish

Locale structure:
```
messages/
├── en.json
└── es.json
```

## 📦 Build & Deploy

### Build for Production
```bash
bun run build
```

### Cloudflare Workers Deployment

Deployed as a static-assets Cloudflare Worker (`wrangler.jsonc`, serving `out/`).
Deploys run **automatically on every push** via Cloudflare Workers Builds (the
Worker is linked to this GitHub repo). Manual deploy: `bun run deploy` or `just deploy`.
From the workspace root, `just deploy website` runs the same manual deploy after a typed
confirmation. The global `just deploy` never includes the website: it relies on the
push deploy.

> Previously, CI/CD and deploys ran on a **GitHub Actions** pipeline. That
> workflow is now disabled (`.github/workflows/pipeline.yml`, commented out),
> with quality gates moved to pre-commit and deploys to Cloudflare Workers Builds.

The project includes:
- Static asset optimization
- Image optimization (AVIF, WebP)
- Security headers
- PWA support

## 🔧 Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Security
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

## 🚧 What's Next?

The following features are planned:

### Phase 2: Design System
- [ ] Design tokens
- [ ] Core UI components (Button, Card, Input)
- [ ] GSAP animations integration

### Phase 3: Internationalization
- [ ] Configure next-intl
- [ ] Create translation files
- [ ] Implement language switcher

### Phase 4: Security
- [ ] Rate limiting middleware
- [ ] Bot detection
- [ ] Input validation
- [ ] Form protection

### Phase 5: Testing
- [ ] Set up all test frameworks
- [ ] Write initial tests (TDD/TDS)

### Phase 6: CI/CD
- [ ] GitHub Actions workflows
- [x] Cloudflare Workers deployment (completed - live via Workers Builds)

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `bun dev` | Start development server with Turbopack |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun type-check` | Run TypeScript type checking |
| `bun test:unit` | Run unit tests |
| `bun test:component` | Run component tests |
| `bun test:e2e` | Run E2E tests |
| `bun test:security` | Run security tests |
| `bun lighthouse:local` | Run Lighthouse CI locally |

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) (TBD) for development guidelines.

## 🔐 Security

See [SECURITY.md](./SECURITY.md) (TBD) for security policies and reporting.

## 📄 License

Private - All Rights Reserved
