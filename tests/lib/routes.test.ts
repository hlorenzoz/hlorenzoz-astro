/**
 * The route registry is the single source of truth for both sitemaps, for the
 * sitewide Navbar's internal links, and for every freshness date on the site,
 * so a bad entry here is not a local problem.
 */
import { describe, it, expect } from 'vitest';
import {
    ALL_ROUTES,
    DERIVED_ROUTES,
    ROUTE_GROUPS,
    breadcrumbTrail,
    childRoutes,
    findRoute,
} from '@/lib/routes';
import {
    ROUTE_PATH_PATTERN,
    SECTION_TIERS,
    assertValidRoute,
    localeHref,
    parseFreshnessDate,
    tryParseFreshnessDate,
    type SiteRoute,
} from '@/lib/routing';
import { getPortfolioItems } from '@/lib/portfolio';
import { getNewsItems, latestNewsModified } from '@/lib/news';

const VALID: SiteRoute = {
    path: 'local-seo/gbp-optimization',
    tier: 'service',
    labelKey: 'services.localSeo.gbp.title',
    lastModified: '2026-07-10',
};

describe('parseFreshnessDate', () => {
    it('parses a well-formed ISO date as UTC midnight', () => {
        expect(parseFreshnessDate('2026-07-20', 'test').toISOString())
            .toBe('2026-07-20T00:00:00.000Z');
    });

    it.each([
        ['2026-7-20', 'single-digit month, which new Date() parses as local time'],
        ['20-07-2026', 'day-first, which yields an Invalid Date'],
        ['2026/07/20', 'slashes'],
        ['', 'empty'],
        ['yesterday', 'free text'],
    ])('rejects %s (%s)', (value) => {
        expect(() => parseFreshnessDate(value, 'route "x"')).toThrow(/Invalid lastModified/);
    });

    it('rejects a date that silently rolls over, naming what it became', () => {
        // new Date('2026-02-31T00:00:00Z') resolves to March 3 without complaint.
        expect(() => parseFreshnessDate('2026-02-31', 'route "x"'))
            .toThrow(/rolls over to 2026-03-03/);
    });

    it('names the offending value and context so the failure is actionable', () => {
        expect(() => parseFreshnessDate('nope', 'portfolio item "meg"'))
            .toThrow('Invalid lastModified "nope" for portfolio item "meg". Expected ISO YYYY-MM-DD.');
    });
});

describe('tryParseFreshnessDate', () => {
    it('returns a Date for valid input and null for anything else', () => {
        expect(tryParseFreshnessDate('2026-07-20')?.toISOString()).toBe('2026-07-20T00:00:00.000Z');
        for (const bad of ['2026-7-20', '20-07-2026', '2026-02-31', '', 'nope']) {
            expect(tryParseFreshnessDate(bad), `"${bad}" should not parse`).toBeNull();
        }
    });

    it('never throws, which is why render paths use it', () => {
        // A throw here would fail the whole static export over one bad date.
        expect(() => tryParseFreshnessDate('garbage')).not.toThrow();
    });
});

/**
 * `ROUTE_PATH_PATTERN` used to be asserted only in this file, which meant a
 * route arriving from a data source (the upcoming generated Core 30 content
 * never passes through a test fixture) could carry any shape and reach the
 * sitemap unchecked. `assertValidRoute` now runs where routes enter the
 * registry, in production.
 */
describe('assertValidRoute enforces the contract at the boundary', () => {
    it('accepts a well-formed route, preserving every declared field', () => {
        expect(assertValidRoute(VALID, 'test')).toMatchObject(VALID);
    });

    it.each([
        ['Local-SEO', 'uppercase'],
        ['local seo', 'a space'],
        ['/local-seo', 'a leading slash'],
        ['local-seo/', 'a trailing slash'],
        ['local--seo', 'a doubled hyphen'],
        ['servicios/diseño', 'a non-ASCII segment'],
    ])('rejects the path "%s" (%s)', (path) => {
        expect(() => assertValidRoute({ ...VALID, path }, 'test'))
            .toThrow(/Invalid route path/);
    });

    it('accepts the empty path, which is the home route', () => {
        expect(() => assertValidRoute({ ...VALID, path: '', tier: 'home' }, 'test')).not.toThrow();
    });

    it('rejects a route with no labelKey, which would render as a raw path', () => {
        expect(() => assertValidRoute({ ...VALID, labelKey: '' }, 'test'))
            .toThrow(/has no labelKey/);
    });

    it('rejects a malformed date and names the source', () => {
        expect(() => assertValidRoute({ ...VALID, lastModified: '2026-7-1' }, 'portfolio-data.json'))
            .toThrow(/portfolio-data\.json/);
    });

    it('is actually wired into the registry, not just exported', () => {
        // Guards the guard: every shipped route must already satisfy it.
        for (const route of ALL_ROUTES) {
            expect(() => assertValidRoute(route, 'ALL_ROUTES')).not.toThrow();
        }
    });

    it('attaches the parsed date so consumers do not re-parse the string', () => {
        const validated = assertValidRoute(VALID, 'test');
        expect(validated.lastModifiedDate).toBeInstanceOf(Date);
        expect(validated.lastModifiedDate.toISOString()).toBe('2026-07-10T00:00:00.000Z');
        // Every registry route carries it, which is what lets src/pages/sitemap.xml.ts
        // drop its own parseFreshnessDate call.
        for (const route of ALL_ROUTES) {
            expect(route.lastModifiedDate.toISOString().slice(0, 10)).toBe(route.lastModified);
        }
    });
});

