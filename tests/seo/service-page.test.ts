/**
 * Contract tests for the Core 30 content factory.
 *
 * The registry is INJECTED, not mocked. `vi.mock('@/lib/routes')` replaced the
 * whole module with three of its six exports, so a later read of `ALL_ROUTES`
 * would have failed with "undefined is not iterable" and looked like a bug in
 * production code. Injection also means the fixture is an ordinary object held
 * to the same interface production uses, and
 * `tests/lib/route-registry-contract.test.ts` proves the live registry and
 * this fixture behave alike, so the two cannot quietly diverge.
 *
 * The fixture carries a real Core 30 shape because the live registry has none:
 * it holds only `home`, `page` and `legal` tiers until the first content page
 * ships. Testing against it would mean asserting Core 30 invariants using
 * portfolio routes, which is how an earlier fixture ended up declaring a
 * "category" on a `page`-tier route.
 */
import { describe, it, expect } from 'vitest';
import {
    MAX_AUTHORED_TITLE,
    defineContentPage,
    type ContentPageConfig,
} from '@/lib/service-page';
import { SCHEMA_IDS, absoluteUrl } from '@/lib/site-config';
import { schemaDateTime } from '@/lib/schema/datetime';
import { FIXTURE, FIXTURE_REGISTRY } from '@/tests/fixtures/core30-registry';

const page = (cfg: ContentPageConfig) => defineContentPage(cfg, FIXTURE_REGISTRY);
const contentPageMetadata = (locale: string, cfg: ContentPageConfig) => page(cfg).metadata(locale);
const contentPageSchema = (locale: string, cfg: ContentPageConfig, t: (k: string) => string) =>
    page(cfg).schema(locale, t);

type Graph = { '@graph': Array<Record<string, unknown>> };
const node = (g: unknown, type: string) =>
    (g as Graph)['@graph'].find((n) => n['@type'] === type);

/**
 * Resolves a route's labelKey the way `getTranslations()` does, minus i18n.
 * Returning the key keeps assertions readable and independent of copy edits.
 *
 * It does interpolate `{placeholders}`, because the offer notes are built
 * through this same function and asserting on their output requires the values
 * to actually land. The key itself stands in for the message template.
 */
const T = (key: string, values?: Record<string, string | number>) =>
    values
        ? `${key} ${Object.entries(values)
              .map(([k, v]) => `${k}=${v}`)
              .join(' ')}`
        : key;

/**
 * Fixtures use REGISTERED paths on purpose. `contentPageSchema` derives its
 * breadcrumbs from the route registry now, so an unregistered path throws:
 * a content page that is not registered is invisible to both sitemaps, and
 * that failure should be loud at build time.
 */

const SERVICE: ContentPageConfig = {
    path: 'local-seo/gbp',
    kind: 'service',
    title: 'GBP Optimization Ourense',
    description: 'Rank in the local pack for the searches that bring paying customers.',
    areaServed: ['Ourense', 'Xinzo de Limia'],
    faq: [{ question: 'How long does it take?', answer: 'Three to six months.' }],
};

const CATEGORY: ContentPageConfig = {
    path: 'local-seo',
    kind: 'category',
    title: 'Local SEO Ourense',
    description: 'Everything that makes a local business findable.',
};

const ARTICLE: ContentPageConfig = {
    path: 'local-seo/gbp/precios',
    kind: 'article',
    title: 'Cuanto cuesta el SEO local',
    description: 'Rangos de precio reales y que incluye cada tramo.',
    datePublished: '2026-07-01',
    about: { url: 'https://hlorenzoz.com/en/local-seo/gbp/', name: 'Local SEO pricing' },
};

