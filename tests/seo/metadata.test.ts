import { describe, it, expect, vi } from 'vitest';

// The locale layout is imported for its `generateMetadata`, which drags in
// `next/font/google`. That loader only exists inside the Next build pipeline,
// so stub it to a plain className/variable pair.
vi.mock('next/font/google', () => {
    const font = () => ({ className: 'font-mock', variable: '--font-mock' });
    return { Inter: font, Noto_Serif: font, Manrope: font };
});

// Portfolio detail metadata needs the item; mock the data layer.
vi.mock('@/lib/actions/portfolio', () => ({
    getPortfolioItemsAction: vi.fn(async () => [{ id: 'malaga-event-gear', slug: 'malaga-event-gear' }]),
    getPortfolioItemBySlugAction: vi.fn(async (slug: string) =>
        slug === 'malaga-event-gear'
            ? { id: 'malaga-event-gear', slug, type: 'live', image: 'https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/meg/malagaeventgear-1.webp', url: 'https://malagaeventgear.com/' }
            : null
    ),
}));

import type { Metadata } from 'next';
import { generateMetadata as localeLayoutMeta } from '@/app/[locale]/layout';
import { generateMetadata as listMeta } from '@/app/[locale]/portfolio/page';
import { generateMetadata as detailMeta } from '@/app/[locale]/portfolio/[slug]/page';
import { generateMetadata as cardMeta } from '@/app/[locale]/card/hector/layout';
import { generateMetadata as privacyMeta } from '@/app/[locale]/privacy-policy/page';
import { generateMetadata as termsMeta } from '@/app/[locale]/terms-conditions/page';
import { generateMetadata as cookieMeta } from '@/app/[locale]/cookie-policy/page';

const p = <T,>(v: T) => Promise.resolve(v);

describe('per-page canonical + OpenGraph (SEO)', () => {
    it('portfolio list self-canonicalizes with hreflang and matching og:url', async () => {
        const m = await listMeta({ params: p({ locale: 'en' }) });
        expect(m.alternates?.canonical).toBe('https://hlorenzoz.com/en/portfolio/');
        expect(m.openGraph?.url).toBe('https://hlorenzoz.com/en/portfolio/');
        expect(m.alternates?.languages).toMatchObject({
            en: 'https://hlorenzoz.com/en/portfolio/',
            es: 'https://hlorenzoz.com/es/portfolio/',
        });
    });

    it('portfolio detail self-canonicalizes per slug and uses the project cover as og image', async () => {
        const m = await detailMeta({ params: p({ locale: 'es', slug: 'malaga-event-gear' }) });
        expect(m.alternates?.canonical).toBe('https://hlorenzoz.com/es/portfolio/malaga-event-gear/');
        expect(m.openGraph?.url).toBe('https://hlorenzoz.com/es/portfolio/malaga-event-gear/');
        const imgs = m.openGraph?.images as Array<{ url: string }>;
        expect(imgs[0].url).toBe('https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/meg/malagaeventgear-1.webp');
    });

    it('card self-canonicalizes with the locale in the URL', async () => {
        const m = await cardMeta({ params: p({ locale: 'en' }) });
        expect(m.alternates?.canonical).toBe('https://hlorenzoz.com/en/card/hector/');
        expect(m.openGraph?.url).toBe('https://hlorenzoz.com/en/card/hector/');
    });

    it('policy pages self-canonicalize', async () => {
        const m = await privacyMeta({ params: p({ locale: 'en' }) });
        expect(m.alternates?.canonical).toBe('https://hlorenzoz.com/en/privacy-policy/');
    });
});

/**
 * Regression guard for a bug that shipped: the locale layout hardcoded
 * `openGraph.url = 'https://hlorenzoz.com'`, and because Next merges metadata
 * shallowly, every page that omitted its own `openGraph` inherited it. The
 * built artifact showed `og:url = https://hlorenzoz.com/` against
 * `canonical = https://hlorenzoz.com/en/privacy-policy/`.
 *
 * Any new page factory must be added here. A page whose og:url disagrees with
 * its canonical is telling crawlers it is a different page.
 */
describe('og:url equals canonical on every page factory', () => {
    const factories: [string, (args: { params: Promise<never> }) => Promise<Metadata>][] = [
        ['locale layout (home)', localeLayoutMeta],
        ['portfolio list', listMeta],
        ['card', cardMeta],
        ['privacy policy', privacyMeta],
        ['terms and conditions', termsMeta],
        ['cookie policy', cookieMeta],
    ];

    for (const locale of ['en', 'es']) {
        it.each(factories)(`%s self-canonicalizes in ${locale}`, async (_name, factory) => {
            const m = await factory({ params: p({ locale }) as Promise<never> });
            expect(m.alternates?.canonical).toBeTruthy();
            expect(m.openGraph?.url).toBe(m.alternates?.canonical);
        });
    }

    it('portfolio detail self-canonicalizes per slug', async () => {
        const m = await detailMeta({ params: p({ locale: 'es', slug: 'malaga-event-gear' }) });
        expect(m.openGraph?.url).toBe(m.alternates?.canonical);
    });
});
