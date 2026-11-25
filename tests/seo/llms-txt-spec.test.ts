import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { ALL_ROUTES } from '@/lib/routes';

/**
 * Structural conformance to the llms.txt standard at https://llmstxt.org/.
 *
 * This is deliberately separate from `llms-txt-accuracy.test.ts`: that file
 * asks whether the CLAIMS are true, this one asks whether the SHAPE is legal.
 * A file can be perfectly accurate and still unparseable by a consumer that
 * follows the spec.
 *
 * The spec's structure, in order:
 *   1. an H1 with the site name  (the ONLY required section)
 *   2. a blockquote `>` short summary
 *   3. zero or more prose sections containing NO headings
 *   4. zero or more `##` sections whose list items are markdown links,
 *      in the form `- [name](url): optional notes`
 *
 * Note this is stricter than Google's Lighthouse "Agentic Browsing" audit,
 * which only checks that a Markdown file with at least one H1 exists at the
 * domain root. Passing Lighthouse does not imply passing the spec, which is
 * exactly why these assertions exist.
 */
const LLMS_TXT = readFileSync(path.resolve(__dirname, '../../public/llms.txt'), 'utf-8');
const LINES = LLMS_TXT.split('\n');

/**
 * A markdown URL, tolerating one level of nested parentheses so a legal link
 * such as `.../NFC_(disambiguation)` is not mis-parsed into a truncated URL
 * and then reported as a plain bullet.
 */
const URL_PART = String.raw`(?:[^()]|\([^()]*\))+`;

/** A spec-legal list item: a markdown link, optionally followed by `: notes`. */
const LINK_ITEM = new RegExp(String.raw`^- \[[^\]]+\]\(${URL_PART}\)(: .*)?$`);

/** Every markdown link URL on a line, not just the first. */
const urlsIn = (item: string): string[] =>
    [...item.matchAll(new RegExp(String.raw`\]\((${URL_PART})\)`, 'g'))].map((m) => m[1]);

/**
 * Sections this site commits to exposing, in this relative order.
 *
 * This is a PROJECT contract, not a spec rule: llmstxt.org allows zero
 * sections. It is asserted as a subset rather than an exact match so that a
 * spec-legal extra section (notably the reserved `## Optional`) can be added
 * without a failure, which is what keeps the Optional guard below reachable.
 */
const REQUIRED_SECTIONS = ['Docs', 'Services', 'Portfolio Case Studies', 'Contact'];

interface Section {
    heading: string;
    items: string[];
}

/**
 * Every `##` section with its list items, in document order.
 *
 * Indented bullets are collected too, and matched in their trimmed form. An
 * earlier version keyed on `startsWith('- ')`, so a nested plain bullet slipped
 * past the link rule entirely, which is the very defect these tests exist for.
 */
const sections: Section[] = LINES.reduce<Section[]>((acc, line) => {
    if (line.startsWith('## ')) {
        acc.push({ heading: line.slice(3).trim(), items: [] });
    } else if (/^\s*- /.test(line) && acc.length > 0) {
        acc[acc.length - 1].items.push(line.trim());
    }
    return acc;
}, []);

const summaryIndex = LINES.findIndex((line) => line.startsWith('> '));
const firstSectionIndex = LINES.findIndex((line) => line.startsWith('## '));
const optionalSection = sections.find((s) => s.heading.toLowerCase() === 'optional');

/**
 * Everything between the blockquote and the first `##` heading.
 *
 * When the summary is missing, `findIndex` returns -1. Starting at 0 would
 * pull the H1 into the prose area and make this report the one element the
 * spec actually requires as an illegal heading, so the scan starts after the
 * H1 instead. The missing summary is a separate assertion's job.
 */
const proseArea = (): string[] => {
    const start = summaryIndex === -1 ? 1 : summaryIndex + 1;
    const end = firstSectionIndex === -1 ? LINES.length : firstSectionIndex;
    return start >= end ? [] : LINES.slice(start, end);
};