describe('contentPageMetadata', () => {
    it.each([
        ['service', SERVICE],
        ['category', CATEGORY],
        ['article', ARTICLE],
    ])('emits og:url equal to the canonical for a %s page', (_kind, cfg) => {
        for (const locale of ['en', 'es']) {
            const m = contentPageMetadata(locale, cfg);
            expect(m.alternates?.canonical).toBe(absoluteUrl(locale, cfg.path));
            expect(m.openGraph?.url).toBe(m.alternates?.canonical);
        }
    });

    it('never inherits the layout OpenGraph block', () => {
        // The bug this guards: a page omitting `openGraph` inherits the
        // layout's, whose url pointed at the site root.
        const m = contentPageMetadata('en', SERVICE);
        expect(m.openGraph).toBeDefined();
        expect(m.openGraph?.url).not.toBe('https://hlorenzoz.com/');
    });

    it('carries hreflang for both locales plus x-default', () => {
        const m = contentPageMetadata('es', SERVICE);
        expect(m.alternates?.languages).toMatchObject({
            en: absoluteUrl('en', SERVICE.path),
            es: absoluteUrl('es', SERVICE.path),
            'x-default': absoluteUrl('en', SERVICE.path),
        });
    });

    it('maps the locale to the OpenGraph territory form', () => {
        expect(contentPageMetadata('es', SERVICE).openGraph?.locale).toBe('es_ES');
        expect(contentPageMetadata('en', SERVICE).openGraph?.locale).toBe('en_US');
    });

    it('marks only articles as og:type article, with both timestamps', () => {
        const article = contentPageMetadata('en', ARTICLE).openGraph as Record<string, unknown>;
        expect(article.type).toBe('article');
        expect(article.publishedTime).toBe('2026-07-01T00:00:00+02:00');
        // Comes from the ROUTE, not the config: one fact, one source.
        expect(article.modifiedTime).toBe('2026-07-12T00:00:00+02:00');
        expect((contentPageMetadata('en', SERVICE).openGraph as Record<string, unknown>).type)
            .toBe('website');
    });

    it('appends the site name once and keeps the description within meta length', () => {
        const m = contentPageMetadata('en', SERVICE);
        expect(m.title).toBe(`${SERVICE.title} | Lorenzoz Agency`);
        expect(String(m.description).length).toBeLessThanOrEqual(160);
    });

    it('falls back to the shared OG image when the page has none', () => {
        const imgs = contentPageMetadata('en', SERVICE).openGraph?.images as Array<{ url: string }>;
        expect(imgs[0].url).toContain('og-image.webp');
        const custom = contentPageMetadata('en', { ...SERVICE, image: 'https://cdn.x/y.webp' });
        expect((custom.openGraph?.images as Array<{ url: string }>)[0].url).toBe('https://cdn.x/y.webp');
    });
});

/**
 * The config was one flat interface across three kinds, so it accepted fields
 * it then discarded: category+faq, category+areaServed, service+children all
 * compiled and all vanished at build time. The union turns each into a compile
 * error; these guard the runtime half, which generated configs need because
 * data does not pass through the type checker.
 */
