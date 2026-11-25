// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static build served as assets by a Cloudflare Worker (see wrangler.jsonc).
// URLs keep the Next.js export shape: /{locale}/{path}/index.html.
export default defineConfig({
  site: 'https://hlorenzoz.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // React only renders the ElevenLabs island and the build-time QR code.
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['100 900'],
      subsets: ['latin'],
      display: 'swap',
    },
  ],
});
