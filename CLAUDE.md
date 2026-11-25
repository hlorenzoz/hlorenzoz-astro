@AGENTS.md

## Claude Code

The imported `AGENTS.md` above is the source of truth for the agency's commercial facts,
the site architecture, and the content conventions. It is shared with every other agent
that works on this repo. This section covers only what it does not: how to actually run
the project, and behaviour specific to Claude Code.

### Commands

`just` is the entry point. Run `just` with no arguments to list every recipe.

| Command | What it does |
| :--- | :--- |
| `just setup` | `bun install` + `pre-commit install`. Run once after cloning. |
| `just dev` | Next.js dev server |
| `just validate` | lint + type-check + coverage. Mirrors the local pre-commit hook. |
| `just verify` | build + lint + type-check + coverage + E2E + Lighthouse. The full gate. |
| `just test-watch` | Vitest in watch mode |
| `just test-e2e-static` | Playwright against the static export in `out/` |
| `just test-lighthouse-static` | Lighthouse CI against the static export |
| `just build-pages` | Static export build for Cloudflare Workers |
| `just preview` | Build and preview with Wrangler |
| `just images-sync` | Convert new `assets/` images to webp+avif+jpeg and upload to R2 |

Package manager is **Bun**, pinned in `packageManager`. Never npm, pnpm or yarn.

### Before you commit

Run `just validate`. The pre-commit hook runs the same three checks (`lint`, `type-check`,
`test`) and will reject the commit otherwise. Never bypass it with `--no-verify`.

E2E and Lighthouse are deliberately NOT in the hook, because minute-long hooks get
bypassed. Run `just verify` before opening a PR.

### Deploys are automatic

Production deploys run on every push: the Worker is linked to the GitHub repo through
Cloudflare Workers Builds. `just deploy` exists only for a manual out-of-band deploy.

Consequence worth remembering: this site is a static export, so a content or date change
only reaches production on redeploy. An updated `lastModified` that has not been deployed
is not an updated page.

### Build and test shape

- Next.js 16 with `output: 'export'` and `trailingSlash: true`. There is no server code
  at runtime, so no route handlers, no server actions, no middleware.
- Tests live in `tests/`, mirroring the source tree. `tests/e2e/` holds Playwright
  specs and is excluded from Vitest in `vitest.config.ts`.
- Tailwind v4 is CSS-first. All styling lives in `app/globals.css`. `tailwind.config.ts.old`
  is dead weight kept for reference and is NOT read by the build.
- `dark:` utilities are gated behind an explicit `.dark` class via `@custom-variant`, and a
  test locks that. The site ships no dark theme; removing the gate half-darkens every page
  for visitors whose OS is in dark mode.

### Use plan mode for these

Changes to `lib/pricing.ts`, `lib/site-config.ts`, `lib/routes.ts` or `messages/*.json`
ripple into the visible copy, the JSON-LD, the sitemap and `public/llms.txt` at once.
Propose the change before making it.

### Task tracking

`.agents/data/TODO.json` is the ONLY backlog for this project. Read it before starting
work. Do not create a `TODO.md`, a `TASKS.md` or any parallel list: a second list is a
second source of truth, and the two drift.

- **Before non-trivial work**, find its task. If there is none, add it first.
- **When you start**, set `estado` to `en curso`.
- **When it is done AND verified**, set `estado` to `hecha` and `hecha` to today's date,
  in the same change as the code. A task closed before `just validate` passes is not done.
- **Every edit bumps the top-level `updated`** to today's date.
- **Findings and blockers go in the task's `notas`**, not in a new file. Ordering goes in
  `depende`, not in prose.
- **Never reuse or renumber an `id`.** The next task takes the highest id plus one.
  Execution order comes from `prioridad` and `depende`, not from the number.

Keys and values are in Spanish, and every string is plain ASCII (the "No AI Typographic
Characters" rule in `AGENTS.md` applies here too, which is why the text carries no accents).

| Field | Values |
| :--- | :--- |
| `id` | `#T0001`, sequential |
| `estado` | `pendiente`, `en curso`, `bloqueada`, `hecha`, `descartada` |
| `prioridad` | `alta`, `media`, `baja` |
| `tipo` | `negocio`, `datos`, `contenido`, `diseno`, `schema`, `facturacion`, `docs`, `infra` |
| `titulo` | one line, says what changes |
| `anotada` / `hecha` | ISO date; `hecha` is `null` until the task closes |
| `origen` | who asked for it: `usuario`, an agent name, or the file it was migrated from |
| `depende` | ids that must be `hecha` first |
| `notas` | findings, blockers, open questions |
| `descripcion` | lines of text: the goal, the files, how to verify |

### `docs/CLAUDE.md` is not instructions for this repo

`docs/CLAUDE.md` is a TEMPLATE that ships with `docs/scaffold-prompt.md`, meant to be
copied into a newly scaffolded project. Claude Code auto-loads `CLAUDE.md` files from
subdirectories when it reads files there, so it will appear in context while you work in
`docs/`. Ignore it. This file and the imported `AGENTS.md` are the instructions for this
repository.