describe('assertValidContentPage', () => {
    it.each([
        ['Local SEO/GBP', 'uppercase and a space'],
        ['local seo', 'a space'],
        ['/local-seo', 'a leading slash'],
        ['', 'empty, which is the home route and not a content page'],
    ])('rejects the path "%s" (%s)', (path) => {
        expect(() => contentPageMetadata('en', { ...SERVICE, path }))
            .toThrow(/Invalid content page path/);
    });

    it('rejects a title that would overflow the tag once the suffix is added', () => {
        // 44 chars looked compliant against the old "under 60" budget and
        // produced a 62-char tag that Google truncates.
        const long = 'Google Business Profile Optimization Ourense';
        expect(long.length).toBeGreaterThan(MAX_AUTHORED_TITLE);
        expect(() => contentPageMetadata('en', { ...SERVICE, title: long }))
            .toThrow(/the budget is 42/);
    });

    it('accepts a title exactly at the budget and keeps the tag near 60', () => {
        const exact = 'a'.repeat(MAX_AUTHORED_TITLE);
        const m = contentPageMetadata('en', { ...SERVICE, title: exact });
        expect(String(m.title).length).toBe(60);
    });

    it('rejects an article missing its freshness dates at runtime', () => {
        // The union covers authored code; this covers generated configs.
        const { datePublished: _p, ...undated } = ARTICLE;
        expect(() => contentPageSchema('en', undated as ContentPageConfig, T))
            .toThrow(/needs a datePublished/);
    });

    it.each([
        ['yesterday', 'free text'],
        ['2026-7-1', 'single-digit month'],
        ['01-07-2026', 'day-first'],
        ['2026-02-31', 'rolls over into March'],
    ])('rejects the malformed date "%s" (%s) instead of emitting it verbatim', (bad) => {
        // These used to flow straight into Article.datePublished. Route dates
        // were held to `parseFreshnessDate` while content dates, from the same
        // kind of generated source, were held to nothing.
        expect(() => contentPageMetadata('en', { ...ARTICLE, datePublished: bad }))
            .toThrow(/Invalid lastModified/);
    });

    it('names which date field is wrong, and on which page', () => {
        expect(() => contentPageMetadata('en', { ...ARTICLE, datePublished: 'nope' }))
            .toThrow(/content page "local-seo\/gbp\/precios" datePublished/);
    });

    /**
     * `kind` and `tier` are the same fact recorded in two files. For three
     * rounds nothing reconciled them, so a route the registry called `legal`
     * could be built as a `service` and emit a Service offering for a privacy
     * policy.
     */
    it('rejects a kind that contradicts the registry tier', () => {
        expect(() => contentPageMetadata('en', { ...SERVICE, path: 'local-seo' }))
            .toThrow(/declared kind "service" but the registry records tier "category"/);
        expect(() => contentPageMetadata('en', { ...CATEGORY, path: 'local-seo/gbp' }))
            .toThrow(/declared kind "category" but the registry records tier "service"/);
    });

    it.each([
        ['privacy-policy', 'legal'],
        ['portfolio', 'page'],
        ['', 'home'],
    ])('refuses to build a content page on the non-content route "%s" (%s tier)', (path) => {
        // A privacy policy built as a service emitted a Service node with a
        // provider and an areaServed. These tiers are not Core 30 content.
        expect(() => contentPageMetadata('en', { ...SERVICE, path }))
            .toThrow(/carries no content|Invalid content page path/);
    });

    it('accepts each kind on its matching tier', () => {
        for (const cfg of [SERVICE, CATEGORY, ARTICLE]) {
            expect(() => contentPageMetadata('en', cfg), `${cfg.kind} on its own tier`)
                .not.toThrow();
        }
    });

    it('rejects a service config on a location-tier route', () => {
        // The previous version of this test claimed to cover the location tier
        // while building on 'local-seo/citations', which the fixture declares
        // as tier 'service'. The location branch was never executed, so
        // deleting it would not have failed anything.
        expect(() => contentPageMetadata('en', { ...SERVICE, path: 'zonas/ourense' }))
            .toThrow(/declared kind "service" but the registry records tier "location"/);
    });

    it('rejects a category whose children exist but are all mis-tiered', () => {
        // The guard and the rendered list must be ONE expression. They were two
        // copies of the same filter, and a comment claimed otherwise. Counting
        // children without filtering would pass this category and then render
        // an empty ItemList.
        expect(FIXTURE.filter((r) => r.parent === 'mistiered-category').length).toBe(1);
        expect(() => contentPageMetadata('en', { ...CATEGORY, path: 'mistiered-category' }))
            .toThrow(/has no service pages beneath it/);
    });

    it('rejects a category with no SERVICE pages beneath it', () => {
        // 'empty-category' is tier 'category' with nothing beneath it, so the
        // kind/tier check passes and this one fires.
        expect(() => contentPageMetadata('en', { ...CATEGORY, path: 'empty-category' }))
            .toThrow(/has no service pages beneath it/);
    });

    it('measures the title in characters, not UTF-16 code units', () => {
        // '(rocket)' is one glyph in a SERP but two code units, so `.length`
        // would spend two of the 42-character budget on it.
        const astral = `${'a'.repeat(MAX_AUTHORED_TITLE - 1)}\u{1F680}`;
        expect([...astral].length).toBe(MAX_AUTHORED_TITLE);
        expect(astral.length).toBeGreaterThan(MAX_AUTHORED_TITLE);
        expect(() => contentPageMetadata('en', { ...SERVICE, title: astral })).not.toThrow();
    });
});

/**
 * Breadcrumbs are derived from the route registry, never handed in. A
 * hand-built trail can contradict the page's own place in the hierarchy, and
 * Core 30's internal-linking rule IS the hierarchy.
 */
/**
 * `dateModified` used to live on the config AND as `lastModified` on the route:
 * one fact in two files, kept in step by a procedure in AGENTS.md. The schema
 * date could silently disagree with the sitemap date. It is derived now.
 */
