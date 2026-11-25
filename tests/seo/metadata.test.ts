/**
 * Per-page canonical + OpenGraph. Under Next these were `generateMetadata`
 * exports; in Astro the page frontmatter builds the `PageMeta` and BaseLayout
 * renders it, so the pages are rendered and their <head> is read.
 */
import { describe, it, expect } from 'vitest';
import { headFacts, renderPage } from './render-page';
import HomePage from '@/src/pages/[locale]/index.astro';
import ListPage from '@/src/pages/[locale]/portfolio/index.astro';
import DetailPage from '@/src/pages/[locale]/portfolio/[slug]/index.astro';
import CardPage from '@/src/pages/[locale]/card/hector/index.astro';
import PrivacyPage from '@/src/pages/[locale]/privacy-policy/index.astro';
import TermsPage from '@/src/pages/[locale]/terms-conditions/index.astro';
import CookiePage from '@/src/pages/[locale]/cookie-policy/index.astro';

const meta = async (Page: unknown, params: Record<string, string>) => headFacts(await renderPage(Page, params));

describe('per-page canonical + OpenGraph (SEO)', () => {
    it('portfolio list self-canonicalizes with hreflang and matching og:url', async () => {
        const m = await meta(ListPage, { locale: 'en' });
        expect(m.canonical).toBe('https://hlorenzoz.com/en/portfolio/');
        expect(m.ogUrl).toBe('https://hlorenzoz.com/en/portfolio/');
        expect(m.languages).toMatchObject({
            en: 'https://hlorenzoz.com/en/portfolio/',
            es: 'https://hlorenzoz.com/es/portfolio/',
        });
    });

    it('portfolio detail self-canonicalizes per slug and uses the project cover as og image', async () => {
        const m = await meta(DetailPage, { locale: 'es', slug: 'malaga-event-gear' });
        expect(m.canonical).toBe('https://hlorenzoz.com/es/portfolio/malaga-event-gear/');
        expect(m.ogUrl).toBe('https://hlorenzoz.com/es/portfolio/malaga-event-gear/');
        expect(m.ogImages[0]).toBe('https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/meg/malagaeventgear-1.webp');
    });

    it('card self-canonicalizes with the locale in the URL', async () => {
        const m = await meta(CardPage, { locale: 'en' });
        expect(m.canonical).toBe('https://hlorenzoz.com/en/card/hector/');
        expect(m.ogUrl).toBe('https://hlorenzoz.com/en/card/hector/');
    });

    it('policy pages self-canonicalize', async () => {
        const m = await meta(PrivacyPage, { locale: 'en' });
        expect(m.canonical).toBe('https://hlorenzoz.com/en/privacy-policy/');
    });
});

/**
 * Regression guard for a bug that shipped: the locale layout hardcoded
 * `openGraph.url = 'https://hlorenzoz.com'`, and because metadata merges
 * shallowly, every page that omitted its own `openGraph` inherited it. The
 * built artifact showed `og:url = https://hlorenzoz.com/` against
 * `canonical = https://hlorenzoz.com/en/privacy-policy/`. BaseLayout keeps that
 * shallow merge, so the hazard is still live.
 *
 * Any new page must be added here (or is covered by `dist-head.test.ts` after a
 * build). A page whose og:url disagrees with its canonical is telling crawlers
 * it is a different page.
 */
describe('og:url equals canonical on every page', () => {
    const pages: [string, unknown][] = [
        ['layout defaults (home)', HomePage],
        ['portfolio list', ListPage],
        ['card', CardPage],
        ['privacy policy', PrivacyPage],
        ['terms and conditions', TermsPage],
        ['cookie policy', CookiePage],
    ];

    for (const locale of ['en', 'es']) {
        it.each(pages)(`%s self-canonicalizes in ${locale}`, async (_name, Page) => {
            const m = await meta(Page, { locale });
            expect(m.canonicals).toHaveLength(1);
            expect(m.canonical).toBeTruthy();
            expect(m.ogUrl).toBe(m.canonical);
        });
    }

    it('portfolio detail self-canonicalizes per slug', async () => {
        const m = await meta(DetailPage, { locale: 'es', slug: 'malaga-event-gear' });
        expect(m.ogUrl).toBe(m.canonical);
    });
});
