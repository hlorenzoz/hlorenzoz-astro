# Switched on

Changes that only take effect once something outside the code applies them.
Format checked by the engineering guardrail (`.guardrail.json` `switchedOn`).

### hlorenzoz-astro Worker deploy (wrangler.jsonc)
- **State**: ON
- **Who switches it on**: Cloudflare Workers Builds, on every push to main (Worker `hlorenzoz-astro`, connected to this repo in the dashboard). Production traffic moves only when the user reassigns the hlorenzoz.com domain from the old `hlorenzoz` Worker.
- **Check**: `curl -s https://hlorenzoz.com/sw.js | sed -n 2p`
- **Last check**: 2026-11-25 → "// v2: the Astro build. Bumping drops every cache from the previous build on activate." (hlorenzoz.com/en/ loads /_astro/ assets, no /_next/).