describe('freshness date comes from the registry', () => {
    it.each([
        ['service', SERVICE, '2026-07-10'],
        ['category', CATEGORY, '2026-07-05'],
        ['article', ARTICLE, '2026-07-12'],
    ])('a %s page reports its route lastModified in schema', (_kind, cfg, expected) => {
        const g = contentPageSchema('en', cfg, T) as Graph;
        const main = g['@graph'].find((n) =>
            ['WebPage', 'CollectionPage', 'Article'].includes(n['@type'] as string)
        );
        expect(main?.dateModified).toBe(schemaDateTime(expected));
    });

    it('emits og modifiedTime only for articles, where the spec defines it', () => {
        // `article:modified_time` is an article-namespace property; og:type
        // "website" has no standard modified time, so Next drops it.
        const article = contentPageMetadata('en', ARTICLE).openGraph as Record<string, unknown>;
        expect(article.modifiedTime).toBe('2026-07-12T00:00:00+02:00');
        const service = contentPageMetadata('en', SERVICE).openGraph as Record<string, unknown>;
        expect(service.type).toBe('website');
        expect(service.modifiedTime).toBeUndefined();
    });

    it('cannot be overridden by the config, because the config has no such field', () => {
        // A stray `dateModified` is now a compile error; at runtime it is
        // simply ignored, so the schema and the sitemap cannot disagree.
        const sneaky = { ...SERVICE, dateModified: '1999-01-01' } as ContentPageConfig;
        const g = contentPageSchema('en', sneaky, T) as Graph;
        const page = g['@graph'].find((n) => n['@type'] === 'WebPage');
        expect(page?.dateModified).toBe('2026-07-10T00:00:00+02:00');
    });

    it('matches what the sitemap would report for the same route', () => {
        const route = FIXTURE.find((r) => r.path === 'local-seo/gbp');
        const g = contentPageSchema('en', SERVICE, T) as Graph;
        const page = g['@graph'].find((n) => n['@type'] === 'WebPage');
        expect(page?.dateModified).toBe(schemaDateTime(route!.lastModified));
    });
});

describe('breadcrumb derivation', () => {
    it('builds the trail from the registry, rooted at home', () => {
        const g = contentPageSchema('en', SERVICE, T) as Graph;
        const crumbs = node(g, 'BreadcrumbList')?.itemListElement as { item: string }[];
        expect(crumbs.map((c) => c.item)).toEqual([
            absoluteUrl('en', ''),
            absoluteUrl('en', 'local-seo'),
            absoluteUrl('en', 'local-seo/gbp'),
        ]);
    });

    it('resolves each crumb label through the registry labelKey', () => {
        const g = contentPageSchema('en', SERVICE, T) as Graph;
        const crumbs = node(g, 'BreadcrumbList')?.itemListElement as { name: string }[];
        // `T` echoes the key, so this proves the labels come from the registry
        // rather than from anything the page config supplied.
        expect(crumbs[0].name).toBe('navigation.home');
        expect(crumbs[1].name).toBe('services.localSeo.title');
    });

    it('localizes the crumb URLs', () => {
        const g = contentPageSchema('es', SERVICE, T) as Graph;
        const crumbs = node(g, 'BreadcrumbList')?.itemListElement as { item: string }[];
        expect(crumbs[0].item).toBe(absoluteUrl('es', ''));
    });

    it('refuses to build a page that is not in the route registry', () => {
        // An unregistered content page is invisible to both sitemaps. Failing
        // loudly at build time beats shipping an unreachable page.
        expect(() => contentPageSchema('en', { ...SERVICE, path: 'local-seo/unregistered' }, T))
            .toThrow(/not in the route registry/);
    });
});

