# Switched on

Changes that only take effect once something outside the code applies them.
Format checked by the engineering guardrail (`.guardrail.json` `switchedOn`).

### hlorenzoz-astro Worker deploy (wrangler.jsonc)
- **State**: PARTIAL
- **Who switches it on**: Cloudflare Workers Builds, on every push to main (Worker `hlorenzoz-astro`, connected to this repo in the dashboard). Production traffic moves only when the user reassigns the hlorenzoz.com domain from the old `hlorenzoz` Worker.
- **Check**: `bunx wrangler deployments list --name hlorenzoz-astro`
- **Last check**: 2026-11-25 → `wrangler deploy --dry-run`: "Read 146 files from the assets directory .../dist", "--dry-run: exiting now." First Workers Build failed on the Bun 1.3.6 lockfile; rerun pending after this push.
