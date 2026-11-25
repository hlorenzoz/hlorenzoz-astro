import { describe, it, expect } from 'vitest';
import { GET as sitemapGET, sitemap } from '@/src/pages/sitemap.xml';
import { GET as robotsGET } from '@/src/pages/robots.txt';
import { ALL_ROUTES } from '@/lib/routes';
import { LOCALES, absoluteUrl } from '@/lib/site-config';
import { schemaDateTime } from '@/lib/schema/datetime';

// The endpoints ignore their context argument.
const ctx = {} as Parameters<typeof sitemapGET>[0];

describe('/robots.txt', () => {
    it('allows everything and points at the sitemap, in the exact published format', async () => {
        const res = await robotsGET(ctx);
        expect(await res.text()).toBe('User-Agent: *\nAllow: /\n\nSitemap: https://hlorenzoz.com/sitemap.xml\n');
    });
});

describe('/sitemap.xml', () => {
    it('lists every route in every locale, with its hand-maintained lastmod', async () => {
        const xml = await (await sitemapGET(ctx)).text();
        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')).toBe(true);
        expect(xml.endsWith('</url>\n</urlset>\n')).toBe(true);
        expect(sitemap()).toHaveLength(ALL_ROUTES.length * LOCALES.length);
        for (const route of ALL_ROUTES) {
            for (const locale of LOCALES) {
                expect(xml).toContain(
                    `<url>\n<loc>${absoluteUrl(locale, route.path)}</loc>\n<lastmod>${schemaDateTime(route.lastModified)}</lastmod>\n</url>\n`
                );
            }
        }
    });

    it('writes lastmod as a W3C datetime with its zone, the same instant the JSON-LD dateModified states', async () => {
        // Google reads lastmod in W3C Datetime format; no milliseconds, no bare UTC "Z" midnight
        // (which is 23:00 the previous day in Madrid, a different day than the page claims).
        const xml = await (await sitemapGET(ctx)).text();
        const values = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
        expect(values.length).toBe(ALL_ROUTES.length * LOCALES.length);
        for (const value of values) expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00[+-]\d{2}:\d{2}$/);
    });

    it('emits only loc and lastmod', async () => {
        const xml = await (await sitemapGET(ctx)).text();
        expect(xml).not.toMatch(/<priority>|<changefreq>/);
    });
});
