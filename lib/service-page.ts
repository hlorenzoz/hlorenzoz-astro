/**
 * Metadata + JSON-LD factory for Core 30 content pages.
 *
 * Mirrors `lib/legal-page.ts`, which does the same job for the three legal
 * pages: one config object per page, one place where canonical, hreflang,
 * OpenGraph and structured data are derived. Content pages are generated in
 * batches, so anything left to per-page discipline drifts by page five.
 *
 * The `kind` decides the schema shape rather than every page emitting a
 * generic `WebPage`:
 *   - 'category' -> CollectionPage + ItemList of its child services
 *   - 'service'  -> Service with provider and areaServed
 *   - 'article'  -> Article with author, publisher and freshness dates
 *
 * The config is a discriminated union, not one flat interface. Flat, it
 * accepted fields it then silently discarded: a category page could carry
 * `faq` and `areaServed` and a service page could carry `children`, all
 * compiling cleanly and all dropped at build time with no warning. Every such
 * combination is now a type error.
 */
import { pageMetadata, type PageMeta } from '@/lib/page-metadata';
import { breadcrumbTrail, childRoutes, findRoute } from '@/lib/routes';
import {
    ROUTE_PATH_PATTERN,
    parseFreshnessDate,
    type RouteTier,
    type SiteRoute,
    type ValidatedRoute,
} from '@/lib/routing';
import {
    articlePage,
    collectionPage,
    servicePage,
    type JsonLdObject,
    type SchemaPageRef,
} from '@/lib/schema';
import { absoluteUrl, metaDescription, SITE_NAME } from '@/lib/site-config';

export type ContentPageKind = 'category' | 'service' | 'location' | 'article';

/**
 * Which Core 30 tier produces which page kind, `null` for tiers that are not
 * content pages at all.
 *
 * `kind` and `tier` are the same fact recorded twice, and for three rounds
 * nothing reconciled them: a route the registry called `legal` could be built
 * as a `service` and emit a Service offering for a privacy policy. The config
 * keeps declaring `kind` rather than deriving it, because the discriminated
 * union is what makes a category carrying `areaServed` a compile error, and
 * trading that for a runtime check would be a downgrade. So `kind` stays and
 * must AGREE with the tier.
 *
 * A TOTAL record, not `Partial`. Under `Partial`, adding a member to
 * `RouteTier` compiled cleanly and made every page on that tier fail at build
 * time with no compile-time signal. Now a new tier is a type error until
 * someone decides, explicitly, whether it carries content.
 */
const TIER_TO_KIND: Record<RouteTier, ContentPageKind | null> = {
    home: null,
    category: 'category',
    service: 'service',
    location: 'location',
    supporting: 'article',
    page: null,
    legal: null,
};

/**
 * Which tier's children each kind links to: the Core 30 internal-linking mirror
 * as data.
 *
 * This exists because the mirror was half-built. A category emitted an ItemList
 * of its services, but a service emitted nothing, so every supporting post had
 * an inbound link from precisely nowhere. AGENTS.md was silent on that tier too
 * (it documented homepage, category and service links and stopped), so the code
 * and the methodology were incomplete in the same place.
 *
 * Also total, and for the same reason as `TIER_TO_KIND`: a new kind must state
 * what it links down to, even if the answer is "nothing".
 */
/** The tiers that actually carry content, derived so it cannot drift. */
const CONTENT_TIERS = (Object.keys(TIER_TO_KIND) as RouteTier[])
    .filter((tier) => TIER_TO_KIND[tier] !== null);

const KIND_TO_CHILD_TIER: Record<ContentPageKind, RouteTier | null> = {
    category: 'service',
    service: 'supporting',
    // Leaves. A location page is the bottom of its branch, and a supporting
    // post answers one question rather than grouping anything.
    location: null,
    article: null,
};

export interface FaqItem {
    question: string;
    answer: string;
}

