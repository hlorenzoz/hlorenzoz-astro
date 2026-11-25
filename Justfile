# hlorenzoz.com — task runner. Run `just` to list recipes.
# Requires: bun, wrangler, pre-commit, node.

# Silence the non-actionable baseline-browser-mapping "old data" warning: we
# already track its latest release, but the bundled Baseline dataset trails the
# current date, so the check can never read as fresh. Exported to every recipe.
export BROWSERSLIST_IGNORE_OLD_DATA := "true"

# Show all available recipes
default:
    @just --list

# --- Setup ---------------------------------------------------------------

# Install dependencies and the local git hook (run once after cloning)
setup:
    bun install
    pre-commit install

# --- Dev / build ---------------------------------------------------------

# Start the Next.js dev server
dev:
    bun next dev

# Production build (Next.js)
build:
    bun next build

# Static export build for Cloudflare Workers (./out)
build-pages:
    bun run build:pages

# Serve the production build locally
start:
    bun next start

# Build for Pages and preview with Wrangler
preview:
    bun run preview

# Regenerate Cloudflare env types
typegen:
    bun run cf-typegen

# --- Quality -------------------------------------------------------------

# Lint
lint:
    bun run lint

# Lint and auto-fix
lint-fix:
    bun run lint:fix

# TypeScript type-check (no emit)
type-check:
    bun run type-check

# Unit + integration tests
test:
    bun run test

# Unit tests in watch mode
test-watch:
    bun run test:watch

# Unit tests with coverage
test-coverage:
    bun run test:coverage

# Playwright E2E (dev server)
test-e2e:
    bun run test:e2e

# Playwright E2E against the static export
test-e2e-static:
    bun run test:e2e:static

# Lighthouse CI audit
test-lighthouse:
    bun run test:lighthouse

# Lighthouse CI against the static export
test-lighthouse-static:
    bun run test:lighthouse:static

# Fast gate (matches the local pre-commit hook): lint + type-check + coverage
validate:
    bun run validate

# Full gate: build + lint + type-check + coverage + E2E + Lighthouse
verify:
    bun run test:all

# --- Git hooks (pre-commit framework) ------------------------------------

# Run every pre-commit hook against all files
hooks-run:
    pre-commit run --all-files

# Update pinned hook versions
hooks-update:
    pre-commit autoupdate

# --- CDN images ----------------------------------------------------------

# Convert new assets/ images to webp+avif+jpeg and upload to R2 (idempotent)
images-sync:
    bun run images:sync

# CDN path migration tool. Pass a mode, e.g. `just migrate-cdn --execute`
# (no args = dry-run). Modes: (none) | --execute | --delete
migrate-cdn *args:
    node scripts/migrate-cdn-paths.mjs {{args}}

# --- Sales material ------------------------------------------------------

# Build the commercial dossier PDF into dossier/dist/. No args = es and en;
# pass a language for one, e.g. `just dossier es`.
dossier *locales:
    node scripts/build-dossier.mjs {{locales}}

# --- Deploy --------------------------------------------------------------

# Production deploys run AUTOMATICALLY on every push via Cloudflare Workers
# Builds (the Worker is linked to the GitHub repo). This recipe is only for a
# manual out-of-band deploy: build the static export and `wrangler deploy`.
deploy:
    bun run deploy
