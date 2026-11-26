import { describe, it, expect } from 'vitest';
import { copyTokens, fillTokens, resolveFaq } from '@/lib/copy-tokens';

/**
 * FAQ answers are read with `t.raw`, so any `{token}` in them is resolved here
 * rather than by the translator.
 */
describe('fillTokens', () => {
    it('replaces every token it knows', () => {
        expect(fillTokens('{count} visits, {when}', { count: 3, when: 'on signing' })).toBe('3 visits, on signing');
    });

    it('throws on a token it does not know', () => {
        // A silent blank in a sentence about terms is worse than a failed build.
        expect(() => fillTokens('{cuont} visits', { count: 3 })).toThrow(/cuont/);
    });

    it('leaves text without tokens untouched', () => {
        expect(fillTokens('No tokens here.', {})).toBe('No tokens here.');
    });
});

describe('copyTokens', () => {
    it('carries the entry price only, formatted for the reader', () => {
        expect(copyTokens('en-IE')).toEqual({ entryPrice: '€500' });
        expect(String(copyTokens('es-ES').entryPrice).replace(/\s/g, ' ')).toBe('500 €');
    });

    it('makes a leftover {upfront} token fail instead of publishing a stale share', () => {
        expect(() => fillTokens('{upfront}% up front', copyTokens('en-IE'))).toThrow(/upfront/);
    });
});

describe('resolveFaq', () => {
    const tokens = { when: 'when the services start' };

    it('fills the tokens in both the question and the answer', () => {
        expect(
            resolveFaq([{ question: 'Paid {when}?', answer: 'Yes, {when}.' }], tokens)
        ).toEqual([{ question: 'Paid when the services start?', answer: 'Yes, when the services start.' }]);
    });

    it('passes copy without tokens through with the real token set', () => {
        const item = { question: 'How do I pay?', answer: 'A low initial payment, then a monthly fee.' };
        expect(resolveFaq([item], copyTokens('en-IE'))).toEqual([item]);
    });

    it('drops anything that is not a question and answer pair', () => {
        // Message data is read with `t.raw`, which returns whatever the file
        // holds. A malformed entry must not reach the accordion or the JSON-LD.
        expect(resolveFaq(['just a string', null, { question: 'Only a question?' }], tokens)).toEqual([]);
    });
});