/** Fields every content page carries, whatever its kind. */
interface ContentPageBase {
    /** Route path relative to the locale root, e.g. 'local-seo/gbp-optimization'. */
    path: string;
    /**
     * Title tag body, WITHOUT the site name: the factory appends it.
     *
     * Budget is `MAX_AUTHORED_TITLE` characters, not 60. The emitted tag is
     * this plus " | Lorenzoz Agency", and a 44-character title already produced
     * a 62-character tag that Google truncates in the SERP.
     */
    title: string;
    description: string;
    /** H1 / schema name. Defaults to `title`. */
    name?: string;
    /** Absolute CDN image URL. Falls back to the shared OG image. */
    image?: string;
    /** ISO date of first publication. Set once, never bumped on an edit. */
    datePublished?: string;
    /**
     * NOTE: there is deliberately no `dateModified` here.
     *
     * The last content change is already `SiteRoute.lastModified`, which drives
     * both sitemaps, so recording it a second time meant one fact in two files
     * kept in step by hand. AGENTS.md tried to manage that with a procedure,
     * and procedure-managed duplication is what fails: the value that reached
     * the schema could silently disagree with the value that reached
     * /sitemap.xml. It is derived from the route instead.
     */
    /** People Also Ask block, feeding both the accordion and FAQPage schema. */
    faq?: FaqItem[];
}

/**
 * A Core 30 category page: one per GBP secondary category.
 *
 * It declares no child list. The services beneath it are whatever routes name
 * this path as their `parent` in the registry, resolved by `childRoutes()`.
 *
 * A hand-written list was free to name paths that were malformed, unregistered,
 * or simply not under this category, and its labels were plain strings so the
 * Spanish page listed its services in English. Deriving fixes both: the same
 * `parent` chain that builds the breadcrumb upward builds the service list
 * downward, and the labels come from the registry `labelKey` like every other
 * label on the page.
 */
export interface CategoryPageConfig extends ContentPageBase {
    kind: 'category';
}

/** A Core 30 service page: one per individual GBP service. */
export interface ServicePageConfig extends ContentPageBase {
    kind: 'service';
    /** Cities or regions the service covers. */
    areaServed?: string[];
}

/**
 * A Core 30 location page: the primary category scoped to a geo landmark
 * ("Plumber Houston Heights").
 *
 * Shares the `Service` schema shape with a service page, but is NOT the same
 * config. Collapsing it into `kind: 'service'` meant the `location` tier existed
 * in the registry and evaporated in the factory: nothing at the type level
 * distinguished "Plumber Houston Heights" from "Emergency Drain Cleaning", and
 * the landmark that defines the page was an optional field it could omit.
 */
export interface LocationPageConfig extends ContentPageBase {
    kind: 'location';
    /**
     * The geo landmark this page targets. REQUIRED, unlike on a service page:
     * a location page without a place is just a service page.
     */
    areaServed: string[];
}

/** Supporting content: the People Also Ask posts under a service page. */
export interface ArticlePageConfig extends ContentPageBase {
    kind: 'article';
    /**
     * Required here, unlike the other kinds: an Article with no publication
     * date is not trustworthy. `dateModified` is not needed because the route
     * already carries it.
     */
    datePublished: string;
    /** Page the article covers, for entity association. */
    about?: SchemaPageRef;
}

export type ContentPageConfig =
    | CategoryPageConfig
    | ServicePageConfig
    | LocationPageConfig
    | ArticlePageConfig;

/**
 * A named link to a route. Used for the breadcrumb trail (ancestors) and for
 * the child list a page renders (descendants).
 *
 * Named for the shape rather than one of its uses: when this was `Crumb`, a
 * reader tracing a category's ItemList found its services typed as breadcrumb
 * entries and reasonably concluded the list was a trail.
 */
export interface LabelledLink {
    name: string;
    url: string;
}

