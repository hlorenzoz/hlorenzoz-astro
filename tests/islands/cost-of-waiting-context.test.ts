import { describe, it, expect } from 'vitest';
import { costEstimate, costOfWaitingContext } from '@/src/islands/cost-of-waiting-context';
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

describe('costEstimate (the assistant calculate_cost_of_waiting tool)', () => {
    it('gives the same figures as the calculator, rounded to whole euros', () => {
        expect(costEstimate(1, 140)).toBe(
            '1 customer lost per working day worth 140 EUR each: 140 EUR a day, 700 EUR a week, 3033 EUR a month, 36400 EUR a year (5 working days a week, 52 weeks a year, first visits only).'
        );
    });

    it.each([
        [60, '300 EUR a week, 1300 EUR a month, 15600 EUR a year'],
        [80, '400 EUR a week, 1733 EUR a month, 20800 EUR a year'],
        [250, '1250 EUR a week, 5417 EUR a month, 65000 EUR a year'],
        [1850, '9250 EUR a week, 40083 EUR a month, 481000 EUR a year'],
        [2000, '10000 EUR a week, 43333 EUR a month, 520000 EUR a year'],
    ])('matches the dental example row for a %s EUR treatment', (value, figures) => {
        expect(costEstimate(1, value)).toContain(figures);
    });

    it('accepts numbers sent as text and decimals', () => {
        expect(costEstimate('2', '45.5')).toContain('2 customers lost per working day worth 45.5 EUR each: 91 EUR a day, 455 EUR a week');
    });

    it('calculates in the currency of the market the figure comes from', () => {
        expect(costEstimate(1, 50, 'GBP')).toBe(
            '1 customer lost per working day worth 50 GBP each: 50 GBP a day, 250 GBP a week, 1083 GBP a month, 13000 GBP a year (5 working days a week, 52 weeks a year, first visits only).'
        );
        expect(costEstimate(2, 30000, 'crc')).toContain('60000 CRC a day, 300000 CRC a week');
    });

    it('refuses a currency outside the markets the agency serves', () => {
        expect(costEstimate(1, 50, 'BTC')).toMatch(/^Cannot calculate: currency/);
    });

    it.each([[0, 100], [-1, 100], [1, 0], ['abc', 100], [1, undefined]])('rejects %s customers at %s EUR instead of inventing a figure', (customers, value) => {
        expect(costEstimate(customers, value)).toMatch(/^Cannot calculate/);
    });
});
