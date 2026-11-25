/**
 * /sitemap-{locale}.xml: one locale's URLs with their hreflang alternates.
 * Listed by the index at /sitemap.xml; built only for locales with pages.
 */
import type { APIRoute } from 'astro';
import type { Locale } from '@/lib/site-config';
import { localeSitemapXml, sitemapLocales } from '@/src/pages/sitemap.xml';

export function getStaticPaths() {
    return sitemapLocales().map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = ({ params }) =>
    new Response(localeSitemapXml(params.locale as Locale), { headers: { 'Content-Type': 'application/xml' } });
