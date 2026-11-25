/**
 * /sitemap.xml, byte-compatible with what the Next.js build emitted.
 *
 * One entry per route x locale using `absoluteUrl`, so every URL matches the
 * page's `alternates.canonical` exactly (locale prefix + trailing slash).
 * Routes come from `lib/routes.ts`, shared with the human-readable sitemap at
 * `/{locale}/sitemap/`, so the two can never disagree about what the site
 * contains.
 *
 * `lastModified` is per-route and hand-maintained rather than `new Date()`.
 * A build timestamp claims every page changed on every deploy, which teaches
 * crawlers to ignore the field entirely.
 *
 * Only `<loc>` and `<lastmod>` are emitted: Google and Bing ignore
 * `<priority>` and `<changefreq>`, and Bing schedules crawls around an
 * accurate `lastmod`, which is the whole value of this file.
 */
import type { APIRoute } from 'astro';
import { ALL_ROUTES } from '@/lib/routes';
import { LOCALES, absoluteUrl } from '@/lib/site-config';

/** The entries, also used by the sitemap tests. */
export function sitemap(): { url: string; lastModified: Date }[] {
    // `lastModifiedDate` was parsed and validated once by `assertValidRoute`
    // when the route entered the registry, so this does not re-parse it.
    return ALL_ROUTES.flatMap((route) =>
        LOCALES.map((locale) => ({
            url: absoluteUrl(locale, route.path),
            lastModified: route.lastModifiedDate,
        }))
    );
}

export function sitemapXml(): string {
    const urls = sitemap()
        .map((e) => `<url>\n<loc>${e.url}</loc>\n<lastmod>${e.lastModified.toISOString()}</lastmod>\n</url>\n`)
        .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}

export const GET: APIRoute = () => new Response(sitemapXml(), { headers: { 'Content-Type': 'application/xml' } });
