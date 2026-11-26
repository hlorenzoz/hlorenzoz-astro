import { describe, it, expect } from 'vitest';
import { copyTokens, fillTokens, resolveFaq } from '@/lib/copy-tokens';

/**
 * FAQ answers and a few other lines state a term that lives in
 * `lib/pricing.ts`. The copy carries an `{upfront}` token instead of the
 * figure, resolved here.
 */
describe('fillTokens', () => {
    it('replaces every token it knows', () => {
        expect(fillTokens('{upfront}% up front, {when}', { upfront: 50, when: 'on signing' })).toBe('50% up front, on signing');
    });

    it('throws on a token it does not know', () => {
        // A silent blank in a sentence about terms is worse than a failed build.
        expect(() => fillTokens('{upfrnt}% up front', { upfront: 50 })).toThrow(/upfrnt/);
    });

    it('leaves text without tokens untouched', () => {
        expect(fillTokens('No tokens here.', {})).toBe('No tokens here.');
    });
});

describe('copyTokens', () => {
    it('carries the up front share and no price', () => {
        expect(copyTokens()).toEqual({ upfront: 50 });
    });
});

describe('resolveFaq', () => {
    const tokens = copyTokens();

    it('fills the tokens in both the question and the answer', () => {
        expect(
            resolveFaq([{ question: 'Is {upfront}% paid first?', answer: 'Yes, {upfront}% up front.' }], tokens)
        ).toEqual([{ question: 'Is 50% paid first?', answer: 'Yes, 50% up front.' }]);
    });

    it('drops anything that is not a question and answer pair', () => {
        // Message data is read with `t.raw`, which returns whatever the file
        // holds. A malformed entry must not reach the accordion or the JSON-LD.
        expect(resolveFaq(['just a string', null, { question: 'Only a question?' }], tokens)).toEqual([]);
    });
});
