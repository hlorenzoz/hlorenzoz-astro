import { describe, it, expect } from 'vitest';
import { costComparison, missedCustomerTable } from '@/lib/numbers';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

const translator = (locale: 'en' | 'es') => {
    const messages = (locale === 'en' ? en : es) as unknown as Record<string, unknown>;
    return (key: string, values?: Record<string, string | number>): string => {
        const raw = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
        return String(raw ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`));
    };
};

/**
 * The two "numbers" blocks appear on the home page and on the Local SEO page,
 * and in the dossier. They are built here, from `lib/pricing.ts`, so the three
 * cannot show different figures.
 */
describe('costComparison', () => {
    const props = costComparison('en', translator('en'), '+ VAT');

    it('prices only the two pillars that had a list price', () => {
        expect(props.rows.map((row) => row.value)).toEqual(['€897', '€297', undefined, undefined]);
        expect(props.rows).toHaveLength(4);
    });

    it('adds them up and sets the plan against the total', () => {
        expect(props.total).toBe('€1,194');
        expect(props.planPrice).toBe('€750');
        // (1194 - 750) / 1194 = 37.2%
        expect(props.saving).toContain('37%');
    });

    it('leaves no placeholder unresolved, in either language', () => {
        for (const locale of ['en', 'es'] as const) {
            const all = JSON.stringify(costComparison(locale, translator(locale), 'x'));
            expect(all).not.toMatch(/\{\w+\}/);
        }
    });

    it('formats for Spanish', () => {
        expect(costComparison('es', translator('es'), '+ IVA').total).toBe('1.194 €');
    });
});

describe('missedCustomerTable', () => {
    const props = missedCustomerTable('en', translator('en'), '+ VAT');

    it('builds one row per example customer value', () => {
        expect(props.rows).toEqual([
            { value: '€250', cover: '3 customers a month', missed: '€3,000' },
            { value: '€750', cover: '1 customer a month', missed: '€9,000' },
            { value: '€2,500', cover: '1 customer every 3 months', missed: '€30,000' },
        ]);
    });

    it('states the yearly cost of the plan, before tax', () => {
        expect(props.description).toContain('€9,000 + VAT');
    });

    it('carries the note that the values are an example', () => {
        expect(props.footnote).toMatch(/illustrative/i);
        expect(missedCustomerTable('es', translator('es'), '+ IVA').footnote).toMatch(/ilustrativo/i);
    });

    it('leaves no placeholder unresolved, in either language', () => {
        for (const locale of ['en', 'es'] as const) {
            expect(JSON.stringify(missedCustomerTable(locale, translator(locale), 'x'))).not.toMatch(/\{\w+\}/);
        }
    });
});
