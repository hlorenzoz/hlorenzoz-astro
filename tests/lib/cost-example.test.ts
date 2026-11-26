import { describe, it, expect } from 'vitest';
import { DEFAULTS, DENTAL_MEDIANS, OCU_SOURCE, euroFormatter, lossFromInputs, lossPerPeriod } from '@/lib/cost-example';

describe('DENTAL_MEDIANS', () => {
    it('lists the OCU 2024 Spain medians in order', () => {
        expect(DENTAL_MEDIANS).toEqual([
            { key: 'cleaning', amount: 60 },
            { key: 'filling', amount: 80 },
            { key: 'rootCanal', amount: 250 },
            { key: 'implant', amount: 1850 },
            { key: 'orthodontics', amount: 2000 },
        ]);
        expect(OCU_SOURCE).toEqual({
            url: 'https://www.ocu.org/organizacion/prensa/notas-de-prensa/2024/saluddental271124',
            published: '2024-11-27',
        });
    });

    it('starts the calculators from the documented defaults', () => {
        expect(DEFAULTS).toEqual({ missed: 1, value: 140 });
    });
});

describe('lossPerPeriod', () => {
    it('counts 5 working days a week and 52 weeks a year', () => {
        expect(lossPerPeriod(140)).toEqual({ day: 140, week: 700, month: (140 * 5 * 52) / 12, year: 36400 });
    });

    it('is zero when nothing is lost', () => {
        expect(lossPerPeriod(0)).toEqual({ day: 0, week: 0, month: 0, year: 0 });
    });
});

describe('lossFromInputs', () => {
    it('multiplies customers lost a day by the first visit value', () => {
        expect(lossFromInputs(2, 100)).toEqual(lossPerPeriod(200));
    });

    it.each([
        [0, 140],
        [1, 0],
        [Number.NaN, 140],
        [-1, -140],
    ])('returns null for %s customers at %s', (missed, value) => {
        expect(lossFromInputs(missed, value)).toBeNull();
    });
});

describe('formatters', () => {
    it('formats whole euros for the locale', () => {
        expect(euroFormatter('en-IE').format(3033.33)).toBe('\u20ac3,033');
    });
});
