/**
 * Crawl-all, which is what Google asks for.
 *
 * This used to disallow `/api/`, the framework asset folder and `/static/`. Blocking the assets
 * a page needs to render "directly harms how well our algorithms render and
 * index your content" (Google). Nothing on this site needs crawl-blocking:
 * every route is public. Keeping a page OUT of the index is a job for
 * `noindex`, never for robots.txt, because a disallowed URL can still be
 * indexed from an external link while Google is forbidden to read the very tag
 * that would have excluded it.
 */
import type { APIRoute } from 'astro';
import { BASE_URL } from '@/lib/site-config';

export function robotsTxt(): string {
    return `User-Agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
}

export const GET: APIRoute = () => new Response(robotsTxt(), { headers: { 'Content-Type': 'text/plain' } });
