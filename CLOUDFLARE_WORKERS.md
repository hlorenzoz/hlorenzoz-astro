# Next.js 16+ Static Export on Cloudflare Workers

This document outlines the mandatory requirements and architectural constraints for deploying this high-performance Next.js 16 application to Cloudflare Workers (static assets) using **Static HTML Export**.

## 1. Core Configuration
The `next.config.ts` must be strictly configured for static delivery:
-   **`output: 'export'`**: Mandatory for generating the `out/` directory.
-   **`trailingSlash: true`**: Recommended to ensure clean URLs and correct indexing of subfolders at the edge.
-   **`images.unoptimized: true`**: (Optional but recommended) If not using a specialized image proxy, this ensures Next.js doesn't attempt server-side image optimization.

## 2. Dynamic Routing (The Static Param Rule)
For a Static Export, every dynamic route (e.g., `/[locale]`, `/[slug]`) **MUST** implement `generateStaticParams()`.
-   This function informs the build engine which paths to pre-render.
-   Failure to implement this results in a build-time error for `output: 'export'`.

## 3. Metadata & Configuration Files
Metadata files in dynamic segments require special handling:
-   **Favicons/Icons**: Move to the root `app/icon.svg` or `public/` to avoid dynamic parameter requirements.
-   **`robots.txt` & `sitemap.xml`**: Must export `const dynamic = 'force-static';` if handled via `robots.ts` or `sitemap.ts`.

## 4. Unsupported Features (Static Constraints)
The following features are **NOT** supported in Static Export mode:
-   **Server Actions (`"use server"`)**: No server exists to execute the action. Pivot to client-side `fetch` or third-party services.
-   **API Routes (`app/api/`)**: These are not exported. Use a dedicated **Cloudflare Worker** for server-side logic.
-   **Middleware**: Use **Cloudflare Workers** or **Proxy** patterns at the edge instead.

## 5. Edge-Side Routing
Redirects and Headers in `next.config.js` are ignored during Static Export. Use the official Cloudflare configuration files in the `public/` directory:
-   **`public/_headers`**: Controls CSP, HSTS, and PWA caching.
-   **`public/_redirects`**: Manages SEO redirects and path mappings.

## 6. Build & Deployment
-   **Build Command**: `next build` (run as `bun run build:pages`; with `output: 'export'` this emits `out/`).
-   **Deployment Target**: A static-assets Cloudflare **Worker** (`wrangler.jsonc`, `name: hlorenzoz`) that serves `./out`. Not Cloudflare Pages.
-   **Deployment Strategy**: Automatic on every push via **Cloudflare Workers Builds** (the Worker is linked to the GitHub repo). Manual fallback: `bun run deploy` (`build:pages` + `wrangler deploy`) or `just deploy`.
-   **Previously**: CI/CD and deploys ran on a **GitHub Actions** pipeline (using `wrangler pages deploy`). That workflow is now disabled (commented out) and superseded by Cloudflare Workers Builds.

---
**Status**: SUCCESS. This architecture provides the fastest possible TTFB by serving pure static assets from the global Cloudflare edge.
