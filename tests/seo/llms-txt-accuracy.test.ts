import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { ALL_ROUTES } from '@/lib/routes';
import { getPortfolioItems } from '@/lib/portfolio';
import { getNewsItems } from '@/lib/news';
import {
    BUNDLE_DISCOUNT,
    PRICING,
    UPFRONT_SHARE,
    bundledAmount,
    formatAmount,
    monthlyAddOn,
    publishedPriceRange,
    slugFromServiceKey,
    type ServiceKey,
} from '@/lib/pricing';
import { marketNames } from '@/lib/site-config';

/**
 * `public/llms.txt` is written to be read by machines, so an error in it is
 * quoted back to a prospect as fact rather than merely looking wrong.
 *
 * It shipped two: it described a price CEILING ("Up To €150") as a floor
 * ("From €150"), and it called the hub a directory of "seven service
 * offerings" when six existed and the seventh entry was the hub itself. Both
 * survived review because nothing tied the file to the data it describes.
 * These tests are that tie.
 *
 * They now read `lib/pricing.ts` rather than the message catalogue. The prices
 * moved out of the copy so that the visible page, the JSON-LD and this file
 * could stop drifting apart, and a test that still asserted against the copy
 * would only prove the copy agrees with itself.
 */
const LLMS_TXT = readFileSync(path.resolve(__dirname, '../../public/llms.txt'), 'utf-8');

/** The `## Services` section only, so unrelated prose cannot satisfy a match. */
const SERVICES_SECTION = LLMS_TXT.split('## Services')[1]?.split('\n## ')[0] ?? '';

/** llms.txt is written in English, so figures render in the English locale. */
const money = (amount: number) => formatAmount(amount, 'en');

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

    it('states that every page has a same-path Spanish twin, which the registry makes true', () => {
        expect(LLMS_TXT).toMatch(/^- Languages: .*\/es\/.*$/m);
        // Shared slugs across locales: no route carries a locale-specific path.
        for (const route of ALL_ROUTES) {
            expect(route.path).not.toMatch(/^(en|es)(\/|$)/);
        }
    });
});

describe('llms.txt: pricing claims match lib/pricing.ts', () => {
    const escape = (text: string) => text.replace(/[€,.+]/g, '\\$&');
    /** The one line of the Services section that links a given service page. */
    const lineOf = (key: ServiceKey) =>
        SERVICES_SECTION.split('\n').find((line) => line.includes(`/services/${slugFromServiceKey(key)}/`)) ?? '';
    const KEYS = Object.keys(PRICING) as ServiceKey[];

    it('quotes every list price, on the line of the service it belongs to', () => {
        for (const key of KEYS) {
            expect(
                lineOf(key),
                `"${key}" costs ${money(PRICING[key].base.amount)}; that figure should be on its line`
            ).toContain(money(PRICING[key].base.amount));
        }
    });

    it('quotes the price alongside Local SEO for every optional service', () => {
        for (const key of KEYS) {
            if (PRICING[key].role !== 'addOn') continue;
            const bundled = money(bundledAmount(PRICING[key].base.amount));
            expect(lineOf(key), `"${key}" is ${bundled} alongside Local SEO; llms.txt must say so`).toContain(bundled);
            expect(lineOf(key)).toMatch(/alongside Local SEO/);
        }
    });

    /**
     * A floor published as an exact price states that every project costs the
     * starting figure. An exact price published as a floor does the opposite.
     * Both are the same misquote, so both directions are checked.
     */
    it('says "from" for a floor, and never for an exact price', () => {
        for (const key of KEYS) {
            const { amount, from } = PRICING[key].base;
            const asFloor = new RegExp(`from\\s*${escape(money(amount))}`, 'i');
            if (from) {
                expect(lineOf(key), `"${key}" starts at ${money(amount)}; llms.txt must say "from"`).toMatch(asFloor);
            } else {
                expect(lineOf(key), `"${key}" costs exactly ${money(amount)}; llms.txt must not say "from"`).not.toMatch(asFloor);
            }
        }
    });

    it('never describes a price as a ceiling', () => {
        expect(SERVICES_SECTION).not.toMatch(/up to\s*€/i);
    });

    it('states the recurring add-on wherever a service has one', () => {
        // Quoting only the entry price for a service with a monthly charge
        // understates the real cost by an amount that repeats every month.
        for (const key of KEYS) {
            const monthly = monthlyAddOn(PRICING[key]);
            if (!monthly) continue;
            expect(
                lineOf(key),
                `"${key}" carries a ${money(monthly.amount)}/mo add-on; llms.txt must say so`
            ).toMatch(new RegExp(`${escape(money(monthly.amount))}\\s*/\\s*mo`, 'i'));
        }
    });

    it('marks every quoted price as before tax', () => {
        // A machine reader repeats the figure as what the client pays unless the
        // line itself says otherwise.
        for (const key of KEYS) {
            expect(lineOf(key), `"${key}" is priced without saying it excludes VAT`).toMatch(/plus VAT/);
        }
    });

    it('states the terms with the figures the code uses', () => {
        expect(LLMS_TXT).toContain(`${Math.round(UPFRONT_SHARE * 100)}% is paid up front`);
        expect(LLMS_TXT).toContain(`${Math.round(BUNDLE_DISCOUNT * 100)}% off their list price alongside Local SEO`);
        expect(LLMS_TXT).toMatch(/no price includes VAT/i);
    });

    it('claims no free trial and no custom-quote service', () => {
        // Both are gone: the trial was replaced by the up-front payment, and
        // software now has a published starting price.
        expect(LLMS_TXT).toMatch(/there is no free trial/i);
        expect(SERVICES_SECTION).not.toMatch(/free trial|custom quote/i);
    });

    it('does not promise a ranking', () => {
        expect(lineOf('localSeo')).toMatch(/no ranking is guaranteed/i);
    });

    it('lists neither the absorbed nor the paused service', () => {
        expect(SERVICES_SECTION).not.toMatch(/reputation-review-management|services\/digital-business-card/);
        expect(LLMS_TXT).not.toMatch(/Review Management \(|€297|€897|€150/);
    });

    it('publishes the same price range the organization schema declares', () => {
        expect(LLMS_TXT).toContain(`Price range: ${publishedPriceRange('en')}`);
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
