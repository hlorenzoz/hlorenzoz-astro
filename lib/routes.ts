/**
 * The site's route registry: one entry per indexable page, consumed by both
 * sitemaps.
 *
 * Before this existed, the XML sitemap held a hardcoded `STATIC_ROUTES` array
 * and there was no HTML sitemap at all. Adding a page meant remembering to
 * touch a list that lived nowhere near the page, which is exactly how a
 * sitemap drifts out of sync with the pages it claims to describe.
 *
 * Routes are declared once here and picked up by:
 *   - `src/pages/sitemap.xml.ts`              -> /sitemap.xml
 *   - `src/pages/[locale]/sitemap/index.astro` -> the human-readable /{locale}/sitemap/
 *
 * This module is the composition root: it is the one place that knows which
 * concrete data sources contribute routes. That is why it imports
 * `lib/portfolio-data.json` (and `lib/news-data.json`) and why it must NEVER be imported by a client
 * component. Deriving routes is a module-scope call, so a bundler cannot
 * tree-shake it, and importing any symbol from here pulls the whole JSON into
 * the browser bundle. Pure helpers a client script might want (`localeHref`,
 * the date parsers, the tier types) live in `lib/routing.ts` instead.
 */
import { getPortfolioItems } from '@/lib/portfolio';
import { getNewsItems, latestNewsModified } from '@/lib/news';
import {
    SECTION_TIERS,
    assertValidRoute,
    type RouteTier,
    type SiteRoute,
    type ValidatedRoute,
} from '@/lib/routing';

// NOTHING is re-exported from `lib/routing` here, deliberately.
//
// An earlier version re-exported `localeHref` and the date parsers "for
// convenience", which meant `import { localeHref } from '@/lib/routes'` still
// compiled and still dragged `portfolio-data.json` into whatever imported it.
// That is the exact import that put 24K of portfolio JSON into the client
// bundle of every page. Keeping the two module surfaces disjoint is what makes
// the wrong import fail to resolve instead of merely being discouraged.

/**
 * Hand-declared routes: pages that exist as files under `src/pages/[locale]/`.
 *
 * The dates are a best-effort baseline, NOT an audited content history: they
 * come from `git log -1` on each page file, which reports when that file last
 * changed for any reason, including a class rename or an import reshuffle.
 * AGENTS.md draws the distinction ("a typo fix or a class rename is not a
 * content change"), so treat these as a starting point and maintain them by
 * hand from here.
 *
 * What matters is that they are NOT all the current date. Stamping every route
 * with today would be the same lie as a build timestamp, only harder to spot,
 * and it makes the sitemap freshness test vacuous: comparing an entry against
 * its source cannot detect a `new Date()` regression on a day when every source
 * happens to equal today.
 */
const STATIC_ROUTES: readonly SiteRoute[] = [
    { path: '', tier: 'home', labelKey: 'navigation.home', lastModified: '2026-11-24' },
    { path: 'portfolio', tier: 'page', labelKey: 'navigation.portfolio', lastModified: '2026-11-24', parent: '' },
    // The index lists every post, so its date follows the freshest one instead of a second hand-kept date.
    { path: 'news', tier: 'page', labelKey: 'navigation.news', lastModified: latestNewsModified(), parent: '' },
    { path: 'card/hector', tier: 'page', labelKey: 'sitemap.labels.card', lastModified: '2026-07-10', parent: '' },
    { path: 'sitemap', tier: 'page', labelKey: 'sitemap.labels.sitemap', lastModified: '2026-11-25', parent: '' },
    { path: 'privacy-policy', tier: 'legal', labelKey: 'footer.legal.items.0.label', lastModified: '2026-07-10', parent: '' },
    { path: 'terms-conditions', tier: 'legal', labelKey: 'footer.legal.items.1.label', lastModified: '2026-10-09', parent: '' },
    { path: 'cookie-policy', tier: 'legal', labelKey: 'footer.legal.items.2.label', lastModified: '2026-07-10', parent: '' },
    // Core 30 hub + its four services. `parent: ''` because home's own path IS
    // '' — `null` is not a valid `findRoute` key and would break
    // `breadcrumbTrail`'s parent-chain walk.
    //
    // Local SEO is listed first on purpose: it is the core offer, and this
    // order is the order the hub and the sitemaps present the services in.
    { path: 'services', tier: 'category', labelKey: 'navigation.services', lastModified: '2026-10-09', parent: '' },
    { path: 'services/local-seo', tier: 'service', labelKey: 'services.localSeo.name', lastModified: '2026-10-09', parent: 'services' },
    { path: 'services/website-development', tier: 'service', labelKey: 'services.websiteDevelopment.name', lastModified: '2026-10-09', parent: 'services' },
    { path: 'services/ai-voice-receptionist', tier: 'service', labelKey: 'services.aiVoiceReceptionist.name', lastModified: '2026-10-09', parent: 'services' },
    { path: 'services/software-development', tier: 'service', labelKey: 'services.softwareDevelopment.name', lastModified: '2026-10-09', parent: 'services' },
    // PAUSED since 2026-10-08, not retired (task #T0021 brings it back). The
    // page lives in the private folder `services/_digital-business-card/`, its
    // price in `PAUSED_PRICING`, and its copy in `services.digitalBusinessCard`.
    // { path: 'services/digital-business-card', tier: 'service', labelKey: 'services.digitalBusinessCard.name', lastModified: '2026-07-22', parent: 'services' },
] as const;

