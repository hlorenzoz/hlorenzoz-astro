import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { ALL_ROUTES } from '@/lib/routes';
import { getPortfolioItems } from '@/lib/portfolio';
import { getNewsItems } from '@/lib/news';
import { SERVICE_KEYS, UPFRONT_SHARE, slugFromServiceKey, type ServiceKey } from '@/lib/pricing';
import { marketNames } from '@/lib/site-config';
import { LOCALES } from '@/lib/routing';

/**
 * `public/llms.txt` is written to be read by machines, so an error in it is
 * quoted back to a prospect as fact rather than merely looking wrong.
 *
 * It shipped two: it described a price CEILING as a floor, and it called the
 * hub a directory of "seven service offerings" when six existed and the
 * seventh entry was the hub itself. Both survived review because nothing tied
 * the file to the data it describes. These tests are that tie.
 */
const LLMS_TXT = readFileSync(path.resolve(__dirname, '../../public/llms.txt'), 'utf-8');

/** The `## Services` section only, so unrelated prose cannot satisfy a match. */
const SERVICES_SECTION = LLMS_TXT.split('## Services')[1]?.split('\n## ')[0] ?? '';

describe('llms.txt: service count', () => {
    it('claims exactly as many services as the route registry declares', () => {
        const registered = ALL_ROUTES.filter((route) => route.tier === 'service').length;
        expect(registered).toBe(4);

        // The hub is a directory OF the services, not one of them.
        expect(SERVICES_SECTION).not.toMatch(/seven service/i);
        expect(SERVICES_SECTION).toMatch(new RegExp(`${registered} service`, 'i'));
    });

    it('links every registered service page exactly once', () => {
        for (const route of ALL_ROUTES.filter((r) => r.tier === 'service')) {
            const url = `https://hlorenzoz.com/en/${route.path}/`;
            const occurrences = SERVICES_SECTION.split(url).length - 1;
            expect(occurrences, `${url} should appear once, found ${occurrences}`).toBe(1);
        }
    });
});

/**
 * The case-study list is hand-maintained, so it drifts the moment a project is
 * added and this file is not. Driving the assertion off `getPortfolioItems()`
 * rather than off literal URLs means a new entry is covered the day it lands,
 * and a deleted one fails loudly instead of leaving a dead link for crawlers.
 */
