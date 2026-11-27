/**
 * The assistant quotes these figures to visitors as market averages, so each one must be
 * traceable: a positive amount in the market's currency, a unit, a source URL and a date.
 * A row without a reliable source is kept as `missing` instead of being estimated.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { DENTAL_MEDIANS, OCU_SOURCE } from '@/lib/cost-example';
import { renderReferencePrices } from '@/scripts/reference-prices-kb.mjs';

interface Row {
    key: string;
    missing?: boolean;
    typical?: number;
    low?: number | null;
    high?: number | null;
    unit?: string;
    currency?: string;
    source_title?: string;
    source_url?: string;
    source_date?: string | null;
    notes?: string;
}
interface Country { country: string; country_name: string; currency: string; rows: Row[] }
const data = JSON.parse(readFileSync('docs/assistant-kb/reference-prices.json', 'utf8')) as {
    collected: string;
    businesses: Record<string, string>;
    countries: Country[];
};

const MARKETS: Record<string, string> = { ES: 'EUR', PT: 'EUR', FR: 'EUR', IT: 'EUR', DE: 'EUR', NL: 'EUR', GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', CR: 'CRC' };
const UNITS = ['per visit', 'per implant', 'per session', 'per hour', 'per month', 'per event', 'per lesson', 'per person'];
const found = data.countries.flatMap((c) => c.rows.filter((r) => !r.missing).map((r) => [c.country, r] as const));

describe('reference prices for the assistant', () => {
    it('covers every market the agency serves, each with every business key', () => {
        expect(Object.fromEntries(data.countries.map((c) => [c.country, c.currency]))).toEqual(MARKETS);
        for (const country of data.countries) {
            expect(country.rows.map((r) => r.key), country.country).toEqual(Object.keys(data.businesses));
        }
    });

    it.each(found)('%s %o is a sourced, positive figure in the market currency', (country, row) => {
        expect(row.typical).toBeGreaterThan(0);
        // Costa Rican sources sometimes price in US dollars; every other market uses its own currency.
        expect(country === 'CR' ? ['CRC', 'USD'] : [MARKETS[country]]).toContain(row.currency);
        expect(UNITS).toContain(row.unit);
        expect(row.source_url).toMatch(/^https:\/\//);
        expect(row.source_title?.length).toBeGreaterThan(0);
        if (row.low != null && row.high != null) {
            expect(row.low).toBeLessThanOrEqual(row.typical!);
            expect(row.typical!).toBeLessThanOrEqual(row.high);
        }
        expect(`${row.source_title} ${row.notes ?? ''}`).not.toMatch(/[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u00A0]/);
    });

    it('agrees with the dental example the website shows for Spain', () => {
        const spain = data.countries.find((c) => c.country === 'ES')!.rows;
        const median = (key: string) => DENTAL_MEDIANS.find((d) => d.key === key)!.amount;
        expect(spain.find((r) => r.key === 'dental_checkup_cleaning')?.typical).toBe(median('cleaning'));
        expect(spain.find((r) => r.key === 'dental_implant')?.typical).toBe(median('implant'));
        expect(spain.find((r) => r.key === 'dental_implant')?.source_url).toBe(OCU_SOURCE.url);
    });

    it('renders one table per country and lists what has no reference', () => {
        const doc: string = renderReferencePrices(data);
        expect(doc.startsWith('# Reference prices by business and country')).toBe(true);
        for (const country of data.countries) expect(doc).toContain(`## ${country.country_name} (${country.country}), prices in ${country.currency}`);
        expect(doc.match(/^\| (?!Business|:)/gm)?.length).toBe(found.length);
        expect(doc).toContain('calculate_cost_of_waiting');
    });
});
