/**
 * Direct tests for the shared content-date formatter.
 *
 * `formatContentDate` exists to make three rules impossible to forget at the
 * call sites — UTC pinning, degradation instead of throwing, and formatter
 * caching. Testing it only through the two components that call it would leave
 * each rule asserted incidentally, so they are pinned here instead.
 *
 * The suite runs in a zone west of UTC. Under a formatter that does not pin its
 * zone, a `YYYY-MM-DD` value parsed as UTC midnight renders as the previous day
 * — and on the 1st of a month, the previous MONTH. Running in UTC would make
 * every assertion below pass against the bug.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { formatContentDate } from '@/lib/dates';
import { setTestTimeZone } from '../helpers/timezone';

afterAll(setTestTimeZone('America/Los_Angeles'));

describe('formatContentDate - timezone', () => {
    it('formats in UTC, not in the ambient zone', () => {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');

        // UTC midnight on this date is still 30 June in Los Angeles.
        expect(formatContentDate('en', '2026-07-01', 'monthYear')?.text).toBe('Jul 2026');
    });

    it('keeps the day stable on the first of a month', () => {
        expect(formatContentDate('en', '2026-07-01', 'dayMonthYear')?.text).toBe('July 1, 2026');
    });

    it('does not drift on a date that is mid-month either', () => {
        expect(formatContentDate('en', '2026-07-20', 'dayMonthYear')?.text).toBe('July 20, 2026');
    });
});

describe('formatContentDate - styles and locales', () => {
    it('renders the monthYear style', () => {
        expect(formatContentDate('en', '2026-07-20', 'monthYear')?.text).toBe('Jul 2026');
    });

    it('renders the dayMonthYear style', () => {
        expect(formatContentDate('es', '2026-07-20', 'dayMonthYear')?.text).toBe('20 de julio de 2026');
    });

    it('localizes the same date differently per locale', () => {
        const en = formatContentDate('en', '2026-07-20', 'monthYear')?.text;
        const es = formatContentDate('es', '2026-07-20', 'monthYear')?.text;

        expect(en).toBe('Jul 2026');
        expect(es).not.toBe(en);
        // Whatever Spanish abbreviates to, it must still be July.
        expect(es).toMatch(/jul/i);
    });

    it('does not let one locale+style pair collide with another in the cache', () => {
        // The cache is keyed on both. If the key dropped either half, the second
        // call would return the first call's formatter and the wrong shape.
        const short = formatContentDate('en', '2026-07-20', 'monthYear')?.text;
        const long = formatContentDate('en', '2026-07-20', 'dayMonthYear')?.text;

        expect(short).toBe('Jul 2026');
        expect(long).toBe('July 20, 2026');
    });
});

describe('formatContentDate - malformed input', () => {
    /**
     * `Intl.DateTimeFormat.format` throws `RangeError: Invalid time value` on an
     * unparseable date, and these components render on statically exported
     * pages, so a single bad JSON entry would fail the whole export.
     */
    it.each([
        ['unpadded month and day', '2026-7-1'],
        ['impossible day', '2026-02-31'],
        ['month 13', '2026-13-01'],
        ['day 32', '2026-01-32'],
        ['free text', 'not a date'],
        ['empty string', ''],
        ['ISO datetime rather than a date', '2026-07-20T00:00:00Z'],
        ['slashes', '2026/07/20'],
    ])('returns null instead of throwing (%s)', (_label, value) => {
        expect(() => formatContentDate('en', value, 'monthYear')).not.toThrow();
        expect(formatContentDate('en', value, 'monthYear')).toBeNull();
    });

    /**
     * The important half of the contract, and the reason a bare `new Date()`
     * guard would not be enough: V8 accepts both of these and silently produces
     * the WRONG date rather than an invalid one. '2026-7-1' parses in local time
     * and '2026-02-31' rolls forward into March.
     */
    it('rejects values V8 would silently accept as a different date', () => {
        expect(new Date('2026-02-31').toString()).not.toBe('Invalid Date');
        expect(formatContentDate('en', '2026-02-31', 'monthYear')).toBeNull();

        expect(new Date('2026-7-1').toString()).not.toBe('Invalid Date');
        expect(formatContentDate('en', '2026-7-1', 'monthYear')).toBeNull();
    });
});

describe('formatContentDate - iso passthrough', () => {
    it('returns the original value as iso once it has been validated', () => {
        expect(formatContentDate('en', '2026-07-20', 'dayMonthYear')?.iso).toBe('2026-07-20');
    });

    it('only ever returns an iso that is a valid HTML5 date', () => {
        // `ArticleByline` puts this straight into a `<time datetime>` attribute,
        // which requires a valid date; that is safe only because anything that
        // fails validation returns null instead of a partially-usable object.
        for (const value of ['2026-01-01', '2026-12-31', '2028-02-29']) {
            const result = formatContentDate('en', value, 'monthYear');
            expect(result?.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('accepts a real leap day and rejects a fake one', () => {
        expect(formatContentDate('en', '2028-02-29', 'dayMonthYear')?.text).toBe('February 29, 2028');
        // 2026 is not a leap year, so this rolls over and must be rejected.
        expect(formatContentDate('en', '2026-02-29', 'dayMonthYear')).toBeNull();
    });
});

describe('formatContentDate - formatter caching', () => {
    /**
     * Counts constructions while keeping real instances.
     *
     * `vi.spyOn(Intl, 'DateTimeFormat')` cannot be used here: the spy does not
     * forward the constructed object through `new`, so the caller receives
     * something with no `.format` and the test fails for the wrong reason.
     * Wrapping the constructor by hand keeps the real return value.
     */
    function countingConstructions<T>(body: () => T): { result: T; count: number } {
        const Original = Intl.DateTimeFormat;
        let count = 0;

        Intl.DateTimeFormat = function (...args: unknown[]) {
            count += 1;
            return new (Original as unknown as new (...a: unknown[]) => Intl.DateTimeFormat)(...args);
        } as unknown as typeof Intl.DateTimeFormat;

        try {
            return { result: body(), count };
        } finally {
            Intl.DateTimeFormat = Original;
        }
    }

    it('builds one Intl.DateTimeFormat per locale+style, not one per call', () => {
        // A locale this suite has not touched, so the cache starts empty for it
        // regardless of what ran earlier in the file.
        const { count } = countingConstructions(() => {
            for (let i = 0; i < 5; i += 1) {
                formatContentDate('de-AT', '2026-07-20', 'monthYear');
            }
        });

        expect(count).toBe(1);
    });

    it('returns correct output from the cached formatter, not a stale one', () => {
        const first = formatContentDate('de-AT', '2026-07-20', 'monthYear')?.text;
        const second = formatContentDate('de-AT', '2026-01-05', 'monthYear')?.text;

        expect(first).toBeTruthy();
        expect(second).toBeTruthy();
        expect(second).not.toBe(first);
    });

    it('still builds a separate formatter for a different style', () => {
        const { count } = countingConstructions(() => {
            formatContentDate('fr-CA', '2026-07-20', 'monthYear');
            formatContentDate('fr-CA', '2026-07-20', 'monthYear');
            formatContentDate('fr-CA', '2026-07-20', 'dayMonthYear');
        });

        expect(count).toBe(2);
    });

    it('does not construct a formatter at all for an invalid date', () => {
        const { result, count } = countingConstructions(() =>
            formatContentDate('nl-BE', 'not a date', 'monthYear')
        );

        expect(result).toBeNull();
        expect(count).toBe(0);
    });
});
