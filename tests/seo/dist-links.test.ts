/**
 * Every internal link the built site ships, read from `dist/`.
 *
 * A link must resolve to a file in `dist/` in its canonical form: with
 * `trailingSlash: 'always'`, `/en#pricing` is not the home page but a redirect
 * on Cloudflare and a 404 under `astro dev`. Its `#fragment`, when present,
 * must name an element on the target page. `public/_redirects` targets must
 * resolve too, or a redirect lands on the 404 page.
 *
 * Like dist-head.test.ts it SKIPS without a build at least as new as the
 * sources: run `bun run build` first.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { JSDOM } from 'jsdom';
import { BASE_URL } from '@/lib/site-config';

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

const pages = files(DIST, (name) => name.endsWith('.html')).map((f) => relative(DIST, f).split(sep).join('/'));
const sources = ['src', 'lib', 'messages', 'public'].flatMap((dir) => files(join(ROOT, dir), () => true));
const newest = Math.max(0, ...sources.map((p) => Math.floor(statSync(p).mtimeMs)));
const fresh = pages.length > 0 && Math.min(...pages.map((p) => statSync(join(DIST, p)).mtimeMs)) >= newest;

const ids = new Map<string, Set<string>>();
function idsOf(file: string): Set<string> {
    if (!ids.has(file)) {
        const { document } = new JSDOM(readFileSync(join(DIST, file), 'utf8')).window;
        ids.set(file, new Set([...document.querySelectorAll('[id]')].map((el) => el.id)));
    }
    return ids.get(file)!;
}

/** Why `href` (seen on `page`) is broken, or null when it resolves canonically. */
function problem(href: string, page: string): string | null {
    if (/^(mailto:|tel:|javascript:|data:|blob:)/.test(href)) return null;
    // index.html is served at its folder; other pages (404.html) at their own path.
    const pageUrl = new URL(page.replace(/index\.html$/, ''), `${BASE_URL}/`);
    const url = new URL(href, pageUrl);
    if (url.origin !== BASE_URL || url.pathname.startsWith('/cdn-cgi/')) return null;

    const path = decodeURIComponent(url.pathname);
    let file: string;
    if (path.endsWith('/')) {
        file = `${path.slice(1)}index.html`;
    } else if (extname(path)) {
        file = path.slice(1);
    } else {
        return `no trailing slash: use "${path}/${url.search}${url.hash}"`;
    }
    if (!existsSync(join(DIST, file))) return `no such file in dist/: ${file}`;

    const fragment = decodeURIComponent(url.hash.slice(1));
    if (fragment && file.endsWith('.html') && !idsOf(file).has(fragment)) return `#${fragment} is not an id on ${file}`;
    return null;
}

describe.skipIf(!fresh)(`dist/: every internal link resolves canonically (${fresh ? 'fresh build' : 'skipped: run bun run build'})`, () => { // guardrail: allow-skip needs a fresh build in dist/
    it.each(pages)('%s', (page) => {
        const { document } = new JSDOM(readFileSync(join(DIST, page), 'utf8')).window;
        const broken = [...document.querySelectorAll('[href], [src]')]
            .flatMap((el) => ['href', 'src'].map((attr) => el.getAttribute(attr)).filter((v): v is string => !!v))
            .map((href) => ({ href, problem: problem(href, page) }))
            .filter((link) => link.problem);
        expect(broken).toEqual([]);
    });

    it('points the PWA manifest at built pages and icons', () => {
        const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
        const urls: string[] = [
            manifest.start_url,
            ...(manifest.shortcuts ?? []).map((s: { url: string }) => s.url),
            ...(manifest.icons ?? []).map((i: { src: string }) => i.src),
        ];
        expect(urls.map((url) => ({ url, problem: problem(url, 'index.html') })).filter((u) => u.problem)).toEqual([]);
    });

    it('precaches only URLs the service worker can serve offline', () => {
        // A redirect (`/` -> `/en/`) cannot answer a navigation from the cache.
        const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
        const list = sw.match(/STATIC_ASSETS\s*=\s*\[([^\]]*)\]/)?.[1] ?? '';
        const urls = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]);
        expect(urls.length).toBeGreaterThan(0);
        expect(urls).not.toContain('/');
        expect(urls.map((url) => ({ url, problem: problem(url, 'index.html') })).filter((u) => u.problem)).toEqual([]);
    });

    it('sends every _redirects rule to a built page', () => {
        const rules = readFileSync(join(DIST, '_redirects'), 'utf8')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .map((line) => line.split(/\s+/));
        const broken = rules
            .filter(([, to]) => !to.includes(':'))
            .map(([from, to]) => ({ from, to, problem: problem(to, 'index.html') }))
            .filter((rule) => rule.problem);
        expect(broken).toEqual([]);
    });
});
