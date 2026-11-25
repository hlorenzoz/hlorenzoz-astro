/**
 * Pure routing primitives: types, URL construction, and freshness-date parsing.
 *
 * Deliberately free of data imports. `lib/routes.ts` holds the actual registry
 * and pulls in `lib/portfolio-data.json` to derive routes, which makes it a
 * module a bundler cannot tree-shake: the derivation is a module-scope function
 * call, so anything importing *any* symbol from it drags the whole JSON along.
 *
 * That is not hypothetical. When `localeHref` lived beside the registry, the
 * sitewide client Navbar imported it and shipped 24K of portfolio data into the
 * bundle of every page, including the legal pages that render none of it.
 * `tests/lib/routing-purity.test.ts` guards the separation.
 *
 * Rule of thumb: if a client script needs it, it belongs here.
 */

/**
 * Core 30 tiers. The hierarchy a local business site is graded on, and the
 * grouping the HTML sitemap renders. `page` covers everything outside the
 * Core 30 ladder (portfolio, the digital card, legal).
 */
export type RouteTier =
    | 'home'
    | 'category'
    | 'service'
    | 'supporting'
    | 'location'
    | 'page'
    | 'legal';

export interface SiteRoute {
    /** Path relative to the locale root. Empty string is the home page. */
    path: string;
    /** Core 30 tier, used for grouping and sitemap priority. */
    tier: RouteTier;
    /**
     * Translation key for the label shown in the HTML sitemap.
     *
     * Required, not optional. When it was optional the consumer fell back to
     * rendering the raw path, so a route added without one would have shipped
     * a heading reading "local-seo/gbp-optimization" to users in both locales.
     * A route that cannot be named does not belong in a human sitemap.
     */
    labelKey: string;
    /**
     * ISO date (YYYY-MM-DD) of the last meaningful content change.
     *
     * Deliberately explicit rather than `new Date()` at build time: a build
     * timestamp tells Google every page changed on every deploy, which trains
     * it to ignore the signal. Bump this only when the content actually
     * changes.
     */
    lastModified: string;
    /**
     * Path of the parent route, for the Core 30 breadcrumb chain
     * (home -> category -> service). Omitted by the home route only.
     *
     * This field was deleted once as "speculative API with no consumers". It
     * had no consumer because the consumer had not been written yet: Core 30
     * breadcrumbs ARE a parent chain, and without it every page hand-writes its
     * own trail, free to contradict its own URL nesting. Deriving the crumbs
     * from here is what keeps the internal-linking hierarchy single-sourced.
     */
    parent?: string;
}

/**
 * Tiers the human sitemap renders as sections, in Core 30 order.
 *
 * `home` leads rather than being omitted. It is the primary ranking target and
 * the root every breadcrumb climbs to, so the page whose job is enumerating the
 * site cannot skip it while /sitemap.xml lists it.
 */
export const SECTION_TIERS: readonly RouteTier[] = [
    'home',
    'category',
    'service',
    'supporting',
    'location',
    'page',
    'legal',
] as const;

/**
 * Path shape every registry entry must satisfy: empty (home) or lowercase slug
 * segments separated by single slashes.
 *
 * Enforced at registry construction by `assertValidRoute`, not just asserted in
 * a test, so a route arriving from a data source is held to the same shape as a
 * hand-written one.
 */
export const ROUTE_PATH_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/**
 * Builds the locale-prefixed href for a route path.
 *
 * The trailing slash is not cosmetic: `next.config.ts` sets
 * `trailingSlash: true`, so every canonical URL ends in one. Linking to
 * `/en/portfolio` points at a non-canonical form of a page whose own
 * `rel=canonical` says `/en/portfolio/`, costing a normalization hop and
 * muddying exactly the signal the og:url work cleaned up.
 *
 * Segments are percent-encoded as a second line of defence behind
 * `ROUTE_PATH_PATTERN`, since this backs the sitewide Navbar: a malformed path
 * that slipped through would otherwise put a broken link on every page.
 */