/**
 * The frozen-date bug had two halves. The mechanism was fixed first (each item
 * carries its own field), but every item was then given the SAME value, taken
 * from git log of the JSON file rather than of each project. Functionally the
 * sitemap reported exactly what it had before, and the entry-matches-source
 * test passed because both sides were the same constant.
 */
/**
 * Core 30 breadcrumbs are a parent chain (home -> category -> service). Deriving
 * them from the registry is what stops a page declaring a trail that contradicts
 * its own URL nesting, which is what hand-writing them per page allowed.
 */
describe('breadcrumbTrail', () => {
    it('starts at home and ends at the route itself', () => {
        const trail = breadcrumbTrail('portfolio/real-estate');
        expect(trail.map((r) => r.path)).toEqual(['', 'portfolio', 'portfolio/real-estate']);
    });

    it('returns just the home route for home', () => {
        expect(breadcrumbTrail('').map((r) => r.path)).toEqual(['']);
    });

    it('returns an empty trail for an unregistered path', () => {
        expect(breadcrumbTrail('not/a/route')).toEqual([]);
    });

    it('gives every registered route a trail rooted at home', () => {
        for (const route of ALL_ROUTES) {
            const trail = breadcrumbTrail(route.path);
            expect(trail[0].path, `"${route.path}" trail does not start at home`).toBe('');
            expect(trail[trail.length - 1].path).toBe(route.path);
        }
    });

    it('resolves the parent of a nested route to the route above it', () => {
        expect(findRoute('portfolio/real-estate')?.parent).toBe('portfolio');
        expect(findRoute('portfolio')?.parent).toBe('');
        expect(findRoute('')?.parent).toBeUndefined();
    });

    it('every declared parent resolves to a real route', () => {
        // This is the assertion the old vacuous version could never make,
        // because no route set `parent` at all.
        const withParent = ALL_ROUTES.filter((r) => r.parent !== undefined);
        expect(withParent.length).toBeGreaterThan(0);
        for (const route of withParent) {
            expect(findRoute(route.parent as string), `"${route.path}" has an unknown parent`)
                .toBeDefined();
        }
    });
});

describe('childRoutes', () => {
    it('finds the portfolio detail pages under the portfolio index', () => {
        const children = childRoutes('portfolio').map((r) => r.path);
        expect(children.length).toBe(getPortfolioItems().length);
        for (const item of getPortfolioItems()) {
            expect(children).toContain(`portfolio/${item.slug}`);
        }
    });

    it('returns nothing for a leaf route', () => {
        expect(childRoutes('privacy-policy')).toEqual([]);
    });
});

