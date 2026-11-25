import { describe, it, expect } from 'vitest';
import NewsPage from '@/src/pages/[locale]/news/index.astro';
import NewsPostPage, { getStaticPaths } from '@/src/pages/[locale]/news/[slug]/index.astro';
import { getNewsItems } from '@/lib/news';
import { getPortfolioItems } from '@/lib/portfolio';
import { schemaDateTime, isSchemaDateTime, assertSchemaInvariants } from '@/lib/schema/datetime';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import { headFacts, jsonLdNodes, renderPage } from './render-page';
import { TECH_LINKS } from '@/lib/tech-links';

const SEED = 'masajes-orisha-in-portfolio';
const BASE = 'https://hlorenzoz.com';
const MESSAGES: Record<string, typeof en> = { en, es };

type Node = Record<string, unknown>;

const listing = (locale: string) => renderPage(NewsPage, { locale });
const post = (locale: string, slug = SEED) => renderPage(NewsPostPage, { locale, slug });

describe('news listing metadata', () => {
    it.each(['en', 'es'])('self-canonicalizes in %s with both hreflang alternates', async (locale) => {
        const m = headFacts(await listing(locale));
        expect(m.canonical).toBe(`${BASE}/${locale}/news/`);
        expect(m.ogUrl).toBe(m.canonical);
        expect(m.languages).toMatchObject({
            en: `${BASE}/en/news/`,
            es: `${BASE}/es/news/`,
        });
    });
});

describe('news post metadata', () => {
    it.each(['en', 'es'])('self-canonicalizes in %s with both hreflang alternates', async (locale) => {
        const m = headFacts(await post(locale));
        expect(m.canonical).toBe(`${BASE}/${locale}/news/${SEED}/`);
        expect(m.ogUrl).toBe(m.canonical);
        expect(m.languages).toMatchObject({
            en: `${BASE}/en/news/${SEED}/`,
            es: `${BASE}/es/news/${SEED}/`,
        });
    });

    it('is an OpenGraph article with its dates and falls back to the cover image', async () => {
        const item = getNewsItems().find((n) => n.slug === SEED)!;
        const m = headFacts(await post('en'));
        expect(m.ogType).toBe('article');
        expect(m.ogPublished).toBe(schemaDateTime(item.datePublished));
        expect(m.ogModified).toBe(schemaDateTime(item.lastModified));
        expect(m.ogImages[0]).toBe(item.ogImage ?? item.image);
    });

    it('fails the build for an unknown slug instead of shipping an empty page', async () => {
        // Under Next an unknown slug returned empty metadata and a 404. Astro
        // only renders the paths getStaticPaths lists, so a miss means the data
        // changed under the build, and the page refuses to render.
        await expect(post('en', 'nope')).rejects.toThrow(/Unknown news slug/);
    });

    it('pre-renders every post in both locales', async () => {
        const paths = await getStaticPaths();
        const params = paths.map((p) => p.params);
        expect(params).toHaveLength(getNewsItems().length * 2);
        expect(params).toContainEqual({ locale: 'es', slug: SEED });
    });
});

describe('news listing page', () => {
    it.each(['en', 'es'])('emits CollectionPage + ItemList + BreadcrumbList in %s', async (locale) => {
        const graph = jsonLdNodes(await listing(locale));
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
        const document = await listing('en');
        for (const item of getNewsItems()) {
            expect(document.querySelector(`a[href="/en/news/${item.slug}/"]`)).not.toBeNull();
        }
        expect(document.querySelector('h1')).not.toBeNull();
    });
});

describe('news post page', () => {
    it.each(getNewsItems().flatMap((n) => ['en', 'es'].map((locale) => [locale, n.slug])))(
        'emits only zoned datetimes and a typed about in %s %s',
        async (locale, slug) => {
            const graph = jsonLdNodes(await post(locale, slug));
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
        const graph = jsonLdNodes(await post(locale));
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
            // The portfolio item's own title, in the page's locale.
            name: MESSAGES[locale].portfolio['masajes-orisha'].title,
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
        const document = await post('en');
        expect(document.querySelector('time[datetime="2026-11-24"]')).not.toBeNull();
        expect(document.querySelector('a[href="/en/portfolio/masajes-orisha/"]')).not.toBeNull();
        expect(document.querySelector(`a[href="${work.url}"]`)).not.toBeNull();
        expect(document.querySelectorAll('h1')).toHaveLength(1);
    });
});

describe('long posts with sections', () => {
    type Section = { heading: string; paragraphs: string[]; image?: string; imageAlt?: string };
    const withSections = getNewsItems().filter((item) => (en.news.items as unknown as Record<string, { sections?: Section[] }>)[item.id].sections);

    it('includes the in-depth case studies', () => {
        expect(withSections.length).toBeGreaterThanOrEqual(5);
    });

    it.each(withSections.flatMap((item) => (['en', 'es'] as const).map((locale) => [item.slug, locale, item.id] as const)))(
        '%s (%s) renders every section as an h2 with its copy and image',
        async (slug, locale, id) => {
            const messages = (locale === "en" ? en : es).news.items as unknown as Record<string, { sections: Section[] }>;
            const sections = messages[id].sections;
            const document = await renderPage(NewsPostPage, { locale, slug }, `/${locale}/news/${slug}/`);
            const headings = [...document.querySelectorAll('article h2, main h2')].map((h) => h.textContent?.trim());
            for (const section of sections) {
                expect(headings).toContain(section.heading);
                expect(document.body.textContent).toContain(section.paragraphs[0]);
                if (section.image) {
                    const img = [...document.querySelectorAll('img')].find((i) => i.getAttribute('alt') === section.imageAlt);
                    expect(img, `${section.imageAlt}`).toBeDefined();
                }
            }
        }
    );
});

describe('links to the technologies a post mentions', () => {
    it.each(getNewsItems().flatMap((item) => (['en', 'es'] as const).map((locale) => [item.slug, locale] as const)))(
        '%s (%s) links each technology site at most once, followed, in a new tab',
        async (slug, locale) => {
            const document = await renderPage(NewsPostPage, { locale, slug }, `/${locale}/news/${slug}/`);
            const external = [...document.querySelectorAll('article a[target="_blank"], main p a[target="_blank"]')]
                .map((a) => a as HTMLAnchorElement)
                .filter((a) => TECH_LINKS.some((t) => t.url === a.getAttribute('href')));
            const hosts = external.map((a) => new URL(a.getAttribute('href')!).host);
            expect(hosts.length, 'one link per technology site').toBe(new Set(hosts).size);
            for (const a of external) {
                expect(a.getAttribute('rel')).toBe('noopener');
                expect(a.getAttribute('rel')).not.toContain('nofollow');
            }
        }
    );

    it('links Astro, Next.js and Cloudflare in the Astro rebuild post', async () => {
        const document = await renderPage(NewsPostPage, { locale: 'en', slug: 'lorenzoz-agency-case-study' }, '/en/news/lorenzoz-agency-case-study/');
        const hrefs = [...document.querySelectorAll('main p a[target="_blank"]')].map((a) => a.getAttribute('href'));
        for (const url of ['https://astro.build/', 'https://nextjs.org/', 'https://www.cloudflare.com/']) expect(hrefs).toContain(url);
    });
});