export function localeHref(locale: string, path: string): string {
    const clean = path.replace(/^\/+|\/+$/g, '');
    if (!clean) return `/${encodeURIComponent(locale)}/`;
    const encoded = clean.split('/').map(encodeURIComponent).join('/');
    return `/${encodeURIComponent(locale)}/${encoded}/`;
}

/** Why a freshness date failed to parse. Drives the thrown message. */
type FreshnessFailure =
    | { kind: 'shape' }
    | { kind: 'unreal' }
    | { kind: 'rollover'; became: string };

type FreshnessResult = { ok: true; date: Date } | { ok: false; failure: FreshnessFailure };

/**
 * The single place a `YYYY-MM-DD` freshness date is validated.
 *
 * `new Date()` is far too permissive for a hand-maintained field. `2026-7-20`
 * parses as local time (shifting the day across timezones), `20-07-2026` yields
 * an Invalid Date whose `toISOString()` throws deep inside sitemap
 * serialization, and `2026-02-31` silently rolls over into March. AGENTS.md
 * requires these dates to be edited by hand on every content change, so a typo
 * is a matter of when, not if.
 *
 * Returns the reason rather than throwing so both the strict and the lenient
 * wrapper below can share one implementation; when the accepted format changes,
 * it changes here once.
 */
function parseFreshness(value: string): FreshnessResult {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { ok: false, failure: { kind: 'shape' } };
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        return { ok: false, failure: { kind: 'unreal' } };
    }
    const normalized = date.toISOString().slice(0, 10);
    if (normalized !== value) {
        return { ok: false, failure: { kind: 'rollover', became: normalized } };
    }
    return { ok: true, date };
}

/** Strict parse for data boundaries: throws naming the value and its context. */
export function parseFreshnessDate(value: string, context: string): Date {
    const result = parseFreshness(value);
    if (result.ok) return result.date;

    if (result.failure.kind === 'rollover') {
        throw new Error(
            `Invalid lastModified "${value}" for ${context}: rolls over to ` +
            `${result.failure.became}. Check the day and month.`
        );
    }
    throw new Error(
        `Invalid lastModified "${value}" for ${context}. Expected ISO YYYY-MM-DD.`
    );
}

/**
 * Lenient parse for render paths, where one bad date should cost one
 * wrong-looking element rather than the whole static export.
 *
 * The strict version belongs at the data boundary (the registry, which is
 * evaluated once and can name the offending route). A component rendered on 25
 * pages should degrade instead of failing the build for the other 24.
 */
export function tryParseFreshnessDate(value: string): Date | null {
    const result = parseFreshness(value);
    return result.ok ? result.date : null;
}

/**
 * A route that has passed validation, carrying its already-parsed date.
 *
 * The parsed value is kept so consumers do not re-parse: `src/pages/sitemap.xml.ts` needs
 * a Date, and having it parse the same string a second time split one
 * responsibility across two files, where forgetting either half degrades
 * silently (no validation, or no error context).
 */
export interface ValidatedRoute extends SiteRoute {
    readonly lastModifiedDate: Date;
}

/**
 * Validates a route as it enters the registry, returning it with its parsed
 * date attached.
 *
 * Runs in production, not only in tests: routes derived from a data source do
 * not pass through the test fixtures, so a malformed slug or date arriving from
 * JSON would otherwise reach the sitemap unchecked.
 */
export function assertValidRoute(route: SiteRoute, context: string): ValidatedRoute {
    if (!ROUTE_PATH_PATTERN.test(route.path)) {
        throw new Error(
            `Invalid route path "${route.path}" for ${context}. ` +
            'Expected lowercase slug segments, e.g. "local-seo/gbp-optimization".'
        );
    }
    if (!route.labelKey) {
        throw new Error(`Route "${route.path}" (${context}) has no labelKey.`);
    }
    const lastModifiedDate = parseFreshnessDate(
        route.lastModified,
        `${context} route "${route.path || '/'}"`
    );
    return { ...route, lastModifiedDate };
}