describe('service-pages routes (hub + 4 services)', () => {
    // Registry order. None is a core offer: they are building blocks of one solution.
    const SERVICE_SLUGS = [
        'local-seo',
        'website-development',
        'ai-voice-receptionist',
        'software-development',
    ] as const;

    it('registers the hub as a category route, top-level like other pages', () => {
        const hub = findRoute('services');
        expect(hub).toBeDefined();
        expect(hub?.tier).toBe('category');
        // Top-level pages use parent: '' (home's own path IS ''), not null:
        // `null` is not a valid `findRoute` key and would break `breadcrumbTrail`.
        expect(hub?.parent).toBe('');
    });

    it.each(SERVICE_SLUGS)('registers "services/%s" as a service route, child of the hub', (slug) => {
        const route = findRoute(`services/${slug}`);
        expect(route).toBeDefined();
        expect(route?.tier).toBe('service');
        expect(route?.parent).toBe('services');
    });

    it('lists exactly the four services as children of the hub, in registry order', () => {
        // Not sorted: both sitemaps present the services in registry order.
        expect(childRoutes('services').map((r) => r.path)).toEqual(
            SERVICE_SLUGS.map((slug) => `services/${slug}`)
        );
    });

    it.each(['reputation-review-management', 'digital-business-card'])(
        'no longer registers "services/%s"',
        (slug) => {
            // Review management is a pillar of Local SEO now, and the Digital
            // Business Card is paused. A registered route would put either back
            // in the sitemap, the hub and the JSON-LD.
            expect(findRoute(`services/${slug}`)).toBeUndefined();
        }
    );

    it('gives a three-level breadcrumb trail for a service page', () => {
        const trail = breadcrumbTrail('services/local-seo');
        expect(trail.map((r) => r.path)).toEqual(['', 'services', 'services/local-seo']);
    });

    /**
     * A route's `labelKey` names the PAGE, for breadcrumbs and the HTML
     * sitemap. It pointed at `hero.title` at first, which is the marketing
     * headline, so the BreadcrumbList emitted `Home > Services > "Show Up When
     * Locals Search"` and the sitemap listed slogans instead of names. Google renders
     * breadcrumbs in the SERP, so that shipped the slogan into search results,
     * and the same URL appeared under two different names on one sitemap page
     * (route-derived headline vs footer-derived product name).
     */
    it.each(SERVICE_SLUGS)('labels "services/%s" with a name key, not the marketing headline', (slug) => {
        const route = findRoute(`services/${slug}`);
        expect(route?.labelKey).toMatch(/^services\.[A-Za-z]+\.name$/);
        expect(route?.labelKey).not.toMatch(/hero/);
    });
});

describe('portfolio dates are per-project, not one shared constant', () => {
    const items = getPortfolioItems();

    it('has more than one distinct date across the portfolio', () => {
        const distinct = new Set(items.map((i) => i.lastModified));
        expect(
            distinct.size,
            `all ${items.length} portfolio items share the date ${[...distinct][0]}; ` +
            'that is the frozen-date bug in a new location'
        ).toBeGreaterThan(1);
    });

    it('gives no route today\'s date unless it genuinely changed today', () => {
        // A wholesale re-stamp is the most likely way this regresses.
        const today = new Date().toISOString().slice(0, 10);
        const stampedToday = ALL_ROUTES.filter((r) => r.lastModified === today);
        expect(stampedToday.length).toBeLessThan(ALL_ROUTES.length);
    });
});

describe('registry integrity', () => {
    it('gives every route a parseable lastModified', () => {
        for (const route of ALL_ROUTES) {
            expect(() => parseFreshnessDate(route.lastModified, route.path)).not.toThrow();
        }
    });

    it('gives every route a labelKey, so none can render as a raw path', () => {
        for (const route of ALL_ROUTES) {
            expect(route.labelKey, `route "${route.path}" has no labelKey`).toBeTruthy();
        }
    });

    it('has no duplicate paths across hand-declared and derived routes', () => {
        const paths = ALL_ROUTES.map((r) => r.path);
        expect(new Set(paths).size).toBe(paths.length);
    });

    it('declares exactly one home route', () => {
        const home = ALL_ROUTES.filter((r) => r.tier === 'home');
        expect(home).toHaveLength(1);
        expect(home[0].path).toBe('');
    });

    it('stores paths as bare lowercase slugs, so hrefs need no escaping', () => {
        for (const route of ALL_ROUTES) {
            expect(route.path, `"${route.path}" is not a clean slug path`)
                .toMatch(ROUTE_PATH_PATTERN);
        }
    });

    it('renders every tier the registry actually uses', () => {
        for (const tier of new Set(ALL_ROUTES.map((r) => r.tier))) {
            expect(SECTION_TIERS, `tier "${tier}" is used but never rendered`).toContain(tier);
        }
    });
});