describe('contentPageSchema', () => {
    it('builds a Service graph linked to the WebPage by @id', () => {
        const g = contentPageSchema('en', SERVICE, T);
        const url = absoluteUrl('en', SERVICE.path);
        const page = node(g, 'WebPage');
        const service = node(g, 'Service');

        expect(service?.['@id']).toBe(`${url}#service`);
        // Without this link the two nodes are unrelated things asserting the
        // same URL, and a consumer has to guess how they relate.
        expect((page?.mainEntity as Record<string, unknown>)['@id']).toBe(service?.['@id']);
        expect((service?.provider as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
        expect((page?.author as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
    });

    /**
     * Every service page shows a price to the reader. Until this existed, none
     * of them emitted one: the `Service` node carried no `offers` at all, so a
     * crawler read a page about a service whose cost was invisible to it. The
     * home page's OfferCatalog only covers the three tiers it features, which
     * left the other services priced on screen and unpriced in the graph.
     */
    it('emits the offer on a service page that has a published price', () => {
        const priced = {
            ...SERVICE,
            offer: { role: 'core' as const, base: { amount: 750, recurrence: 'month' as const } },
        };
        const service = node(contentPageSchema('en', priced, T), 'Service');
        const offer = service?.offers as Record<string, unknown>;

        expect(offer['@type']).toBe('Offer');
        const spec = offer.priceSpecification as Record<string, unknown>;
        expect(spec['@type']).toBe('UnitPriceSpecification');
        expect(spec.price).toBe('750');
        // Before tax, like every figure the site publishes.
        expect(spec.valueAddedTaxIncluded).toBe(false);
    });

    it('omits offers on a service page with no published price', () => {
        expect(node(contentPageSchema('en', SERVICE, T), 'Service')?.offers).toBeUndefined();
    });

    /**
     * Software is priced as a floor. It used to be "quoted", which emitted no
     * offer at all; a floor published as `price` would be the opposite mistake,
     * stating that every project costs exactly the starting figure.
     */
    it('emits a floor as minPrice on a service priced "from"', () => {
        const floor = {
            ...SERVICE,
            offer: { role: 'addOn' as const, base: { amount: 20000, recurrence: 'once' as const, from: true } },
        };
        const offer = node(contentPageSchema('en', floor, T), 'Service')?.offers as Record<string, unknown>;
        const spec = offer.priceSpecification as Record<string, unknown>;

        expect(spec.minPrice).toBe('20000');
        expect(spec.price).toBeUndefined();
        expect(String(offer.description)).toContain('offer.from');
    });

    /**
     * The offer notes are built through the page's own `translate`, so they come
     * out in the page's language. When `lib/schema` assembled them itself it did
     * so in hardcoded English, and the Spanish pages shipped an English sentence
     * with Spanish nouns in it. The discount note has to NAME the core offer,
     * and that name is looked up through the same translator rather than
     * leaking the `localSeo` key.
     */
    it('states the terms of an optional service through the page translator', () => {
        const optional = {
            ...SERVICE,
            offer: { role: 'addOn' as const, base: { amount: 350, recurrence: 'month' as const } },
        };
        const offer = node(contentPageSchema('en', optional, T), 'Service')?.offers as Record<string, unknown>;
        const description = String(offer.description);

        expect(description).toContain('offer.bundleDiscount discount=30 name=services.localSeo.name');
        expect(description).toContain('offer.upfront upfront=50');
        expect(description).toContain('offer.beforeTax');
        expect(description).not.toMatch(/trial/i);
    });

    it('does not offer the core plan a discount on itself', () => {
        const core = {
            ...SERVICE,
            offer: { role: 'core' as const, base: { amount: 750, recurrence: 'month' as const } },
        };
        const offer = node(contentPageSchema('en', core, T), 'Service')?.offers as Record<string, unknown>;
        expect(String(offer.description)).not.toContain('offer.bundleDiscount');
    });

    it('carries areaServed and the FAQ block on a service page', () => {
        const g = contentPageSchema('en', SERVICE, T) as Graph;
        expect(node(g, 'Service')?.areaServed).toEqual([
            { '@type': 'City', name: 'Ourense' },
            { '@type': 'City', name: 'Xinzo de Limia' },
        ]);
        expect(g['@graph'].some((n) => n['@type'] === 'FAQPage')).toBe(true);
    });

    /**
     * A category page is a content page like any other. Routing it to
     * `collectionPage()` used to drop the author and both dates silently, so
     * every one of the 5 to 10 category pages a Core 30 site carries failed the
     * E-E-A-T contract the agent declares mandatory, with nothing reporting it.
     */
    it('gives a category page the same author attribution as the other kinds', () => {
        const dated = { ...CATEGORY, datePublished: '2026-07-01' };
        const collection = node(contentPageSchema('en', dated, T), 'CollectionPage');

        expect((collection?.author as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
        expect((collection?.publisher as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
        expect(collection?.datePublished).toBe('2026-07-01T00:00:00+02:00');
        expect(collection?.dateModified).toBe('2026-07-05T00:00:00+02:00');
    });

    it('emits the PAA block on a category page too', () => {
        const withFaq = { ...CATEGORY, faq: [{ question: 'q', answer: 'a' }] };
        const g = contentPageSchema('en', withFaq, T) as Graph;
        expect(g['@graph'].some((n) => n['@type'] === 'FAQPage')).toBe(true);
    });

    it('names an accountable author on every page kind', () => {
        // The Expertise half of E-E-A-T, asserted across the whole union so a
        // new kind cannot be added without it.
        for (const cfg of [SERVICE, CATEGORY, ARTICLE]) {
            const s = JSON.stringify(contentPageSchema('en', cfg, T));
            expect(s, `${cfg.kind} page has no author`).toContain(SCHEMA_IDS.person);
        }
    });

    it('takes its list from the registry, not from a declared array', () => {
        // The config declares no children at all: these come from the routes
        // that name this path as their `parent`.
        const expected = FIXTURE.filter((r) => r.parent === CATEGORY.path && r.tier === 'service');
        expect(expected.length).toBeGreaterThan(0);

        const g = contentPageSchema('en', CATEGORY, T);
        const list = node(g, 'CollectionPage')?.mainEntity as {
            numberOfItems: number;
            itemListElement: { url: string; name: string }[];
        };

        expect(list.numberOfItems).toBe(expected.length);
        expect(list.itemListElement.map((i) => i.url))
            .toEqual(expected.map((r) => absoluteUrl('en', r.path)));
    });

    it('localizes the child names, like the crumb names', () => {
        // A hand-written `children` list carried plain strings, so the Spanish
        // page listed its services in English inside a page whose inLanguage
        // said `es`. Labels now resolve through the same translate the crumbs
        // use, which `T` makes visible by echoing the key.
        for (const locale of ['en', 'es']) {
            const g = contentPageSchema(locale, CATEGORY, (k) => `[${locale}]${k}`);
            const list = node(g, 'CollectionPage')?.mainEntity as {
                itemListElement: { name: string; url: string }[];
            };
            expect(list.itemListElement[0].name).toMatch(new RegExp(`^\\[${locale}\\]`));
            expect(list.itemListElement[0].url).toBe(absoluteUrl(locale, 'local-seo/gbp'));
        }
    });

    it('lists only SERVICE-tier children, not every child', () => {
        // 'local-seo' has two service children and one page-tier child. Under
        // Core 30 a category groups its services; listing a page-tier route as
        // one of them is the structural error the auditor would flag while the
        // factory emitted it silently.
        const all = FIXTURE.filter((r) => r.parent === 'local-seo');
        const services = all.filter((r) => r.tier === 'service');
        expect(all.length).toBeGreaterThan(services.length);

        const g = contentPageSchema('en', CATEGORY, T);
        const list = node(g, 'CollectionPage')?.mainEntity as {
            numberOfItems: number;
            itemListElement: { url: string }[];
        };
        expect(list.numberOfItems).toBe(services.length);
        expect(list.itemListElement.map((i) => i.url))
            .toEqual(services.map((r) => absoluteUrl('en', r.path)));
    });

    it('cannot emit a malformed child URL, because it cannot invent one', () => {
        // A declared child path went into the ItemList unchecked and produced
        // "https://hlorenzoz.com/en/Does Not Exist/BAD PATH/".
        const g = contentPageSchema('en', CATEGORY, T);
        const list = node(g, 'CollectionPage')?.mainEntity as { itemListElement: { url: string }[] };
        for (const item of list.itemListElement) {
            expect(item.url).not.toMatch(/\s/);
            expect(item.url).toBe(new URL(item.url).toString());
        }
    });

    it('builds an Article with both freshness dates for supporting content', () => {
        const article = node(contentPageSchema('es', ARTICLE, T), 'Article');
        expect(article?.datePublished).toBe('2026-07-01T00:00:00+02:00');
        // dateModified is the route's lastModified, so the schema date and the
        // sitemap date are the same value rather than two copies.
        expect(article?.dateModified).toBe('2026-07-12T00:00:00+02:00');
        expect(article?.mainEntityOfPage).toBe(absoluteUrl('es', ARTICLE.path));
        expect((article?.author as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
    });

    it('always includes a breadcrumb', () => {
        for (const cfg of [SERVICE, CATEGORY, ARTICLE]) {
            const g = contentPageSchema('en', cfg, T) as Graph;
            expect(g['@graph'].some((n) => n['@type'] === 'BreadcrumbList'), cfg.kind).toBe(true);
        }
    });

    it('never emits fabricated review markup for any page kind', () => {
        for (const cfg of [SERVICE, CATEGORY, ARTICLE]) {
            const s = JSON.stringify(contentPageSchema('en', cfg, T));
            expect(s).not.toContain('AggregateRating');
            expect(s).not.toContain('ratingValue');
        }
    });

    it('keeps the schema url identical to the metadata canonical', () => {
        // The two are built from the same `path`, and this is what proves it.
        for (const cfg of [SERVICE, CATEGORY, ARTICLE]) {
            for (const locale of ['en', 'es']) {
                const canonical = contentPageMetadata(locale, cfg).alternates?.canonical;
                const g = contentPageSchema(locale, cfg, T) as Graph;
                const main = g['@graph'].find((n) =>
                    n['@type'] === 'WebPage' || n['@type'] === 'CollectionPage' || n['@type'] === 'Article'
                );
                expect(main?.url ?? main?.mainEntityOfPage).toBe(canonical);
            }
        }
    });
});

/**
 * A location page is the primary category scoped to a geo landmark. It shares
 * the `Service` schema shape with a service page but is NOT the same config:
 * collapsing it into `kind: 'service'` meant the tier existed in the registry
 * and evaporated in the factory, and the landmark that defines the page was an
 * optional field it could omit.
 */
describe('location pages', () => {
    const LOCATION: ContentPageConfig = {
        path: 'zonas/ourense',
        kind: 'location',
        title: 'Marketing en Ourense',
        description: 'Como trabajamos con negocios de Ourense capital.',
        areaServed: ['Ourense'],
    };

    it('builds on a location-tier route', () => {
        expect(() => contentPageMetadata('en', LOCATION)).not.toThrow();
    });

    it('emits the Service schema shape, carrying its landmark', () => {
        const service = node(contentPageSchema('en', LOCATION, T), 'Service');
        expect(service).toBeDefined();
        expect(service?.areaServed).toEqual([{ '@type': 'City', name: 'Ourense' }]);
        expect((service?.provider as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
    });

    it('is a leaf: it links no children', () => {
        expect(page(LOCATION).children('en', T)).toEqual([]);
    });

    it('cannot be declared on a service-tier route', () => {
        expect(() => contentPageMetadata('en', { ...LOCATION, path: 'local-seo/gbp' }))
            .toThrow(/declared kind "location" but the registry records tier "service"/);
    });
});

/**
 * The Core 30 linking mirror was half-built: a category emitted an ItemList of
 * its services, and a service emitted nothing, so every supporting post had an
 * inbound link from precisely nowhere. AGENTS.md was silent on that tier too.
 */
describe('a service page links the supporting content beneath it', () => {
    it('exposes its supporting posts for the component to render', () => {
        const links = page(SERVICE).children('en', T);
        expect(links.map((l) => l.url)).toEqual([
            absoluteUrl('en', 'local-seo/gbp/precios'),
            absoluteUrl('en', 'local-seo/gbp/plazos'),
        ]);
    });

    it('localizes those links, like the crumbs', () => {
        const links = page(SERVICE).children('es', (k) => `[es]${k}`);
        expect(links[0].name).toBe('[es]services.localSeo.precios.title');
        expect(links[0].url).toBe(absoluteUrl('es', 'local-seo/gbp/precios'));
    });

    it('emits them in the schema as significantLink', () => {
        const webPage = node(contentPageSchema('en', SERVICE, T), 'WebPage');
        expect(webPage?.significantLink).toEqual([
            absoluteUrl('en', 'local-seo/gbp/precios'),
            absoluteUrl('en', 'local-seo/gbp/plazos'),
        ]);
    });

    it('omits significantLink when a service has no supporting content', () => {
        const bare = { ...SERVICE, path: 'local-seo/citations' };
        const webPage = node(contentPageSchema('en', bare, T), 'WebPage');
        expect(webPage).not.toHaveProperty('significantLink');
    });

    it('links supporting posts, never sibling services', () => {
        // A service must not list its siblings: that is the category's job.
        const urls = page(SERVICE).children('en', T).map((l) => l.url);
        expect(urls).not.toContain(absoluteUrl('en', 'local-seo/citations'));
    });
});

describe('an article is a leaf', () => {
    it('links no children', () => {
        expect(page(ARTICLE).children('en', T)).toEqual([]);
    });
});