describe('llms.txt: portfolio case studies match the data source', () => {
    const CASE_STUDIES_SECTION =
        LLMS_TXT.split('## Portfolio Case Studies')[1]?.split('\n## ')[0] ?? '';

    it('has a non-empty case studies section', () => {
        expect(CASE_STUDIES_SECTION.trim().length).toBeGreaterThan(0);
    });

    it('links every portfolio project exactly once', () => {
        const items = getPortfolioItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            const url = `https://hlorenzoz.com/en/portfolio/${item.slug}/`;
            const occurrences = CASE_STUDIES_SECTION.split(url).length - 1;
            expect(occurrences, `${url} should appear once, found ${occurrences}`).toBe(1);
        }
    });

    it('links no portfolio URL that the data source does not define', () => {
        const known = new Set(getPortfolioItems().map((i) => i.slug));
        const linked = [...CASE_STUDIES_SECTION.matchAll(/portfolio\/([a-z0-9-]+)\//g)].map((m) => m[1]);
        expect(linked.length).toBe(known.size);
        for (const slug of linked) {
            expect(known.has(slug), `llms.txt links /portfolio/${slug}/ which no longer exists`).toBe(true);
        }
    });
});

describe('llms.txt: news posts match the data source', () => {
    const NEWS_SECTION = LLMS_TXT.split('## News')[1]?.split('\n## ')[0] ?? '';
    const DOCS_SECTION = LLMS_TXT.split('## Docs')[1]?.split('\n## ')[0] ?? '';

    it('links the news index exactly once from Docs, right after the Portfolio line', () => {
        const lines = DOCS_SECTION.split('\n').filter((l) => l.startsWith('- ['));
        const news = lines.findIndex((l) => l.includes('(https://hlorenzoz.com/en/news/)'));
        expect(lines.filter((l) => l.includes('(https://hlorenzoz.com/en/news/)'))).toHaveLength(1);
        expect(lines[news - 1]).toContain('(https://hlorenzoz.com/en/portfolio/)');
    });

    it('links every news post exactly once', () => {
        const items = getNewsItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            const url = `https://hlorenzoz.com/en/news/${item.slug}/`;
            const occurrences = NEWS_SECTION.split(url).length - 1;
            expect(occurrences, `${url} should appear once, found ${occurrences}`).toBe(1);
        }
    });

    it('links no news URL that the data source does not define', () => {
        const known = new Set(getNewsItems().map((i) => i.slug));
        const linked = [...NEWS_SECTION.matchAll(/news\/([a-z0-9-]+)\//g)].map((m) => m[1]);
        expect(linked.length).toBe(known.size);
        for (const slug of linked) expect(known.has(slug), `llms.txt links /news/${slug}/`).toBe(true);
    });

    it('places News after the case studies and before Contact', () => {
        const at = (h: string) => LLMS_TXT.indexOf(`\n${h}\n`);
        expect(at('## News')).toBeGreaterThan(at('## Portfolio Case Studies'));
        expect(at('## News')).toBeLessThan(at('## Contact'));
    });

    it('names every locale prefix and the same-path rule, which the registry makes true', () => {
        const languages = LLMS_TXT.match(/^- Languages: .*$/m)?.[0] ?? '';
        for (const locale of LOCALES) expect(languages).toContain(`/${locale}/`);
        // Shared slugs across locales: no route carries a locale-specific path.
        for (const route of ALL_ROUTES) {
            expect(route.path).not.toMatch(new RegExp(`^(${LOCALES.join('|')})(/|$)`));
        }
    });
});

describe('llms.txt: publishes no price', () => {
    /** The one line of the Services section that links a given service page. */
    const lineOf = (key: ServiceKey) =>
        SERVICES_SECTION.split('\n').find((line) => line.includes(`/services/${slugFromServiceKey(key)}/`)) ?? '';

    it('quotes no amount anywhere', () => {
        expect(LLMS_TXT).not.toMatch(/€|\bEUR\b|price range|list price/i);
    });

    it('says every service is quoted after a free first call', () => {
        for (const key of SERVICE_KEYS) {
            expect(lineOf(key), `"${key}" must say how it is quoted`).toMatch(/quoted after a free first call/i);
        }
    });

    it('states the terms with the figure the code uses', () => {
        expect(LLMS_TXT).toContain(`${Math.round(UPFRONT_SHARE * 100)}% of the agreed quote is paid up front`);
        expect(LLMS_TXT).toMatch(/no quote includes VAT/i);
        expect(LLMS_TXT).not.toMatch(/% off/i);
    });

    it('claims no free trial', () => {
        expect(LLMS_TXT).toMatch(/there is no free trial/i);
        expect(SERVICES_SECTION).not.toMatch(/free trial/i);
    });

    it('does not promise a ranking', () => {
        expect(lineOf('localSeo')).toMatch(/no ranking is guaranteed/i);
    });

    it('presents the services as building blocks, never a core offer plus options', () => {
        expect(LLMS_TXT).not.toMatch(/core offer:|the core offer\.|optional services:/i);
        expect(LLMS_TXT).toMatch(/free first call analyzes what the business needs/i);
    });

    it('lists neither the absorbed nor the paused service', () => {
        expect(SERVICES_SECTION).not.toMatch(/reputation-review-management|services\/digital-business-card/);
        expect(LLMS_TXT).not.toMatch(/Review Management \(/);
    });
});

/**
 * llms.txt hand-writes its served-markets line, so unlike the schema `areaServed`
 * and the homepage band, it does NOT derive from `SERVED_MARKETS`. This test is
 * the only thing keeping it in step: add or drop a market in `lib/site-config.ts`
 * and the file must be edited too, or a machine reader quotes a country the site
 * no longer serves (or misses one it does).
 */
describe('llms.txt: served markets match site-config', () => {
    it('names every served market', () => {
        for (const country of marketNames('en')) {
            expect(LLMS_TXT, `llms.txt must name "${country}" among the served markets`).toContain(
                country
            );
        }
    });
});
