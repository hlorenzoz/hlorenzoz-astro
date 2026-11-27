import { describe, it, expect } from 'vitest';
import { costOfWaitingContext } from '@/src/islands/cost-of-waiting-context';
import { DEFAULTS } from '@/lib/cost-example';

describe('costOfWaitingContext', () => {
    it('says "not used" when there is no calculator on the page', () => {
        expect(costOfWaitingContext(null)).toBe('not used');
    });

    it('says "not used" while the calculator still shows its defaults', () => {
        expect(costOfWaitingContext({ ...DEFAULTS })).toBe('not used');
    });

    it('says "not used" when an input is empty or zero', () => {
        expect(costOfWaitingContext({ missed: Number.NaN, value: 200 })).toBe('not used');
        expect(costOfWaitingContext({ missed: 3, value: 0 })).toBe('not used');
    });

    it('states the visitor figures per day, week, month and year in plain numbers', () => {
        expect(costOfWaitingContext({ missed: 3, value: 200 })).toBe(
            'The visitor entered 3 customers lost per working day worth 200 EUR each: 600 EUR a day, 3000 EUR a week, 13000 EUR a month, 156000 EUR a year.'
        );
    });

    it('rounds the totals to whole euros and keeps one customer singular', () => {
        expect(costOfWaitingContext({ missed: 1, value: 100 })).toBe(
            'The visitor entered 1 customer lost per working day worth 100 EUR each: 100 EUR a day, 500 EUR a week, 2167 EUR a month, 26000 EUR a year.'
        );
    });
});