/**
 * The slice of the route registry this factory needs.
 *
 * Injected rather than imported directly so tests can drive the factory with a
 * real-shaped registry instead of replacing the module. `vi.mock` on
 * `@/lib/routes` supplied three of its six exports, so a future read of
 * `ALL_ROUTES` would have failed with `undefined is not iterable` and looked
 * like a bug in production code. It also meant every test ran against a mock
 * written to match this implementation: a closed loop where both sides can
 * agree while diverging from the real registry.
 * `tests/lib/route-registry-contract.test.ts` holds them to one contract.
 */
export interface RouteRegistry {
    findRoute(path: string): ValidatedRoute | undefined;
    childRoutes(parent: string): ValidatedRoute[];
    breadcrumbTrail(path: string): ValidatedRoute[];
}

const LIVE_REGISTRY: RouteRegistry = { findRoute, childRoutes, breadcrumbTrail };

/** Resolves an i18n key to display text. `getTranslations()` satisfies this. */
export type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

/**
 * Longest authored title that still fits a ~60 character tag once
 * " | Lorenzoz Agency" is appended.
 */
export const MAX_AUTHORED_TITLE = 60 - ` | ${SITE_NAME}`.length;

/**
 * Builds the Core 30 breadcrumb trail for a page from the route registry.
 *
 * Module-private on purpose. Exported, it would invite a page to build crumbs
 * separately from its schema, reopening the divergence deriving them exists to
 * close. Pages reach it through `ContentPage.crumbs()`, bound to their config.
 */
function deriveCrumbs(
    registry: RouteRegistry,
    locale: string,
    path: string,
    translate: TranslateFn
): LabelledLink[] {
    return registry.breadcrumbTrail(path).map((route) => link(locale, route, translate));
}

/**
 * The child routes a page of this kind links down to, per `KIND_TO_CHILD_TIER`.
 *
 * Filtered by tier, not merely by parentage: under Core 30 a category groups
 * its SERVICES, so listing a `page` or `supporting` child among them is the
 * structural error the auditor would flag while the factory emitted it
 * silently.
 *
 * THE single expression for "what hangs below this page". The childless-category
 * guard calls it too, so the check and the rendered list cannot disagree: they
 * were two independent copies of the same filter, and a comment claimed
 * otherwise.
 */
function childrenOf(registry: RouteRegistry, kind: ContentPageKind, path: string): ValidatedRoute[] {
    const childTier = KIND_TO_CHILD_TIER[kind];
    if (!childTier) return [];
    return registry.childRoutes(path).filter((route) => route.tier === childTier);
}

function deriveChildLinks(
    registry: RouteRegistry,
    locale: string,
    cfg: ContentPageConfig,
    translate: TranslateFn
): LabelledLink[] {
    return childrenOf(registry, cfg.kind, cfg.path).map((route) => link(locale, route, translate));
}

function link(locale: string, route: SiteRoute, translate: TranslateFn): LabelledLink {
    return { name: translate(route.labelKey), url: absoluteUrl(locale, route.path) };
}

/**
 * Validates a content page config before anything is derived from it.
 *
 * Content pages are generated in batches from a data source, exactly like the
 * portfolio routes, so they get the same treatment those get in the registry:
 * checked where they enter, not only in a test fixture they never pass through.
 * Without this a generated `path: 'Local SEO/GBP'` would flow straight into the
 * canonical, the og:url and the schema url.
 */