/**
 * A source of routes that come from data rather than from a hand-written entry.
 *
 * Adding the generated Core 30 content pages means appending one entry to
 * `ROUTE_SOURCES` below, not editing branching logic: the consumers already
 * read `ALL_ROUTES` and neither knows nor cares where a route came from.
 *
 * `routes` is a plain array, not a thunk. An earlier version typed it as
 * `() => SiteRoute[]`, which read as deferred work but was invoked immediately
 * on the next line: the laziness was cosmetic, and it sat directly under a
 * docblock explaining that module-scope calls are exactly what a bundler cannot
 * tree-shake. Everything here is evaluated at module load either way; the
 * protection against that comes from `lib/routing.ts` holding the primitives,
 * not from a function wrapper.
 */
interface RouteSource {
    /** Named in validation errors, so a bad entry points at its origin. */
    name: string;
    routes: readonly SiteRoute[];
}

const ROUTE_SOURCES: readonly RouteSource[] = [
    {
        name: 'portfolio-data.json',
        // Portfolio detail pages keep the JSON as their single source of truth,
        // including their freshness date, so editing an entry updates what both
        // sitemaps report about it.
        routes: getPortfolioItems().map((item) => ({
            path: `portfolio/${item.slug}`,
            tier: 'page' as const,
            labelKey: `portfolio.${item.id}.title`,
            lastModified: item.lastModified,
            parent: 'portfolio',
        })),
    },
    {
        name: 'news-data.json',
        // Tier `page`, not `supporting`: a post is not a Core 30 child of a service.
        routes: getNewsItems().map((item) => ({
            path: `news/${item.slug}`,
            tier: 'page' as const,
            labelKey: `news.items.${item.id}.title`,
            lastModified: item.lastModified,
            parent: 'news',
        })),
    },
];

/**
 * Routes contributed by data sources, validated as they enter the registry.
 *
 * `assertValidRoute` returns the route with its parsed date attached, so the
 * validation pass and the sitemap share one parse instead of each doing their
 * own.
 */
export const DERIVED_ROUTES: readonly ValidatedRoute[] = ROUTE_SOURCES.flatMap((source) =>
    source.routes.map((route) => assertValidRoute(route, source.name))
);

/** Every indexable route, hand-declared and derived alike. */
export const ALL_ROUTES: readonly ValidatedRoute[] = [
    ...STATIC_ROUTES.map((route) => assertValidRoute(route, 'STATIC_ROUTES')),
    ...DERIVED_ROUTES,
];

/**
 * Routes grouped by tier in `SECTION_TIERS` order, with empty tiers dropped.
 *
 * Computed once at module scope: the grouping is locale-invariant, so doing it
 * per render meant repeating identical work for every locale at build time.
 * Only the labels differ between locales, and those are resolved by the caller.
 */
export const ROUTE_GROUPS: readonly { tier: RouteTier; routes: readonly ValidatedRoute[] }[] =
    SECTION_TIERS
        .map((tier) => ({ tier, routes: ALL_ROUTES.filter((route) => route.tier === tier) }))
        .filter((group) => group.routes.length > 0);

const BY_PATH = new Map(ALL_ROUTES.map((route) => [route.path, route]));

/** Lookup by path. */
export function findRoute(path: string): ValidatedRoute | undefined {
    return BY_PATH.get(path);
}

/** Direct children of a route, for Core 30 internal linking. */
export function childRoutes(parentPath: string): ValidatedRoute[] {
    return ALL_ROUTES.filter((route) => route.parent === parentPath);
}

/**
 * The Core 30 breadcrumb trail for a route: home first, the route itself last.
 *
 * Derived from the `parent` chain rather than hand-written per page, so a
 * page's breadcrumb cannot contradict its own place in the hierarchy. Throws on
 * a cycle or a missing parent instead of looping: both mean the registry is
 * wrong, and a build failure naming the route beats a hung build.
 */
export function breadcrumbTrail(path: string): ValidatedRoute[] {
    const trail: ValidatedRoute[] = [];
    const seen = new Set<string>();
    let current = findRoute(path);

    while (current) {
        if (seen.has(current.path)) {
            throw new Error(
                `Breadcrumb cycle at route "${current.path}": ` +
                `${[...seen].join(' -> ')} -> ${current.path}`
            );
        }
        seen.add(current.path);
        trail.unshift(current);

        if (current.parent === undefined) break;
        const parent = findRoute(current.parent);
        if (!parent) {
            throw new Error(
                `Route "${current.path}" declares parent "${current.parent}", which is not registered.`
            );
        }
        current = parent;
    }

    return trail;
}
