import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { LOCALES } from '@/lib/routing';

/**
 * AGENTS.md "No hyphens in site copy either": visible text never joins words
 * with "-" and never uses a spaced " - " as a dash. Hyphens that belong to a
 * name or to syntax (URLs, slugs, ids, ISO dates) are not copy and are skipped.
 */
const repoPath = (relative: string) => path.resolve(__dirname, '../..', relative);
const readJson = (relative: string) => JSON.parse(readFileSync(repoPath(relative), 'utf-8'));

// Proper and technical names whose hyphen is part of the name. Never add a compound here.
const ALLOWED = new Set([
    'json-ld', 'wi-fi',
    // Country names that are hyphenated in their own language.
    'nouvelle-zélande', 'royaume-uni', 'états-unis', 'nieuw-zeeland',
]);

// Keys whose values are identifiers, paths or dates, not prose.
const NON_COPY_KEYS = new Set([
    'id', 'slug', 'href', 'url', 'link', 'image', 'map', 'fullScreenshot', 'bookingUrl',
    'lastModified', 'datePublished', 'type', 'portfolioId', 'ogImage',
]);

const WORD = '[\\p{L}\\p{N}]';
const HYPHENATED = new RegExp(`${WORD}+(?:-${WORD}+)+`, 'gu');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const URLISH = /(?:https?:\/\/|mailto:|tel:|www\.)\S+|(?:^|\s)\/[\w\-/.#]*|\([^)\s]*\)/g;

/** Every offending fragment in one string of copy. */
export function hyphenViolations(text: string): string[] {
    const prose = text.replace(URLISH, ' ');
    const words = (prose.match(HYPHENATED) ?? []).filter(
        (w) => !ALLOWED.has(w.toLowerCase()) && !ISO_DATE.test(w)
    );
    return /\S - \S/.test(prose) ? [...words, '" - "'] : words;
}

function copyStrings(node: unknown, at: string, out: [string, string][]) {
    if (typeof node === 'string') out.push([at, node]);
    else if (Array.isArray(node)) node.forEach((v, i) => copyStrings(v, `${at}[${i}]`, out));
    else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
            if (!NON_COPY_KEYS.has(k)) copyStrings(v, at ? `${at}.${k}` : k, out);
        }
    }
    return out;
}

function report(entries: [string, string][]) {
    return entries.flatMap(([at, text]) => hyphenViolations(text).map((w) => `${at}: ${w}`));
}

describe('hyphenViolations', () => {
    it('flags compounds, prefixes, ranges and spaced dashes', () => {
        expect(hyphenViolations('high-performance, conversion-optimized sites')).toEqual([
            'high-performance',
            'conversion-optimized',
        ]);
        expect(hyphenViolations('sitio multi-dispositivo')).toEqual(['multi-dispositivo']);
        expect(hyphenViolations('ready in 7-14 days')).toEqual(['7-14']);
        expect(hyphenViolations('fast - and cheap')).toEqual(['" - "']);
    });

    it('skips names, URLs, paths and ISO dates', () => {
        expect(hyphenViolations('JSON-LD and Wi-Fi')).toEqual([]);
        expect(hyphenViolations('see https://dental-clinic-1.hlorenzoz.com/en and /portfolio/real-estate/')).toEqual([]);
        expect(hyphenViolations('[Demo](https://hlorenzoz.com/en/portfolio/demo-massages/)')).toEqual([]);
        expect(hyphenViolations('updated 2026-11-24')).toEqual([]);
        expect(hyphenViolations('high performance websites')).toEqual([]);
    });
});

describe('site copy has no hyphens', () => {
    it.each(LOCALES.map((l) => `messages/${l}.json`))('%s', (file) => {
        expect(report(copyStrings(readJson(file), '', []))).toEqual([]);
    });

    it('lib/portfolio-data.json text fields', () => {
        expect(report(copyStrings(readJson('lib/portfolio-data.json'), '', []))).toEqual([]);
    });

    it('public/llms.txt', () => {
        const lines = readFileSync(repoPath('public/llms.txt'), 'utf-8').split('\n');
        const entries = lines.map((line, i): [string, string] => [`line ${i + 1}`, line.replace(/^- /, '')]);
        expect(report(entries)).toEqual([]);
    });
});
