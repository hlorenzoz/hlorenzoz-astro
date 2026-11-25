import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en/news/',
    useParams: () => ({ locale: 'en' }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

import NewsPage, { generateMetadata as listMeta } from '@/app/[locale]/news/page';
import NewsPostPage, {
    generateMetadata as postMeta,
    generateStaticParams,
} from '@/app/[locale]/news/[slug]/page';
import { getNewsItems } from '@/lib/news';
import { getPortfolioItems } from '@/lib/portfolio';
import { schemaDateTime, isSchemaDateTime, assertSchemaInvariants } from '@/lib/schema/datetime';

const SEED = 'masajes-orisha-added-to-portfolio';
const BASE = 'https://hlorenzoz.com';
const p = <T,>(v: T) => Promise.resolve(v);

type Node = Record<string, unknown>;
function graphOf(container: HTMLElement): Node[] {
    return [...container.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => JSON.parse(s.textContent ?? '{}'))
        .flatMap((d: Node) => (d['@graph'] as Node[]) ?? [d]);
}

describe('news listing metadata', () => {
    it.each(['en', 'es'])('self-canonicalizes in %s with both hreflang alternates', async (locale) => {
        const m = await listMeta({ params: p({ locale }) });
        expect(m.alternates?.canonical).toBe(`${BASE}/${locale}/news/`);
        expect(m.openGraph?.url).toBe(m.alternates?.canonical);
        expect(m.alternates?.languages).toMatchObject({
            en: `${BASE}/en/news/`,
            es: `${BASE}/es/news/`,
        });
    });
});

describe('news post metadata', () => {
    it.each(['en', 'es'])('self-canonicalizes in %s with both hreflang alternates', async (locale) => {
        const m = await postMeta({ params: p({ locale, slug: SEED }) });
        expect(m.alternates?.canonical).toBe(`${BASE}/${locale}/news/${SEED}/`);
        expect(m.openGraph?.url).toBe(m.alternates?.canonical);
        expect(m.alternates?.languages).toMatchObject({
            en: `${BASE}/en/news/${SEED}/`,
            es: `${BASE}/es/news/${SEED}/`,
        });
    });

    it('is an OpenGraph article with its dates and falls back to the cover image', async () => {
        const item = getNewsItems().find((n) => n.slug === SEED)!;
        const m = await postMeta({ params: p({ locale: 'en', slug: SEED }) });
        const og = m.openGraph as Record<string, unknown>;
        expect(og.type).toBe('article');
        expect(og.publishedTime).toBe(schemaDateTime(item.datePublished));
        expect(og.modifiedTime).toBe(schemaDateTime(item.lastModified));
        expect((og.images as { url: string }[])[0].url).toBe(item.ogImage ?? item.image);
    });

    it('returns empty metadata for an unknown slug', async () => {
        expect(await postMeta({ params: p({ locale: 'en', slug: 'nope' }) })).toEqual({});
    });

    it('pre-renders every post in both locales', async () => {
        const params = await generateStaticParams();
        expect(params).toHaveLength(getNewsItems().length * 2);
        expect(params).toContainEqual({ locale: 'es', slug: SEED });
    });
});

describe('news listing page', () => {
    it.each(['en', 'es'])('emits CollectionPage + ItemList + BreadcrumbList in %s', async (locale) => {
        const { container } = render(await NewsPage({ params: p({ locale }) }));
        const graph = graphOf(container);
        const page = graph.find((n) => n['@type'] === 'CollectionPage')!;
        expect(page.inLanguage).toBe(locale);
        expect(page.url).toBe(`${BASE}/${locale}/news/`);
        const list = page.mainEntity as { '@type': string; itemListElement: { url: string }[] };
        expect(list['@type']).toBe('ItemList');
        expect(list.itemListElement.map((i) => i.url)).toContain(`${BASE}/${locale}/news/${SEED}/`);
        const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')!;
        expect((crumbs.itemListElement as { item: string }[]).map((c) => c.item)).toEqual([
            `${BASE}/${locale}/`,
            `${BASE}/${locale}/news/`,
        ]);
    });

    it('links every post', async () => {
        const { container } = render(await NewsPage({ params: p({ locale: 'en' }) }));
        for (const item of getNewsItems()) {
            expect(container.querySelector(`a[href="/en/news/${item.slug}"]`)).not.toBeNull();
        }
        expect(container.querySelector('h1')).not.toBeNull();
    });
});

describe('news post page', () => {
    it.each(getNewsItems().flatMap((n) => ['en', 'es'].map((locale) => [locale, n.slug])))(
        'emits only zoned datetimes and a typed about in %s %s',
        async (locale, slug) => {
            const { container } = render(await NewsPostPage({ params: p({ locale, slug }) }));
            const graph = graphOf(container);
            const article = graph.find((n) => n['@type'] === 'NewsArticle')!;
            expect(isSchemaDateTime(article.datePublished)).toBe(true);
            expect(isSchemaDateTime(article.dateModified)).toBe(true);
            expect(article.about).toMatchObject({ '@type': 'WebPage' });
            expect(typeof (article.about as Node).name).toBe('string');
            expect(() => assertSchemaInvariants(graph)).not.toThrow();
        }
    );

    it.each(['en', 'es'])('emits NewsArticle + BreadcrumbList in %s', async (locale) => {
        const item = getNewsItems().find((n) => n.slug === SEED)!;
        const { container } = render(await NewsPostPage({ params: p({ locale, slug: SEED }) }));
        const graph = graphOf(container);
        const article = graph.find((n) => n['@type'] === 'NewsArticle')!;
        expect(article.inLanguage).toBe(locale);
        expect(article.url).toBe(`${BASE}/${locale}/news/${SEED}/`);
        expect(article.datePublished).toBe(schemaDateTime(item.datePublished));
        expect(article.dateModified).toBe(schemaDateTime(item.lastModified));
        // A typed node, not a bare URL string Google reads as an untyped Thing.
        expect(article.about).toEqual({
            '@type': 'WebPage',
            '@id': `${BASE}/${locale}/portfolio/masajes-orisha/`,
            url: `${BASE}/${locale}/portfolio/masajes-orisha/`,
            // The mocked translator echoes the key: proves the portfolio item's title is used.
            name: 'portfolio.masajes-orisha.title',
        });
        const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList')!;
        expect((crumbs.itemListElement as { item: string }[]).map((c) => c.item)).toEqual([
            `${BASE}/${locale}/`,
            `${BASE}/${locale}/news/`,
            `${BASE}/${locale}/news/${SEED}/`,
        ]);
    });

    it('shows the published date and links the case study and the live site', async () => {
        const work = getPortfolioItems().find((w) => w.id === 'masajes-orisha')!;
        const { container } = render(await NewsPostPage({ params: p({ locale: 'en', slug: SEED }) }));
        expect(container.querySelector('time[datetime="2026-11-24"]')).not.toBeNull();
        expect(container.querySelector('a[href="/en/portfolio/masajes-orisha"]')).not.toBeNull();
        expect(container.querySelector(`a[href="${work.url}"]`)).not.toBeNull();
        expect(container.querySelectorAll('h1')).toHaveLength(1);
    });

    it('404s an unknown slug', async () => {
        await expect(NewsPostPage({ params: p({ locale: 'en', slug: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    });
});
