import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Every string a visitor or a screen reader gets (alt, title, aria-label,
 * placeholder, figcaption/caption, OpenGraph image alt) comes from
 * `messages/<locale>.json`, so it is translated with the page and a missing
 * translation makes the page unpublishable in that locale (`pageLocales`).
 * A literal in a component ships English on every locale.
 *
 * Only brand names, which are not language, are allowed as literals.
 */
const ROOT = path.resolve(__dirname, '../..');
const BRANDS = new Set(['LinkedIn', 'GitHub', 'Upwork', 'WhatsApp']);

function files(dir: string, pattern: RegExp): string[] {
    return readdirSync(path.join(ROOT, dir), { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && pattern.test(entry.name))
        .map((entry) => path.relative(ROOT, path.join(entry.parentPath, entry.name)));
}

// A literal holds words when letters remain once `${...}` expressions are removed.
const hasWords = (literal: string) => /\p{L}{2,}/u.test(literal.replace(/\$\{[^}]*\}/g, ''));

const ATTR = '(?:alt|title|aria-label|placeholder)';
const PATTERNS: RegExp[] = [
    new RegExp(`\\b${ATTR}="([^"]*)"`, 'g'), // alt="Close"
    new RegExp(`\\b${ATTR}=\\{\`([^\`]*)\`\\}`, 'g'), // alt={`${x} Screenshot`}
    new RegExp(`\\b${ATTR}=\\{['"]([^'"]*)['"]\\}`, 'g'), // alt={'Close'}
    /\balt:\s*['"`]([^'"`]*)['"`]/g, // OpenGraph images: [{ alt: '...' }]
    /setAttribute\(\s*'aria-label',[^)]*?'([^']*)'/g, // script-set labels
    /<(?:fig)?caption\b[^>]*>([^<{]*)/g, // literal caption text
];

/** Every hardcoded label in one source file, as `file:line: literal`. */
export function hardcodedLabels(source: string, file = 'source'): string[] {
    const found: string[] = [];
    for (const pattern of PATTERNS) {
        for (const match of source.matchAll(pattern)) {
            const literal = match[1].trim();
            if (!hasWords(literal) || BRANDS.has(literal)) continue;
            const line = source.slice(0, match.index).split('\n').length;
            found.push(`${file}:${line}: ${literal}`);
        }
    }
    return found;
}

describe('hardcodedLabels', () => {
    it('flags literal alt, title, aria-label, placeholder, caption and OG alt text', () => {
        expect(hardcodedLabels('<img alt="Full Screen" />')).toEqual(['source:1: Full Screen']);
        expect(hardcodedLabels('<img alt={`${alt} - Slide ${i + 1}`} />')).toEqual(['source:1: ${alt} - Slide ${i + 1}']);
        expect(hardcodedLabels('<input placeholder="Or send a message" />')).toHaveLength(1);
        expect(hardcodedLabels("images: [{ url, alt: 'Lorenzoz Agency' }]")).toHaveLength(1);
        expect(hardcodedLabels("b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')")).toHaveLength(1);
        expect(hardcodedLabels('<figcaption class="x">Photo by Ana</figcaption>')).toHaveLength(1);
    });

    it('accepts translated expressions, empty alt and brand names', () => {
        expect(hardcodedLabels('<img alt={t("alt")} /><img alt="" />')).toEqual([]);
        expect(hardcodedLabels('<a aria-label={`${t("cta")} ${title}`}>')).toEqual([]);
        expect(hardcodedLabels('<a aria-label="LinkedIn"><img alt="Upwork" />')).toEqual([]);
        expect(hardcodedLabels("b.setAttribute('aria-label', open ? b.dataset.close! : b.dataset.open!)")).toEqual([]);
        expect(hardcodedLabels('<figcaption>{item.author}</figcaption>')).toEqual([]);
    });
});

describe('components hardcode no visible or accessible text', () => {
    const sources = [...files('src', /\.astro$/), ...files('src/islands', /\.tsx$/)];

    it('finds the sources', () => {
        expect(sources.length).toBeGreaterThan(20);
    });

    it('every alt, title, aria-label, placeholder and caption comes from messages', () => {
        const found = sources.flatMap((file) => hardcodedLabels(readFileSync(path.join(ROOT, file), 'utf-8'), file));
        expect(found).toEqual([]);
    });
});
