/**
 * The head every built page actually ships, read from `dist/`.
 *
 * The per-page suites (metadata, news-pages, service-pages-config) render a
 * page or call its builders; this one checks the artifact, for EVERY route,
 * so a page added later is covered without anyone remembering to list it.
 * Under Next the same facts were spread across `generateMetadata` exports; in
 * Astro the frontmatter computes them and BaseLayout renders them, so the built
 * HTML is the single place they can all be seen together.
 *
 * It needs a build at least as new as the sources, and SKIPS otherwise: `bun
 * run test` does not build, and a stale `dist/` is an absence of evidence, not
 * a defect. Run `bun run build` first to exercise it.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { JSDOM } from 'jsdom';
import { assertSchemaInvariants } from '@/lib/schema/datetime';
import { BASE_URL, LOCALES } from '@/lib/site-config';
import { sitemap } from '@/src/pages/sitemap.xml';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

function files(dir: string, keep: (name: string) => boolean): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return files(full, keep);
        return keep(entry.name) ? [full] : [];
    });
}

const newest = (paths: string[]) => Math.max(0, ...paths.map((p) => statSync(p).mtimeMs));
const oldest = (paths: string[]) => Math.min(...paths.map((p) => statSync(p).mtimeMs));

/** Locale pages only: the root `index.html` is a redirect stub, not a route. */
const pages = files(DIST, (name) => name === 'index.html')
    .map((file) => relative(DIST, file).split(sep).join('/'))
    .filter((rel) => LOCALES.some((locale) => rel.startsWith(`${locale}/`)));

const sources = ['src', 'lib', 'messages'].flatMap((dir) => files(join(ROOT, dir), () => true));
const fresh = pages.length > 0 && oldest(pages.map((p) => join(DIST, p))) >= newest(sources);
const reason = pages.length === 0 ? 'dist/ has no built pages' : 'dist/ is older than src/, lib/ or messages/';

describe.skipIf(!fresh)(`dist/: every built page ships a complete head (${fresh ? 'fresh build' : `skipped: ${reason}, run bun run build`})`, () => { // guardrail: allow-skip needs a fresh build in dist/
    it('builds a page for every URL the XML sitemap lists', () => {
        const built = new Set(pages.map((p) => `${BASE_URL}/${p.replace(/index\.html$/, '')}`));
        const missing = sitemap().map((e) => e.url).filter((url) => !built.has(url));
        expect(missing, 'sitemap URLs with no built page').toEqual([]);
    });

    it.each(pages)('%s', (page) => {
        const { document } = new JSDOM(readFileSync(join(DIST, page), 'utf8')).window;
        const head = document.head;
        const url = `${BASE_URL}/${page.replace(/index\.html$/, '')}`;
        const rest = page.replace(/^[a-z]{2}\//, '').replace(/index\.html$/, '');

        // One canonical, and it is this page.
        const canonicals = [...head.querySelectorAll('link[rel="canonical"]')].map((l) => l.getAttribute('href'));
        expect(canonicals).toEqual([url]);

        // hreflang: both locales and x-default (the default locale).
        const alternates = Object.fromEntries(
            [...head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
                l.getAttribute('hreflang'),
                l.getAttribute('href'),
            ])
        );
        expect(alternates).toEqual({
            en: `${BASE_URL}/en/${rest}`,
            es: `${BASE_URL}/es/${rest}`,
            'x-default': `${BASE_URL}/en/${rest}`,
        });

        // og:url must not inherit the layout's URL (the shallow-merge bug).
        expect(head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(url);

        expect(head.querySelector('title')?.textContent?.trim()).toBeTruthy();
        expect(head.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()).toBeTruthy();

        // Every JSON-LD block parses and keeps the datetime / typed-about rules.
        const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
        expect(blocks.length).toBeGreaterThan(0);
        for (const block of blocks) {
            const data = JSON.parse(block.textContent ?? '');
            expect(() => assertSchemaInvariants(data)).not.toThrow();
        }
    });
});