describe('DERIVED_ROUTES', () => {
    it('mirrors the portfolio and news data sources one-for-one', () => {
        const items = getPortfolioItems();
        expect(items.length).toBeGreaterThan(0);
        expect(DERIVED_ROUTES).toHaveLength(items.length + getNewsItems().length);
        for (const item of items) {
            const route = DERIVED_ROUTES.find((r) => r.path === `portfolio/${item.slug}`);
            expect(route, `no derived route for "${item.slug}"`).toBeDefined();
            // The date must come from the item, not a shared constant: that was
            // the bug where every portfolio URL reported one frozen date.
            expect(route?.lastModified).toBe(item.lastModified);
            expect(route?.labelKey).toBe(`portfolio.${item.id}.title`);
        }
    });

    it('derives one news post route per entry, under the news index', () => {
        for (const item of getNewsItems()) {
            const route = DERIVED_ROUTES.find((r) => r.path === `news/${item.slug}`);
            expect(route, `no derived route for news "${item.slug}"`).toBeDefined();
            expect(route?.tier).toBe('page');
            expect(route?.parent).toBe('news');
            expect(route?.lastModified).toBe(item.lastModified);
            expect(route?.labelKey).toBe(`news.items.${item.id}.title`);
            expect(breadcrumbTrail(route!.path).map((r) => r.path)).toEqual(['', 'news', `news/${item.slug}`]);
        }
    });

    it('registers the news index with the date of its freshest post', () => {
        const index = findRoute('news');
        expect(index).toMatchObject({ tier: 'page', parent: '', labelKey: 'navigation.news' });
        expect(index?.lastModified).toBe(latestNewsModified());
        expect(childRoutes('news')).toHaveLength(getNewsItems().length);
    });

    it('is indistinguishable from a hand-declared route to consumers', () => {
        // The point of DERIVED_ROUTES: consumers read ALL_ROUTES and cannot
        // tell which entries came from JSON, so no consumer needs a branch.
        // `lastModifiedDate` is added by `assertValidRoute`, which every route
        // passes through regardless of origin. `parent` is present on all but
        // the home route, which is the root of the tree. `copyKeys` and the
        // `locales` derived from them decide where every page is built.
        const required = ['copyKeys', 'labelKey', 'lastModified', 'lastModifiedDate', 'locales', 'path', 'tier'];
        const hand = ALL_ROUTES.filter((r) => !DERIVED_ROUTES.includes(r));
        expect(hand.length).toBeGreaterThan(0);

        for (const route of [...DERIVED_ROUTES, ...hand]) {
            const keys = Object.keys(route).sort();
            expect(required.every((k) => keys.includes(k)), `${route.path} is missing a field`).toBe(true);
            expect(keys.filter((k) => !required.includes(k) && k !== 'parent')).toEqual([]);
        }
    });
});

describe('ROUTE_GROUPS', () => {
    it('contains every route exactly once', () => {
        const grouped = ROUTE_GROUPS.flatMap((g) => g.routes.map((r) => r.path)).sort();
        expect(grouped).toEqual(ALL_ROUTES.map((r) => r.path).sort());
    });

    it('drops empty tiers rather than rendering blank sections', () => {
        for (const group of ROUTE_GROUPS) {
            expect(group.routes.length).toBeGreaterThan(0);
        }
    });

    it('starts with home, then gives services, portfolio and news a section each, then pages and legal', () => {
        expect(ROUTE_GROUPS.map((g) => g.id)).toEqual(['home', 'services', 'portfolio', 'news', 'page', 'legal']);
    });

    it('puts each hub first in its section, followed by everything under it', () => {
        for (const id of ['services', 'portfolio', 'news']) {
            const group = ROUTE_GROUPS.find((g) => g.id === id)!;
            expect(group.routes[0].path).toBe(id);
            expect(group.routes.slice(1).every((route) => route.path.startsWith(`${id}/`))).toBe(true);
            expect(group.routes.length).toBe(ALL_ROUTES.filter((r) => r.path === id || r.path.startsWith(`${id}/`)).length);
        }
    });

    it('lists every route exactly once across the sections', () => {
        const listed = ROUTE_GROUPS.flatMap((g) => g.routes.map((r) => r.path));
        expect([...listed].sort()).toEqual(ALL_ROUTES.map((r) => r.path).sort());
    });
});

describe('localeHref', () => {
    it('appends the trailing slash the site canonicalizes on', () => {
        expect(localeHref('en', 'portfolio')).toBe('/en/portfolio/');
        expect(localeHref('es', 'local-seo/gbp')).toBe('/es/local-seo/gbp/');
    });

    it('renders the home route as the bare locale root', () => {
        expect(localeHref('en', '')).toBe('/en/');
    });

    it('normalizes stray slashes on the way in', () => {
        expect(localeHref('en', '/portfolio')).toBe('/en/portfolio/');
        expect(localeHref('en', 'portfolio/')).toBe('/en/portfolio/');
        expect(localeHref('en', '//portfolio//')).toBe('/en/portfolio/');
    });

    it('percent-encodes segments instead of emitting a malformed href', () => {
        // This backs the sitewide Navbar, so an unencoded space would put a
        // broken link on every page of the site.
        expect(localeHref('es', 'seo local')).toBe('/es/seo%20local/');
        expect(localeHref('es', 'servicios/diseño')).toBe('/es/servicios/dise%C3%B1o/');
    });

    it('encodes each segment separately, keeping the path separators intact', () => {
        expect(localeHref('en', 'a b/c d')).toBe('/en/a%20b/c%20d/');
    });
});
