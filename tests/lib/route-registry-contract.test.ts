/**
 * One behavioural contract, run against BOTH the live route registry and the
 * fixture the content-factory tests inject.
 *
 * Why this exists: the factory's tests drive it with a fixture I wrote to match
 * my own implementation. That is a closed loop. Mock and implementation can
 * agree with each other while both diverge from how `lib/routes.ts` actually
 * behaves, and the divergence would only surface on the first real Core 30
 * page. The live registry cannot stand in for the fixture (it holds no content
 * tiers until a content page ships), so instead both are held to the same
 * assertions about SHAPE and BEHAVIOUR, which is what the factory depends on.
 *
 * If `childRoutes` ordering, `breadcrumbTrail` rooting, or the `ValidatedRoute`
 * shape drifts in either one, this fails.
 */
import { describe, it, expect } from 'vitest';
import { breadcrumbTrail, childRoutes, findRoute, ALL_ROUTES } from '@/lib/routes';
import { ROUTE_PATH_PATTERN, tryParseFreshnessDate } from '@/lib/routing';
import type { RouteRegistry } from '@/lib/service-page';
import { FIXTURE_REGISTRY } from '@/tests/fixtures/core30-registry';

const LIVE: RouteRegistry = { findRoute, childRoutes, breadcrumbTrail };

/** A path known to exist in each registry, plus its expected root. */
const IMPLEMENTATIONS: [string, RouteRegistry, string][] = [
    ['live registry', LIVE, ALL_ROUTES.find((r) => r.parent !== undefined)?.path ?? 'portfolio'],
    ['fixture registry', FIXTURE_REGISTRY, 'local-seo/gbp'],
];

describe.each(IMPLEMENTATIONS)('%s satisfies the RouteRegistry contract', (_name, registry, samplePath) => {
    it('returns undefined for an unknown path rather than throwing', () => {
        expect(registry.findRoute('definitely/not/a/route')).toBeUndefined();
    });

    it('returns an empty trail for an unknown path', () => {
        expect(registry.breadcrumbTrail('definitely/not/a/route')).toEqual([]);
    });

    it('returns an empty child list for an unknown path', () => {
        expect(registry.childRoutes('definitely/not/a/route')).toEqual([]);
    });

    it('roots every trail at the home route and ends at the requested page', () => {
        const trail = registry.breadcrumbTrail(samplePath);
        expect(trail.length).toBeGreaterThan(1);
        expect(trail[0].path).toBe('');
        expect(trail[trail.length - 1].path).toBe(samplePath);
    });

    it('returns a trail whose every step is the parent of the next', () => {
        const trail = registry.breadcrumbTrail(samplePath);
        for (let i = 1; i < trail.length; i++) {
            expect(trail[i].parent, `${trail[i].path} should hang off ${trail[i - 1].path}`)
                .toBe(trail[i - 1].path);
        }
    });

    it('returns ValidatedRoute objects carrying a parsed date that matches the string', () => {
        const route = registry.findRoute(samplePath);
        expect(route).toBeDefined();
        expect(route?.lastModifiedDate).toBeInstanceOf(Date);
        expect(route?.lastModifiedDate.toISOString().slice(0, 10)).toBe(route?.lastModified);
    });

    it('gives every route the fields the factory reads', () => {
        const route = registry.findRoute(samplePath);
        for (const field of ['path', 'tier', 'labelKey', 'lastModified'] as const) {
            expect(route?.[field], `sample route has no ${field}`).toBeDefined();
        }
    });

    it('returns children that all name the queried path as their parent', () => {
        const trail = registry.breadcrumbTrail(samplePath);
        const parentPath = trail[trail.length - 2]?.path ?? '';
        const children = registry.childRoutes(parentPath);
        expect(children.length).toBeGreaterThan(0);
        for (const child of children) {
            expect(child.parent).toBe(parentPath);
        }
    });

    it('holds every route to the same path and date shape', () => {
        const trail = registry.breadcrumbTrail(samplePath);
        for (const route of trail) {
            expect(route.path, `"${route.path}" is not a clean slug`).toMatch(ROUTE_PATH_PATTERN);
            expect(tryParseFreshnessDate(route.lastModified), `"${route.path}" has a bad date`)
                .not.toBeNull();
        }
    });

    it('agrees with itself: findRoute and breadcrumbTrail return the same route object shape', () => {
        const direct = registry.findRoute(samplePath);
        const viaTrail = registry.breadcrumbTrail(samplePath).at(-1);
        expect(Object.keys(direct ?? {}).sort()).toEqual(Object.keys(viaTrail ?? {}).sort());
    });
});

describe('the fixture is a faithful stand-in, not a convenient one', () => {
    it('covers a content tier the live registry does not have yet', () => {
        // The `services` hub and its six children shipped in the live registry
        // (`lib/routes.ts`), which is exactly the transition this docblock
        // predicted: "If the live registry ever gains these tiers, the factory
        // should be tested against it directly instead." `category` and
        // `service` are covered by `tests/lib/routes.test.ts` and
        // `tests/seo/service-pages-config.test.ts` against the real
        // registry now. `location` (Core 30 city/landmark pages) has not
        // shipped yet, so the fixture still stands in for it here.
        const liveTiers = new Set(ALL_ROUTES.map((r) => r.tier));
        expect(liveTiers.has('category')).toBe(true);
        expect(liveTiers.has('service')).toBe(true);
        expect(liveTiers.has('location')).toBe(false);

        expect(FIXTURE_REGISTRY.findRoute('local-seo')?.tier).toBe('category');
        expect(FIXTURE_REGISTRY.findRoute('local-seo/gbp')?.tier).toBe('service');
        expect(FIXTURE_REGISTRY.findRoute('zonas/ourense')?.tier).toBe('location');
    });
});
