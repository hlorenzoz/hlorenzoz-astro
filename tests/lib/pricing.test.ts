import { describe, it, expect } from 'vitest';
import { SERVICE_KEYS, serviceKeyFromSlug, slugFromServiceKey } from '@/lib/pricing';
import { ALL_ROUTES } from '@/lib/routes';

/**
 * `lib/pricing.ts` no longer holds a price: every solution is quoted after a
 * free first call. It keeps only the service keys and their slug helpers.
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
