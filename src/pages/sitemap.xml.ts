/**
 * /sitemap.xml: a sitemap index pointing at one `/sitemap-{locale}.xml` per
 * locale that has at least one page. The per-locale files are rendered by
 * `src/pages/sitemap-[locale].xml.ts` from the builders here.
 *
 * Every URL comes from `lib/routes.ts` through `absoluteUrl`, so it matches the
 * page's canonical exactly, and only in the locales the route registry says the
 * page is built in. Each `<url>` carries `xhtml:link` alternates for exactly
 * those locales plus `x-default`: the same set the page's own hreflang tags
 * list (`routeAlternates`), so the two signals cannot disagree.
 *
 * `lastModified` is per-route and hand-maintained rather than `new Date()`.
 * A build timestamp claims every page changed on every deploy, which teaches
 * crawlers to ignore the field entirely. `<priority>` and `<changefreq>` are
 * not emitted: Google and Bing ignore both.
 */
import { schemaDateTime } from '@/lib/schema/datetime';
import type { APIRoute } from 'astro';
import { ALL_ROUTES, routeAlternates } from '@/lib/routes';
import { BASE_URL, LOCALES, absoluteUrl, type Locale } from '@/lib/site-config';

export interface SitemapEntry {
    url: string;
    lastModified: Date;
    /** hreflang (BCP 47 tag or `x-default`) -> URL. */
    alternates: Record<string, string>;
}

/** The entries of one locale's sitemap, or of every locale when omitted. Also used by the tests. */
export function sitemap(locale?: Locale): SitemapEntry[] {
    // `lastModifiedDate` was parsed and validated once by `assertValidRoute`
    // when the route entered the registry, so this does not re-parse it.
    return ALL_ROUTES.flatMap((route) =>
        route.locales
            .filter((l) => locale === undefined || l === locale)
            .map((l) => ({
                url: absoluteUrl(l, route.path),
                lastModified: route.lastModifiedDate,
                alternates: routeAlternates(route.path),
            }))
    );
}

/** Locales with at least one page, in `LOCALES` order: the ones that get a sitemap. */
export function sitemapLocales(): Locale[] {
    return LOCALES.filter((locale) => ALL_ROUTES.some((route) => route.locales.includes(locale)));
}

export const localeSitemapUrl = (locale: Locale) => `${BASE_URL}/sitemap-${locale}.xml`;

// W3C Datetime with its zone, the same Madrid midnight the JSON-LD dateModified carries
// (`lastModified` is the UTC midnight of the stored YYYY-MM-DD, so its date part is that day).
const lastmod = (date: Date) => schemaDateTime(date.toISOString().slice(0, 10));

export function localeSitemapXml(locale: Locale): string {
    const urls = sitemap(locale)
        .map((e) => {
            const links = Object.entries(e.alternates)
                .map(([hreflang, href]) => `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>\n`)
                .join('');
            return `<url>\n<loc>${e.url}</loc>\n<lastmod>${lastmod(e.lastModified)}</lastmod>\n${links}</url>\n`;
        })
        .join('');
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
        `${urls}</urlset>\n`
    );
}

export function sitemapIndexXml(): string {
    const sitemaps = sitemapLocales()
        .map((locale) => {
            // The newest page in that sitemap, so the index lastmod changes exactly when the file does.
            const newest = Math.max(...sitemap(locale).map((e) => e.lastModified.getTime()));
            return `<sitemap>\n<loc>${localeSitemapUrl(locale)}</loc>\n<lastmod>${lastmod(new Date(newest))}</lastmod>\n</sitemap>\n`;
        })
        .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}</sitemapindex>\n`;
}

export const GET: APIRoute = () => new Response(sitemapIndexXml(), { headers: { 'Content-Type': 'application/xml' } });