function assertValidContentPage(registry: RouteRegistry, cfg: ContentPageConfig): ValidatedRoute {
    if (!ROUTE_PATH_PATTERN.test(cfg.path) || cfg.path === '') {
        throw new Error(
            `Invalid content page path "${cfg.path}". ` +
            'Expected lowercase slug segments, e.g. "local-seo/gbp-optimization".'
        );
    }

    // Registration is checked HERE, not only where breadcrumbs are built.
    // Enforcing it in the schema path alone meant metadata happily produced a
    // canonical for an unregistered page, so a page that hand-rolled its JSON-LD
    // shipped invisible to both sitemaps: exactly what this prevents.
    const route = registry.findRoute(cfg.path);
    if (!route) {
        throw new Error(
            `Content page "${cfg.path}" is not in the route registry, so it would ` +
            'appear in neither sitemap. Add it to STATIC_ROUTES in lib/routes.ts ' +
            'with its tier, labelKey and parent.'
        );
    }

    // `kind` and `tier` are the same fact in two files. Reconciling them is what
    // stops a legal-tier route emitting a Service offering for a privacy policy.
    const expectedKind = TIER_TO_KIND[route.tier];
    if (!expectedKind) {
        throw new Error(
            `Route "${cfg.path}" has tier "${route.tier}", which carries no content. ` +
            `Content pages live at tiers: ${CONTENT_TIERS.join(', ')}.`
        );
    }
    if (expectedKind !== cfg.kind) {
        throw new Error(
            `Content page "${cfg.path}" is declared kind "${cfg.kind}" but the ` +
            `registry records tier "${route.tier}", which means kind "${expectedKind}". ` +
            'The registry and the page config must agree about what the page is.'
        );
    }
    // Counts characters, not UTF-16 code units: `'🚀'.length` is 2 while the
    // SERP renders one glyph, so `.length` would reject a title shorter than
    // the budget and misreport its size in the error.
    const titleChars = [...cfg.title].length;
    if (titleChars > MAX_AUTHORED_TITLE) {
        throw new Error(
            `Title for "${cfg.path}" is ${titleChars} chars; the budget is ` +
            `${MAX_AUTHORED_TITLE}, because " | ${SITE_NAME}" is appended and the tag ` +
            'must stay near 60 characters or Google truncates it.'
        );
    }

    // The union already makes this required for articles at compile time. This
    // is the runtime half: content configs are generated from data, and data
    // does not pass through the type checker. `dateModified` is absent from the
    // check because it is no longer a config field: the route supplies it.
    if (cfg.kind === 'article' && !cfg.datePublished) {
        throw new Error(
            `Article page "${cfg.path}" needs a datePublished. ` +
            'A publication date is a trust signal, not an optional field.'
        );
    }

    // Same validator the route registry uses. Content pages come from the same
    // kind of generated data source, so "2026-7-1" has to fail here for the
    // same reason it fails there, rather than reaching the schema verbatim.
    if (cfg.datePublished) {
        parseFreshnessDate(cfg.datePublished, `content page "${cfg.path}" datePublished`);
    }

    // A category with no services is the "childless category page" antipattern
    // `gbp-site-architect` flags, measured against the same tier-filtered list
    // the page will actually render, so the check and the output cannot differ.
    // Calls the SAME function that builds the rendered list, so the guard and
    // the output cannot disagree. They used to be two copies of one filter.
    if (cfg.kind === 'category' && childrenOf(registry, cfg.kind, cfg.path).length === 0) {
        throw new Error(
            `Category page "${cfg.path}" has no service pages beneath it. ` +
            'Under Core 30 a category exists to group and link its services: ' +
            `register them with tier "service" and parent "${cfg.path}".`
        );
    }

    return route;
}

/**
 * Validates a page config once and returns its builders.
 *
 * A page needs both its metadata and its body, so a page that called the two
 * free functions revalidated the same config on every call:
 * the regex, the grapheme count, the registry lookup and both date parses, per
 * page per locale. Defining the page once at module scope validates once and
 * fails at import time, before any half-built page renders.
 *
 * ```ts
 * const page = defineContentPage({ path: 'local-seo', kind: 'category', ... });
 * // in the .astro frontmatter: <BaseLayout meta={page.metadata(locale)}>
 * ```
 */
