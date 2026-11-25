import { describe, it, expect } from 'vitest';
import { copyTokens, fillTokens, resolveFaq } from '@/lib/copy-tokens';

/**
 * FAQ answers and a few other lines have to state a price or a term, and those
 * live in `lib/pricing.ts`. The copy carries `{price}` / `{discount}` /
 * `{upfront}` / `{tax}` tokens instead of the figures, resolved here.
 */
describe('fillTokens', () => {
    it('replaces every token it knows', () => {
        expect(fillTokens('{price} a month {tax}', { price: '€750', tax: '+ VAT' })).toBe('€750 a month + VAT');
    });

    it('throws on a token it does not know', () => {
        // A silent blank in a sentence about money is worse than a failed build.
        expect(() => fillTokens('costs {prise}', { price: '€750' })).toThrow(/prise/);
    });

    it('leaves text without tokens untouched', () => {
        expect(fillTokens('No tokens here.', {})).toBe('No tokens here.');
    });
});

describe('copyTokens', () => {
    it('derives every value from the pricing source', () => {
        expect(copyTokens('en', '+ VAT')).toEqual({
            price: '€750',
            annual: '€9,000',
            discount: 30,
            upfront: 50,
            tax: '+ VAT',
        });
    });

    it('formats amounts for the locale', () => {
        expect(copyTokens('es', '+ IVA')).toMatchObject({ price: '750 €', annual: '9.000 €', tax: '+ IVA' });
    });
});

describe('resolveFaq', () => {
    const tokens = copyTokens('en', '+ VAT');

    it('fills the tokens in both the question and the answer', () => {
        expect(
            resolveFaq([{ question: 'What does {price} buy?', answer: '{discount}% off, {upfront}% up front.' }], tokens)
        ).toEqual([{ question: 'What does €750 buy?', answer: '30% off, 50% up front.' }]);
    });

    it('drops anything that is not a question and answer pair', () => {
        // Message data is read with `t.raw`, which returns whatever the file
        // holds. A malformed entry must not reach the accordion or the JSON-LD.
        expect(resolveFaq(['just a string', null, { question: 'Only a question?' }], tokens)).toEqual([]);
    });
});
