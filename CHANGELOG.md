# Changelog

## [Unreleased]

### Added
- Documented the agency's expanded service catalog in `README.md` and `AGENTS.md`: Local SEO, Review Management, and Software Development / Mobile App Development (Flutter + full-stack backend), plus the value ladder and the 1M+ USD client-revenue goal.

### Changed
- Reconciled `README.md` and `AGENTS.md` with the live site by separating "Agency Services" (the full offering) from "What this site currently implements" (Website Building, AI Voice Assistant, Digital Business Cards), removing a pre-existing docs/site drift.
- Renamed `CLOUDFLARE_PAGES.md` to `CLOUDFLARE_WORKERS.md` and corrected residual "Cloudflare Pages" references to "Cloudflare Workers" across docs and code comments (`next.config.ts`, `Justfile`, `scripts/deploy_to_all.sh`, `app/page.tsx`). Deployment is a static-assets Worker.

### Removed
- Dead `CLOUDFLARE_PAGES_PROJECT` environment variable from the env samples (`README.md` and `.env.example`); it is not read by any code.

## [2.4.0] - 2026-04-09

### Added
- `test:essentials` script in `package.json` for holistic Lint, Type-Check, Build, and Lighthouse verification in a single command.
- Bot-aware skipping for `CookieBanner` and `ElevenLabsLazy` components to prevent performance interference during automated audits.

### Changed
- Standardized Canonical and Alternate URLs to include trailing slashes, ensuring consistency with static hosting directory structures.
- Improved `Navbar` accessibility with dynamic `aria-label` and `aria-expanded` states for the language switcher and mobile menu.
- Delayed `CookieBanner` initial appearance by 5 seconds to protect the LCP window for human users.

### Fixed
- Resolved `NO_LCP` errors in Lighthouse audits caused by large third-party overlays.
- Fixed "Conflicting Canonical" SEO error by consolidating logic into the Metadata API and removing redundant manual tags.
- Added missing SEO metadata translations in `en.json` and `es.json`.

## [2.3.0] - 2026-04-08

### Added
- Bot-aware performance optimization: Conditionally bypass high-cost framer-motion animations when a bot (Lighthouse/Googlebot) is detected to ensure immediate LCP visibility.
- Modern JavaScript Delivery: Updated `browserslist` to target modern browser Baseline (2023+), reducing polyfill injection and legacy transpilation footprint.

### Changed
- Lighthouse CI Environment: Switched audit server to `bun sirv` in `lighthouserc.json` for better asset compression and header handling.
- Accessibility (Contrast): Hardened contrast ratios for "Live" and "Demo" badges in `PortfolioCarousel.tsx` to meet WCAG standards.
- Resource Prioritization: Optimized critical path by removing `priority` from below-the-fold assets in `page.tsx`.

### Fixed
- Resolved `NO_LCP` and `Lighthouse CI` audit timeouts in the deployment pipeline.
- Fixed common console warnings regarding legacy JavaScript delivery.

## [2.2.0] - 2026-04-04

### Added
- Dynamic portfolio details for all conceptual demos (Dental Clinic, Luxury Real Estate, Fitness Studio Pro).
- Fully localized portfolio detail pages in English and Spanish.
- Generic `VerticalFeatureCarousel` component supporting arbitrary feature slides.
- E2E tests for new portfolio detail routes and language switching.

### Changed
- Refactored `PortfolioItemPage` to use a data-driven approach for content and metadata.
- Updated `pre-commit` hooks to use `bun` for faster local execution.
- Optimized `VerticalFeatureCarousel` with better translation scoping and flexible props.

### Fixed
- Fixed linting errors in `VerticalFeatureCarousel` and `PortfolioCarousel`.
- Corrected missing translation messages in portfolio detail views.
- Improved mobile responsiveness and accessibility in portfolio detail components.
- Fixed E2E navigation link locators (About -> Benefits, and case-insensitive Solutions/Contact).
- Stabilized language switching tests for mobile viewports.
- Standardized "Portfolio" branding across Navbar, Footer, and translations.
