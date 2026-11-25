import { describe, it, expect } from 'vitest';
import { GET as sitemapGET, localeSitemapXml, sitemap, sitemapLocales } from '@/src/pages/sitemap.xml';
import { GET as localeSitemapGET, getStaticPaths } from '@/src/pages/sitemap-[locale].xml';
import { GET as robotsGET } from '@/src/pages/robots.txt';
import { ALL_ROUTES, routeAlternates } from '@/lib/routes';
import { absoluteUrl, LOCALES } from '@/lib/site-config';
import { schemaDateTime } from '@/lib/schema/datetime';

// The index and robots endpoints ignore their context argument.
const ctx = {} as Parameters<typeof sitemapGET>[0];
const W3C_ZONED = /^\d{4}-\d{2}-\d{2}T00:00:00[+-]\d{2}:\d{2}$/;

describe('/robots.txt', () => {
    it('allows everything and points at the sitemap index, in the exact published format', async () => {
        const res = await robotsGET(ctx);
        expect(await res.text()).toBe('User-Agent: *\nAllow: /\n\nSitemap: https://hlorenzoz.com/sitemap.xml\n');
    });
});

describe('/sitemap.xml (index)', () => {
    it('lists one sitemap per locale that has pages, and only those', async () => {
        const xml = await (await sitemapGET(ctx)).text();
        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')).toBe(true);
        expect(xml.endsWith('</sitemap>\n</sitemapindex>\n')).toBe(true);
        const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        // Only locales with at least one built page get a sitemap (the rollout is page by page).
        const withPages = LOCALES.filter((locale) => ALL_ROUTES.some((route) => route.locales.includes(locale)));
        expect(sitemapLocales()).toEqual(withPages);
        expect(locs).toEqual(withPages.map((locale) => `https://hlorenzoz.com/sitemap-${locale}.xml`));
    });

    it('dates each sitemap with its newest page, as a zoned W3C datetime', async () => {
        const xml = await (await sitemapGET(ctx)).text();
        const values = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
        const newestIn = (locale: string) =>
            ALL_ROUTES.filter((r) => r.locales.includes(locale as never)).map((r) => r.lastModified).sort().at(-1)!;
        expect(values).toEqual(sitemapLocales().map((locale) => schemaDateTime(newestIn(locale))));
    });

    it('builds a per-locale file for exactly the indexed locales', () => {
        expect(getStaticPaths()).toEqual(sitemapLocales().map((locale) => ({ params: { locale } })));
    });
});

describe('/sitemap-{locale}.xml', () => {
    it('lists every route built in that locale, with its lastmod and hreflang alternates', async () => {
        const res = await localeSitemapGET({ params: { locale: 'es' } } as unknown as Parameters<typeof localeSitemapGET>[0]);
        const xml = await res.text();
        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n')).toBe(true);
        expect(xml.endsWith('</url>\n</urlset>\n')).toBe(true);
        for (const route of ALL_ROUTES) {
            const links = Object.entries(routeAlternates(route.path))
                .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>\n`)
                .join('');
            expect(xml).toContain(
                `<url>\n<loc>${absoluteUrl('es', route.path)}</loc>\n<lastmod>${schemaDateTime(route.lastModified)}</lastmod>\n${links}</url>\n`
            );
        }
        // Alternates point at /en/ URLs; the listed URLs themselves are all Spanish.
        expect(xml).not.toMatch(/<loc>https:\/\/hlorenzoz\.com\/en\//);
        expect([...xml.matchAll(/<url>/g)]).toHaveLength(ALL_ROUTES.length);
    });

    it('gives each URL exactly the alternates of the locales where that page exists, plus x-default', () => {
        const xml = localeSitemapXml('en');
        for (const route of ALL_ROUTES) {
            const block = xml.split('<url>').find((b) => b.includes(`<loc>${absoluteUrl('en', route.path)}</loc>`))!;
            const langs = [...block.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
            expect(langs, route.path || '(home)').toEqual(Object.keys(routeAlternates(route.path)));
        }
    });

    it('writes lastmod as a W3C datetime with its zone, the same instant the JSON-LD dateModified states', () => {
        // Google reads lastmod in W3C Datetime format; no milliseconds, no bare UTC "Z" midnight
        // (which is 23:00 the previous day in Madrid, a different day than the page claims).
        const values = [...localeSitemapXml('en').matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
        expect(values.length).toBe(ALL_ROUTES.length);
        for (const value of values) expect(value).toMatch(W3C_ZONED);
    });

    it('emits only loc, lastmod and the alternates', () => {
        expect(localeSitemapXml('en')).not.toMatch(/<priority>|<changefreq>/);
    });

    it('lists a locale only where the page exists', () => {
        for (const locale of LOCALES) {
            expect(sitemap(locale), locale).toHaveLength(ALL_ROUTES.filter((r) => r.locales.includes(locale)).length);
        }
        expect(sitemap()).toHaveLength(ALL_ROUTES.reduce((n, r) => n + r.locales.length, 0));
    });
});
