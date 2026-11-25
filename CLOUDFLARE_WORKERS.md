# Astro Static Build on Cloudflare Workers

How this site is built and served, and the constraints that come with serving pure static assets.

## 1. Core configuration
`astro.config.mjs` is set up for static delivery:
-   **`output: 'static'`**: every page is pre-rendered into `dist/`. There is no server at runtime.
-   **`trailingSlash: 'always'`** + **`build.format: 'directory'`**: each page is emitted as `/{locale}/{path}/index.html` and linked with a trailing slash, the canonical form used in the sitemap, hreflang and JSON-LD.

## 2. Dynamic routes
Every dynamic route (`[locale]`, `[slug]`) exports `getStaticPaths()`, which lists the paths to pre-render (locales from `LOCALES` in `lib/site-config.ts`, slugs from the data in `lib/`). A path not returned there does not exist in `dist/`.

## 3. Generated files
-   **`/sitemap.xml`** and **`/robots.txt`** are static endpoints (`src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`) rendered at build time.
-   **Icons, `manifest.json`, `sw.js`, `llms.txt`** live in `public/` and are copied as-is.

## 4. Unsupported features (static constraints)
-   **No SSR routes, Astro Actions or middleware**: nothing runs on request. Server-side logic belongs in a dedicated Cloudflare Worker.
-   **Images** are not processed at build time: they live on the R2-backed CDN and are resized by Cloudflare Image Resizing (`lib/image.ts`).

## 5. Edge-side routing
Redirects and headers are Cloudflare configuration files in `public/`:
-   **`public/_headers`**: cache rules (`/_astro/*` is immutable), PWA files and text charsets.
-   **`public/_redirects`**: the `/` to `/en/` 301, legacy paths and SEO redirects.

## 6. Build & deployment
-   **Build command**: `astro build` (`bun run build` / `just build-pages`), emitting `dist/`.
-   **Deployment target**: a static-assets Cloudflare **Worker** (`wrangler.jsonc`, `name: hlorenzoz-astro`) serving `./dist` with `html_handling: auto-trailing-slash` and `not_found_handling: 404-page` (`dist/404.html`). Not Cloudflare Pages.
-   **Deployment strategy**: automatic on every push via **Cloudflare Workers Builds** once the Worker is linked to this GitHub repo. Manual fallback: `just deploy` (`astro build` + `wrangler deploy`).
