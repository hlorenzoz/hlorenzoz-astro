import { describe, it, expect } from 'vitest';
import { schemaDateTime, isSchemaDateTime, assertSchemaInvariants } from '@/lib/schema/datetime';

describe('schemaDateTime', () => {
    it.each([
        ['2026-11-24', '2026-11-24T00:00:00+01:00'], // winter, CET
        ['2026-07-23', '2026-07-23T00:00:00+02:00'], // summer, CEST
        ['2026-03-29', '2026-03-29T00:00:00+01:00'], // spring-forward day: midnight is still CET
        ['2026-03-30', '2026-03-30T00:00:00+02:00'],
        ['2026-10-25', '2026-10-25T00:00:00+02:00'], // fall-back day: midnight is still CEST
        ['2026-10-26', '2026-10-26T00:00:00+01:00'],
    ])('%s -> %s (Europe/Madrid midnight)', (date, expected) => {
        expect(schemaDateTime(date)).toBe(expected);
        expect(isSchemaDateTime(schemaDateTime(date))).toBe(true);
    });

    it.each(['2026-11-1', '2026-02-30', '24/11/2026', '', '2026-11-24T00:00:00Z'])(
        'throws on %j',
        (bad) => {
            expect(() => schemaDateTime(bad)).toThrow();
        }
    );
});

describe('isSchemaDateTime', () => {
    it.each([
        '2026-11-24T00:00:00+01:00',
        '2026-11-24T00:00:00Z',
        '2026-11-24T10:20:30.123-05:00',
    ])('accepts %s', (v) => expect(isSchemaDateTime(v)).toBe(true));

    it.each(['2026-11-24', '2026-11-24T00:00:00', '2026-11-24T00:00+01:00', 42, null, undefined])(
        'rejects %j',
        (v) => expect(isSchemaDateTime(v)).toBe(false)
    );
});

describe('assertSchemaInvariants', () => {
    const valid = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'NewsArticle',
                datePublished: '2026-11-24T00:00:00+01:00',
                dateModified: '2026-11-24T00:00:00+01:00',
                about: { '@type': 'WebPage', '@id': 'https://x/', url: 'https://x/', name: 'X' },
                openingHours: 'Mo-Fr 09:00-18:00',
            },
        ],
    };

    it('passes a valid graph', () => {
        expect(() => assertSchemaInvariants(valid)).not.toThrow();
    });

    it('throws on a date-only value, naming the property path', () => {
        const bad = { '@graph': [{ '@type': 'Article', dateModified: '2026-11-24' }] };
        expect(() => assertSchemaInvariants(bad)).toThrow(/\$\['@graph'\]\[0\]\.dateModified/);
    });

    it('checks any *Date / *Time key, not only datePublished/dateModified', () => {
        expect(() => assertSchemaInvariants({ startDate: '2026-11-24' })).toThrow(/startDate/);
        expect(() => assertSchemaInvariants({ uploadTime: '2026-11-24' })).toThrow(/uploadTime/);
    });

    it('throws on a string about', () => {
        const bad = { '@type': 'Article', about: 'https://hlorenzoz.com/en/portfolio/gerp-dj/' };
        expect(() => assertSchemaInvariants(bad)).toThrow(/\$\.about/);
    });

    it('throws on an untyped or string entry in a mentions array', () => {
        expect(() => assertSchemaInvariants({ mentions: [{ '@type': 'Thing' }, 'x'] })).toThrow(/mentions\[1\]/);
        expect(() => assertSchemaInvariants({ about: { name: 'no type' } })).toThrow(/about/);
    });
});
