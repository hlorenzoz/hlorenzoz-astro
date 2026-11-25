/**
 * Every redirect must land somewhere that exists, on the canonical host.
 *
 * `public/_redirects` sent `/demos` to `/portfolio` and `/demos/*` to
 * `/portfolio/:splat`. Neither target has a locale prefix, and the static
 * export only generates `/{locale}/...`, so both rules delivered visitors and
 * crawlers to the 404 page. Search Console recorded 13 pages with a redirect
 * and 8 not found on 2026-07-20.
 *
 * A redirect to a 404 is worse than no redirect: it looks handled.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_ROUTES } from '@/lib/routes';
import { BASE_URL, LOCALES } from '@/lib/site-config';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

interface Rule {
    from: string;
    to: string;
    status: string;
}

const RULES: Rule[] = read('public/_redirects')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
        const [from, to, status] = line.split(/\s+/);
        return { from, to, status };
    });

/** Strips the locale prefix and surrounding slashes, yielding a registry path. */
function toRegistryPath(target: string): string | null {
    const match = /^\/(\w{2})\/(.*)$/.exec(target);
    if (!match) return null;
    const [, locale, rest] = match;
    if (!(LOCALES as readonly string[]).includes(locale)) return null;
    return rest.replace(/\/$/, '');
}

describe('public/_redirects', () => {
    it('parses at least the rules we expect to exist', () => {
        // Guards the guard: a parse that silently yields nothing would make
        // every assertion below vacuous.
        expect(RULES.length).toBeGreaterThan(4);
    });

    it.each(RULES)('$from -> $to is a permanent redirect', (rule) => {
        expect(rule.status).toBe('301');
    });

    it.each(RULES)('$from -> $to targets a locale-prefixed path', (rule) => {
        // The whole bug: `/portfolio` has no locale, so it does not exist.
        expect(
            toRegistryPath(rule.to),
            `"${rule.to}" has no locale prefix, so the static export never generates it`
        ).not.toBeNull();
    });

    it.each(RULES)('$from -> $to ends in the canonical trailing slash', (rule) => {
        // astro.config.mjs sets trailingSlash: 'always'. A target without one costs a
        // second redirect hop, which Search Console counts separately.
        expect(rule.to.endsWith('/'), `"${rule.to}" is not the canonical form`).toBe(true);
    });

    it.each(RULES.filter((r) => !r.to.includes(':splat')))(
        '$from -> $to resolves to a registered route',
        (rule) => {
            const path = toRegistryPath(rule.to);
            const known = ALL_ROUTES.some((route) => route.path === path);
            expect(known, `"${rule.to}" is in no registry entry, so it 404s`).toBe(true);
        }
    );

    it.each(RULES.filter((r) => r.to.includes(':splat')))(
        '$from -> $to has a registered base for its splat',
        (rule) => {
            // The splat itself is dynamic, but the segment above it must exist.
            const base = toRegistryPath(rule.to)?.replace(/\/:splat.*$/, '');
            expect(ALL_ROUTES.some((route) => route.path === base),
                `"${rule.to}" hangs off "${base}", which is not registered`).toBe(true);
        }
    );

    it('never redirects a path to itself', () => {
        for (const rule of RULES) {
            expect(rule.from, 'a self-redirect is an infinite loop').not.toBe(rule.to);
        }
    });

    it('never chains: no target is itself the source of another rule', () => {
        const sources = new Set(RULES.map((r) => r.from));
        for (const rule of RULES) {
            expect(sources.has(rule.to), `"${rule.to}" redirects again, costing a second hop`)
                .toBe(false);
        }
    });

    /**
     * The card URL is the one thing here that cannot be fixed later: NFC tags
     * cannot be rewritten remotely and printed cards cannot be reissued. Both
     * spellings must resolve, forever.
     */
    it.each(['/card/hector', '/card/hector/'])('routes the printed card URL %s', (from) => {
        const rule = RULES.find((r) => r.from === from);
        expect(rule, `${from} has no rule, so tags carrying it reach the 404 page`).toBeDefined();
        expect(rule?.to).toBe('/en/card/hector/');
    });

    it('matches exactly what the card encodes into the QR and writes to NFC', () => {
        // Reads the value out of the component so the rule and the payload
        // cannot drift: changing one without the other silently breaks every
        // tag written from that moment on.
        const source = read('src/components/HectorCard.astro');
        const encoded = /const cardUrl = `\$\{BASE_URL\}([^`]*)`/.exec(source)?.[1];
        expect(encoded, 'cardUrl is no longer built from BASE_URL plus a literal path').toBeDefined();
        expect(RULES.some((r) => r.from === encoded),
            `the card encodes "${encoded}", which no redirect rule covers`).toBe(true);
    });
});

/**
 * The canonical host has no `www`. Five hardcoded `www.hlorenzoz.com` URLs
 * shipped, including the QR code and NFC payload on the digital business card,
 * which pointed at a host AND a path that did not resolve.
 *
 * `www.hlorenzoz.com` does 301 to the apex, so a stray link is not a dead end,
 * but it still costs a redirect hop on every visit and hands Search Console an
 * "Alternative page with proper canonical tag" row for a URL nobody meant to
 * publish.
 *
 * The list covers every file that can ship an absolute URL, not just the four
 * that carried the original bug: `messages/*.json` hold the footer and nav
 * hrefs, and `public/llms.txt` is a crawl-surface file that is nothing BUT
 * absolute URLs. Both were written after this guard and were sitting outside
 * it.
 */
describe('no source file hardcodes a non-canonical host', () => {
    const FILES = [
        'src/components/HectorCard.astro',
        'lib/portfolio-data.json',
        'lib/site-config.ts',
        'public/_redirects',
        'messages/en.json',
        'messages/es.json',
        'public/llms.txt',
    ];

    it.each(FILES)('%s links no www host in code', (file) => {
        // Comments may name the old value while explaining the fix.
        const code = read(file)
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*[*#].*$/gm, '');
        expect(code, `${file} still points at www.hlorenzoz.com`)
            .not.toMatch(/www\.hlorenzoz\.com/);
    });

    it('keeps the apex as the one canonical host', () => {
        expect(BASE_URL).toBe('https://hlorenzoz.com');
        expect(BASE_URL).not.toContain('www.');
    });
});
