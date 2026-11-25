import { describe, it, expect } from 'vitest';
import { GET as sitemapGET, sitemap } from '@/src/pages/sitemap.xml';
import { GET as robotsGET } from '@/src/pages/robots.txt';
import { ALL_ROUTES } from '@/lib/routes';
import { LOCALES, absoluteUrl } from '@/lib/site-config';

// The endpoints ignore their context argument.
const ctx = {} as Parameters<typeof sitemapGET>[0];

describe('/robots.txt', () => {
    it('allows everything and points at the sitemap, in the exact Next.js format', async () => {
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
                    `<url>\n<loc>${absoluteUrl(locale, route.path)}</loc>\n<lastmod>${route.lastModifiedDate.toISOString()}</lastmod>\n</url>\n`
                );
            }
        }
    });

    it('emits only loc and lastmod', async () => {
        const xml = await (await sitemapGET(ctx)).text();
        expect(xml).not.toMatch(/<priority>|<changefreq>/);
    });
});