export interface ContentPage {
    readonly config: ContentPageConfig;
    metadata(locale: string): PageMeta;
    schema(locale: string, translate: TranslateFn): JsonLdObject;
    /**
     * The pages one tier below this one, for the component to render as real
     * internal links: a category's services, a service's supporting posts.
     *
     * Exposed because schema alone does not build the Core 30 linking mirror.
     * A supporting post whose parent service links to it only in JSON-LD is
     * still an orphan in the HTML, which is where internal linking counts.
     */
    children(locale: string, translate: TranslateFn): LabelledLink[];
    /**
     * The breadcrumb trail, home first, for the component to render visibly.
     * Same function `schema()` builds its BreadcrumbList from, so the visible
     * trail and the marked-up one cannot disagree (Google's structured data
     * policy forbids marking up content readers cannot see).
     */
    crumbs(locale: string, translate: TranslateFn): LabelledLink[];
}

/**
 * @param registry Defaults to the live route registry. Injected so tests drive
 *   the factory with a real-shaped registry instead of replacing the module.
 */
export function defineContentPage(
    cfg: ContentPageConfig,
    registry: RouteRegistry = LIVE_REGISTRY
): ContentPage {
    // Validation returns the route, so the freshness date the schema emits is
    // literally the one the sitemap emits, not a copy kept in step by hand.
    const route = assertValidContentPage(registry, cfg);
    return {
        config: cfg,
        metadata: (locale) => buildMetadata(locale, cfg, route),
        schema: (locale, translate) => buildSchema(registry, locale, cfg, route, translate),
        children: (locale, translate) => deriveChildLinks(registry, locale, cfg, translate),
        crumbs: (locale, translate) => deriveCrumbs(registry, locale, cfg.path, translate),
    };
}

function buildMetadata(locale: string, cfg: ContentPageConfig, route: ValidatedRoute): PageMeta {
    return pageMetadata({
        locale,
        path: cfg.path,
        title: `${cfg.title} | ${SITE_NAME}`,
        description: metaDescription(cfg.description),
        image: cfg.image,
        imageAlt: cfg.name ?? cfg.title,
        type: cfg.kind === 'article' ? 'article' : 'website',
        publishedTime: cfg.datePublished,
        modifiedTime: route.lastModified,
    });
}

/**
 * @param translate Resolves a route's `labelKey`. Pass `getTranslations()`.
 *   Both the breadcrumb trail and the category's service list come from the
 *   registry rather than the config, so a page cannot declare a hierarchy that
 *   disagrees with its own place in the tree, and both localize.
 */
function buildSchema(
    registry: RouteRegistry,
    locale: string,
    cfg: ContentPageConfig,
    route: ValidatedRoute,
    translate: TranslateFn
): JsonLdObject {
    const crumbs = deriveCrumbs(registry, locale, cfg.path, translate);
    const children = deriveChildLinks(registry, locale, cfg, translate);
    const url = absoluteUrl(locale, cfg.path);
    const name = cfg.name ?? cfg.title;

    if (cfg.kind === 'article') {
        return articlePage({
            locale,
            headline: name,
            description: cfg.description,
            url,
            crumbs,
            datePublished: cfg.datePublished,
            dateModified: route.lastModified,
            image: cfg.image,
            about: cfg.about,
            faq: cfg.faq,
        });
    }

    if (cfg.kind === 'category') {
        return collectionPage({
            locale,
            name,
            description: cfg.description,
            url,
            items: children,
            crumbs,
            // A category page is a content page like any other: it carries the
            // author attribution and freshness dates the E-E-A-T contract
            // requires. Dropping them here was silent on all 5 to 10 of them.
            datePublished: cfg.datePublished,
            dateModified: route.lastModified,
            faq: cfg.faq,
        });
    }

    return servicePage({
        locale,
        name,
        description: cfg.description,
        url,
        areaServed: cfg.areaServed,
        crumbs,
        // The supporting posts beneath this service. A service page that lists
        // nothing leaves them orphaned.
        relatedPages: children,
        faq: cfg.faq,
        image: cfg.image,
        datePublished: cfg.datePublished,
        dateModified: route.lastModified,
    });
}