describe('llms.txt: required header (llmstxt.org)', () => {
    it('opens with exactly one H1, the only section the spec requires', () => {
        const h1s = LINES.filter((line) => /^# /.test(line));
        expect(h1s, 'the spec requires an H1 with the site name').toHaveLength(1);
        expect(LINES[0], 'the H1 must be the first line').toMatch(/^# \S/);
    });

    it('follows the H1 with a blockquote summary before any other content', () => {
        const firstContent = LINES.slice(1).find((line) => line.trim() !== '');
        expect(firstContent, 'the file has no content after the H1').toBeDefined();
        expect(
            firstContent,
            'the spec puts a blockquote summary directly after the H1'
        ).toMatch(/^> \S/);
    });
});

describe('llms.txt: prose area (llmstxt.org)', () => {
    /**
     * Ordering is asserted separately because `proseArea()` collapses to an
     * empty slice when the summary sits after the first section, which would
     * otherwise let the no-headings check below pass having examined nothing.
     */
    it('places the summary before the first section', () => {
        expect(summaryIndex, 'no blockquote summary found').toBeGreaterThan(-1);
        if (firstSectionIndex === -1) return;
        expect(
            summaryIndex,
            'the summary must precede the first ## section, otherwise there is no prose area to validate'
        ).toBeLessThan(firstSectionIndex);
    });

    it('contains no headings between the summary and the first section', () => {
        const offenders = proseArea().filter((line) => /^#{1,6} /.test(line));
        expect(
            offenders,
            `the spec allows no headings in the prose area, found: ${offenders.join(' | ')}`
        ).toEqual([]);
    });
});

describe('llms.txt: sections (llmstxt.org)', () => {
    it('uses only H2 for section headings', () => {
        const deeper = LINES.filter((line) => /^#{3,6} /.test(line));
        expect(deeper, 'the spec delimits sections with H2 only').toEqual([]);
    });

    /**
     * Duplicate headings are not merely untidy: `llms-txt-accuracy.test.ts`
     * slices the services block with `split('## Services')[1]`, so a second
     * block of the same name would have every link and price inside it skipped
     * by that suite while still looking valid here.
     */
    it('gives every section a unique heading', () => {
        const headings = sections.map((s) => s.heading);
        const duplicated = headings.filter((h, i) => headings.indexOf(h) !== i);
        expect(
            [...new Set(duplicated)],
            'a repeated heading hides its second block from the accuracy suite'
        ).toEqual([]);
    });

    it('exposes the sections this site commits to, in order', () => {
        const headings = sections.map((s) => s.heading);
        const missing = REQUIRED_SECTIONS.filter((req) => !headings.includes(req));
        expect(missing, `missing sections: ${missing.join(', ')}`).toEqual([]);

        const positions = REQUIRED_SECTIONS.map((req) => headings.indexOf(req));
        expect(
            positions,
            `required sections are out of order: ${headings.join(' > ')}`
        ).toEqual([...positions].sort((a, b) => a - b));
    });

    /**
     * Asserted over EVERY discovered section in ONE test rather than via
     * `it.each`. An earlier version named the sections and silently missed a
     * non-conforming one; a later version used `it.each(sections)`, which
     * throws at collection time when the array is empty and would take the
     * whole file's results down with it.
     */
    it('contains only markdown-link list items in every section', () => {
        const offenders = sections.flatMap((section) =>
            section.items
                .filter((item) => !LINK_ITEM.test(item))
                .map((item) => `## ${section.heading}: ${item}`)
        );

        expect(
            offenders,
            `every list item in an H2 section must be a markdown link, found plain bullets:\n${offenders.join('\n')}`
        ).toEqual([]);
    });

    it('links are absolute, never relative', () => {
        const urls = sections.flatMap((s) => s.items).flatMap(urlsIn);

        expect(urls.length, 'no links found to validate').toBeGreaterThan(0);
        const relative = urls.filter((url) => !/^(https?|mailto|tel):/.test(url));
        expect(
            relative,
            `relative URLs are not resolvable by a consumer: ${relative.join(', ')}`
        ).toEqual([]);
    });

    /**
     * The spec gives `## Optional` a reserved meaning: "the URLs provided there
     * can be skipped if a shorter context is needed". Putting the service pages
     * there would invite consumers to drop the commercial core of the file.
     *
     * Skipped, not vacuously passed, when the file has no Optional section: an
     * earlier version "asserted" a condition that could never fail, which
     * reported coverage this repo does not actually have. Service URLs come
     * from the route registry rather than a hardcoded `/services/` substring,
     * so renaming that segment cannot make the guard match nothing and pass.
     */
    it.skipIf(!optionalSection)( // guardrail: allow-skip nothing to check without an Optional section
        'never hides service pages under the reserved "Optional" heading',
        () => {
            const servicePaths = ALL_ROUTES.filter((route) => route.tier === 'service').map(
                (route) => `/${route.path}/`
            );
            expect(servicePaths.length, 'no service routes registered').toBeGreaterThan(0);

            const hidden = (optionalSection?.items ?? []).filter((item) =>
                servicePaths.some((servicePath) => item.includes(servicePath))
            );
            expect(
                hidden,
                '"## Optional" URLs may be skipped by consumers; service pages must not live there'
            ).toEqual([]);
        }
    );
});
