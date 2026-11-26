// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import trailingSlashRedirect from './src/integrations/trailing-slash-redirect.mjs';

// Static build served as assets by a Cloudflare Worker (see wrangler.jsonc).
// URLs take the form /{locale}/{path}/, emitted as /{locale}/{path}/index.html.
export default defineConfig({
  site: 'https://hlorenzoz.com',
  output: 'static',
  trailingSlash: 'always',
  // Inline the stylesheet in every page: one shared CSS file was the only
  // render-blocking request PageSpeed reported. Costs about 16 KiB per HTML.
  build: { format: 'directory', inlineStylesheets: 'always' },
  // React only renders the ElevenLabs island and the build-time QR code.
  // trailingSlashRedirect: `astro dev` redirects /en to /en/ like the Worker does.
  integrations: [react(), trailingSlashRedirect()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['100 900'],
      subsets: ['latin'],
      // Normal only: italic copy is synthesized from it, as the site always rendered it.
      styles: ['normal'],
      display: 'swap',
    },
  ],
});
