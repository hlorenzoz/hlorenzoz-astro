import { describe, it, expect } from 'vitest';
import { ENTRY_PRICE, SERVICE_KEYS, formatEntryPrice, serviceKeyFromSlug, slugFromServiceKey } from '@/lib/pricing';
import { ALL_ROUTES } from '@/lib/routes';

/**
 * `lib/pricing.ts` holds one price only, the entry price: every solution after
 * it is quoted after a free first call. It also keeps the service keys and their
 * slug helpers.
 */
describe('SERVICE_KEYS covers the catalogue', () => {
    const serviceSlugs = ALL_ROUTES.filter((route) => route.tier === 'service').map((route) =>
        route.path.replace('services/', '')
    );

    it('names exactly the registered service routes', () => {
        expect(serviceSlugs).toHaveLength(4);
        expect([...SERVICE_KEYS].sort()).toEqual(serviceSlugs.map(serviceKeyFromSlug).sort());
    });

    it('round-trips every key through its slug', () => {
        for (const key of SERVICE_KEYS) expect(serviceKeyFromSlug(slugFromServiceKey(key))).toBe(key);
    });
});

describe('ENTRY_PRICE', () => {
    it('is 500 EUR for the first implementation, VAT excluded', () => {
        expect(ENTRY_PRICE).toEqual({ amount: 500, currency: 'EUR', vatIncluded: false });
    });

    it('is formatted for the reader, whole euros', () => {
        expect(formatEntryPrice('en-IE')).toBe('\u20ac500');
        expect(formatEntryPrice('de-DE').replace(/\s/g, ' ')).toBe('500 \u20ac');
    });
});
