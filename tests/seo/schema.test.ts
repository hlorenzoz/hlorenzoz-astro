import { describe, it, expect } from 'vitest';
import { absoluteUrl, languageAlternates, metaDescription, SCHEMA_IDS } from '@/lib/site-config';
import {
    organizationGraph,
    organizationOffers,
    offerCatalog,
    breadcrumb,
    faqPage,
    serviceList,
    collectionPage,
    portfolioDetail,
    profilePage,
    webPage,
    servicePage,
    articlePage,
    newsArticle,
} from '@/lib/schema';
import type { CatalogEntry } from '@/lib/schema';
import type { ServiceOffer } from '@/lib/pricing';
import sitemap from '@/app/sitemap';

describe('absoluteUrl (canonical URL builder)', () => {
    it('emits locale prefix + trailing slash for the home path', () => {
        expect(absoluteUrl('en')).toBe('https://hlorenzoz.com/en/');
        expect(absoluteUrl('es')).toBe('https://hlorenzoz.com/es/');
    });

    it('normalizes leading/trailing slashes on nested paths', () => {
        expect(absoluteUrl('en', 'portfolio')).toBe('https://hlorenzoz.com/en/portfolio/');
        expect(absoluteUrl('es', '/portfolio/')).toBe('https://hlorenzoz.com/es/portfolio/');
        expect(absoluteUrl('en', 'portfolio/real-estate')).toBe('https://hlorenzoz.com/en/portfolio/real-estate/');
    });

    it('languageAlternates includes en, es and x-default', () => {
        expect(languageAlternates('privacy-policy')).toEqual({
            en: 'https://hlorenzoz.com/en/privacy-policy/',
            es: 'https://hlorenzoz.com/es/privacy-policy/',
            'x-default': 'https://hlorenzoz.com/en/privacy-policy/',
        });
    });

    it('metaDescription truncates long text with three ASCII dots', () => {
        expect(metaDescription('short')).toBe('short');
        const long = 'a'.repeat(200);
        const out = metaDescription(long);
        expect(out.length).toBeLessThanOrEqual(160);
        expect(out.endsWith('...')).toBe(true);
    });

    it('metaDescription never returns more than the max it was given', () => {
        // A negative `slice` end counts from the END of the string instead of
        // truncating, so metaDescription('abcdef', 2) used to return 'abcde...'
        // - 8 characters for a requested max of 2, inverting the guard.
        for (const max of [0, 1, 2, 3, 4, 10, 160]) {
            const out = metaDescription('abcdefghijklmnopqrstuvwxyz'.repeat(20), max);
            expect(out.length, `max=${max} produced ${out.length} chars: "${out}"`)
                .toBeLessThanOrEqual(max);
        }
    });

    it('metaDescription emits no non-ASCII characters, per the AGENTS.md ban', () => {
        // This helper feeds every page's description and og:description, so one
        // ellipsis character here would land in the head of the whole site.
        const out = metaDescription('a'.repeat(200));
        const nonAscii = [...out].filter((ch) => (ch.codePointAt(0) ?? 0) > 127);
        expect(nonAscii, `non-ASCII characters emitted: ${nonAscii.join('')}`).toEqual([]);
    });
});

describe('sitemap ↔ canonical parity (regression)', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    it('every URL carries the locale prefix and a trailing slash', () => {
        for (const url of urls) {
            expect(url).toMatch(/^https:\/\/hlorenzoz\.com\/(en|es)\//);
            expect(url.endsWith('/')).toBe(true);
        }
    });

    it('includes the portfolio index and per-slug detail routes', () => {
        expect(urls).toContain('https://hlorenzoz.com/en/portfolio/');
        expect(urls).toContain('https://hlorenzoz.com/en/portfolio/real-estate/');
        expect(urls).toContain('https://hlorenzoz.com/es/portfolio/real-estate/');
    });

    it('matches the canonicals the pages declare (no drift)', () => {
        // These are the exact canonical values asserted in metadata.test.ts.
        expect(urls).toContain('https://hlorenzoz.com/en/card/hector/');
        expect(urls).toContain('https://hlorenzoz.com/en/privacy-policy/');
        expect(urls).toContain('https://hlorenzoz.com/en/');
    });
});

describe('JSON-LD builders', () => {
    it('organizationGraph links Organization, WebSite and Person by @id', () => {
        const graph = organizationGraph({ locale: 'en' }) as { '@graph': Array<Record<string, unknown>> };
        const nodes = graph['@graph'];
        const org = nodes.find((n) => n['@type'] === 'ProfessionalService');
        const site = nodes.find((n) => n['@type'] === 'WebSite');
        const person = nodes.find((n) => n['@type'] === 'Person');

        expect(org?.['@id']).toBe(SCHEMA_IDS.organization);
        expect(site?.['@id']).toBe(SCHEMA_IDS.website);
        expect(person?.['@id']).toBe(SCHEMA_IDS.person);
        expect((site?.publisher as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
        expect((person?.worksFor as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
    });

    it('declares the served markets as Country entities, not the local address', () => {
        const graph = organizationGraph({ locale: 'en' }) as { '@graph': Array<Record<string, unknown>> };
        const org = graph['@graph'].find((n) => n['@type'] === 'ProfessionalService');
        const areas = org?.areaServed as Array<Record<string, unknown>>;

        // The agency is an online provider: areaServed is the countries it
        // serves, not the town it is registered in. Every entry is a Country,
        // and the registration town must not leak in as a served area.
        expect(areas.length).toBeGreaterThan(0);
        for (const area of areas) {
            expect(area['@type']).toBe('Country');
        }
        const names = areas.map((a) => a.name);
        expect(names).toContain('United States');
        expect(names).toContain('Spain');
        expect(names).not.toContain('Xinzo de Limia');

        // address stays the physical registration, distinct from areaServed.
        expect((org?.address as Record<string, unknown>).addressLocality).toBe('Xinzo de Limia');
    });

    it('shared @id entities keep a stable (default-locale) url regardless of page locale', () => {
        const en = organizationGraph({ locale: 'en' }) as { '@graph': Array<Record<string, unknown>> };
        const es = organizationGraph({ locale: 'es' }) as { '@graph': Array<Record<string, unknown>> };
        const orgUrl = (g: typeof en) => g['@graph'].find((n) => n['@type'] === 'ProfessionalService')?.url;
        const personUrl = (g: typeof en) => g['@graph'].find((n) => n['@type'] === 'Person')?.url;
        // Same @id must not advertise a different url across locales.
        expect(orgUrl(en)).toBe(orgUrl(es));
        expect(orgUrl(en)).toBe('https://hlorenzoz.com/en/');
        expect(personUrl(en)).toBe(personUrl(es));
        expect(personUrl(en)).toBe('https://hlorenzoz.com/en/card/hector/');
    });

    type Spec = Record<string, unknown>;
    /** The priceSpecification of a one-entry catalogue, single or array as emitted. */
    const specOf = (offer: ServiceOffer, extra: Partial<CatalogEntry> = {}) =>
        (offerCatalog([{ name: 'X', offer, ...extra }]) as { itemListElement: Array<Record<string, unknown>> })
            .itemListElement[0];

    it('offerCatalog emits a one-time base as an exact EUR PriceSpecification', () => {
        const spec = specOf({ role: 'addOn', base: { amount: 2500, recurrence: 'once' } }).priceSpecification as Spec;
        expect(spec['@type']).toBe('PriceSpecification');
        expect(spec.price).toBe('2500');
        expect(spec.priceCurrency).toBe('EUR');
        expect(spec.minPrice).toBeUndefined();
    });

    /**
     * The case that forced this builder to stop treating `price` as a one-off.
     *
     * The voice receptionist is billed monthly with no setup fee. Under the old
     * string parser its price string would have produced a single
     * `PriceSpecification`, publishing a one-time charge for a subscription: a
     * false price claim in the structured data, and the kind of mismatch
     * between page and markup that Google treats as a trust problem rather than
     * a typo.
     */
    it('offerCatalog emits a monthly base as a recurring UnitPriceSpecification only', () => {
        const spec = specOf({ role: 'core', base: { amount: 750, recurrence: 'month' } }).priceSpecification as Spec;

        expect(spec['@type']).toBe('UnitPriceSpecification');
        expect(spec.price).toBe('750');
        expect((spec.referenceQuantity as Spec).unitCode).toBe('MON');
        // Emphatically NOT a one-time charge.
        expect(Array.isArray(spec)).toBe(false);
    });

    /**
     * "From 20000" is where quotes start. Emitted as `price`, the structured
     * data would state that every project costs exactly 20000.
     */
    it('offerCatalog represents a floor as minPrice, not as an exact price', () => {
        const spec = specOf({ role: 'addOn', base: { amount: 20000, recurrence: 'once', from: true } })
            .priceSpecification as Spec;
        expect(spec.minPrice).toBe('20000');
        expect(spec.price).toBeUndefined();
    });

    /**
     * Every published figure is before tax, and the copy marks each one. The
     * structured data has to say the same, or a consumer assumes the number is
     * what the client pays.
     */
    it('offerCatalog declares every price as excluding VAT', () => {
        const node = specOf({
            role: 'addOn',
            base: { amount: 2500, recurrence: 'once' },
            addOns: [{ amount: 49, recurrence: 'month', optional: true }],
        });
        const specs = node.priceSpecification as Spec[];
        expect(specs).toHaveLength(2);
        for (const spec of specs) expect(spec.valueAddedTaxIncluded).toBe(false);

        const floor = specOf({ role: 'addOn', base: { amount: 20000, recurrence: 'once', from: true } })
            .priceSpecification as Spec;
        expect(floor.valueAddedTaxIncluded).toBe(false);
    });

    it('offerCatalog pairs a one-time base with an optional monthly add-on', () => {
        const specs = specOf({
            role: 'addOn',
            base: { amount: 2500, recurrence: 'once' },
            addOns: [{ amount: 49, recurrence: 'month', optional: true }],
        }).priceSpecification as Spec[];
        expect(Array.isArray(specs)).toBe(true);

        const setup = specs.find((s) => s['@type'] === 'PriceSpecification');
        const monthly = specs.find((s) => s['@type'] === 'UnitPriceSpecification');
        expect(setup?.price).toBe('2500');
        expect(monthly?.price).toBe('49');
        expect(monthly?.priceCurrency).toBe('EUR');
        expect((monthly?.referenceQuantity as Spec).unitCode).toBe('MON');
        expect(String(monthly?.description ?? '')).toMatch(/optional/i);
    });

    it('offerCatalog does not flag a mandatory recurring charge as optional', () => {
        const specs = specOf({
            role: 'addOn',
            base: { amount: 100, recurrence: 'once' },
            addOns: [{ amount: 10, recurrence: 'month' }],
        }).priceSpecification as Spec[];
        const monthly = specs.find((s) => s['@type'] === 'UnitPriceSpecification');
        expect(monthly?.description).toBeUndefined();
    });

    it('offerCatalog keeps priceSpecification a single object when there is no add-on', () => {
        const node = specOf({ role: 'addOn', base: { amount: 100, recurrence: 'once' } });
        expect(Array.isArray(node.priceSpecification)).toBe(false);
    });

    /**
     * The free trial is gone. `billingStart` was how it reached the structured
     * data, and a zero-priced `addOn` offer was how the bundled card did. Neither
     * may come back through this builder.
     */
    it('offerCatalog emits no trial delay and no zero-priced bundled offers', () => {
        const node = specOf({ role: 'core', base: { amount: 750, recurrence: 'month' } });
        expect((node.priceSpecification as Spec).billingStart).toBeUndefined();
        expect(node.addOn).toBeUndefined();
    });

    /**
     * The wording arrives finished, from `lib/offer-notes.ts`. These builders
     * assembled it themselves once, in hardcoded English, and the Spanish pages
     * published "Includes 1 Tarjeta Digital" on a node declaring
     * `inLanguage: es`.
     */
    it('offerCatalog appends the supplied notes to the offer description', () => {
        const node = specOf(
            { role: 'core', base: { amount: 750, recurrence: 'month' } },
            { description: 'Rank in the local pack.', notes: ['El 50% se abona por adelantado.'] }
        );
        expect(node.description).toBe('Rank in the local pack. El 50% se abona por adelantado.');
    });

    it('offerCatalog invents no description when none is supplied', () => {
        const node = specOf({ role: 'core', base: { amount: 750, recurrence: 'month' } });
        expect(node.description).toBeUndefined();
    });

    it('organizationOffers attaches the OfferCatalog to the #organization node', () => {
        const node = organizationOffers([
            { name: 'X', offer: { role: 'addOn', base: { amount: 100, recurrence: 'once' } } },
        ]) as Record<string, unknown>;
        expect(node['@id']).toBe(SCHEMA_IDS.organization);
        expect((node.hasOfferCatalog as Record<string, unknown>)['@type']).toBe('OfferCatalog');
    });

    it('breadcrumb numbers positions from 1', () => {
        const bc = breadcrumb([
            { name: 'Home', url: 'https://hlorenzoz.com/en/' },
            { name: 'Portfolio', url: 'https://hlorenzoz.com/en/portfolio/' },
        ]) as { itemListElement: Array<Record<string, unknown>> };
        expect(bc.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    });

    it('faqPage maps questions to accepted answers', () => {
        const faq = faqPage([{ question: 'Q?', answer: 'A.' }]) as { '@type': string; mainEntity: Array<Record<string, unknown>> };
        expect(faq['@type']).toBe('FAQPage');
        expect(faq.mainEntity[0].name).toBe('Q?');
        expect((faq.mainEntity[0].acceptedAnswer as Record<string, unknown>).text).toBe('A.');
    });

    it('serviceList references the org as provider', () => {
        const list = serviceList([{ title: 'AI', description: 'd' }]) as { itemListElement: Array<Record<string, unknown>> };
        expect((list.itemListElement[0].provider as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
    });

    it('collectionPage exposes an ItemList with the right count', () => {
        const page = collectionPage({
            locale: 'en',
            name: 'Work',
            description: 'd',
            url: 'https://hlorenzoz.com/en/portfolio/',
            items: [{ name: 'A', url: 'https://hlorenzoz.com/en/portfolio/a/' }],
            crumbs: [
                { name: 'Home', url: 'https://hlorenzoz.com/en/' },
                { name: 'Portfolio', url: 'https://hlorenzoz.com/en/portfolio/' },
            ],
        }) as { '@graph': Array<Record<string, unknown>> };
        const collection = page['@graph'].find((n) => n['@type'] === 'CollectionPage');
        expect((collection?.mainEntity as Record<string, unknown>).numberOfItems).toBe(1);
    });

    it('portfolioDetail picks a specific type by project kind', () => {
        const live = portfolioDetail({
            locale: 'en', name: 'n', description: 'd', projectUrl: 'https://x.com', image: 'i', type: 'live',
            crumbs: [{ name: 'Home', url: 'https://hlorenzoz.com/en/' }, { name: 'n', url: 'https://hlorenzoz.com/en/portfolio/n/' }],
        }) as { '@graph': Array<Record<string, unknown>> };
        const demo = portfolioDetail({
            locale: 'en', name: 'n', description: 'd', projectUrl: 'https://x.com', image: 'i', type: 'demo',
            crumbs: [{ name: 'Home', url: 'https://hlorenzoz.com/en/' }, { name: 'n', url: 'https://hlorenzoz.com/en/portfolio/n/' }],
        }) as { '@graph': Array<Record<string, unknown>> };
        expect(live['@graph'].some((n) => n['@type'] === 'WebSite')).toBe(true);
        expect(demo['@graph'].some((n) => n['@type'] === 'WebApplication')).toBe(true);
    });

    it('profilePage references the global Person by @id', () => {
        const page = profilePage({ locale: 'en' }) as Record<string, unknown>;
        expect(page['@type']).toBe('ProfilePage');
        expect((page.mainEntity as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
    });

    it('webPage includes a breadcrumb only when more than one crumb is given', () => {
        const withCrumbs = webPage({
            locale: 'en', name: 'Privacy', url: 'https://hlorenzoz.com/en/privacy-policy/',
            crumbs: [
                { name: 'Home', url: 'https://hlorenzoz.com/en/' },
                { name: 'Privacy', url: 'https://hlorenzoz.com/en/privacy-policy/' },
            ],
        }) as { '@graph': Array<Record<string, unknown>> };
        const home = webPage({
            locale: 'en', name: 'Home', url: 'https://hlorenzoz.com/en/', speakable: ['h1'],
        }) as { '@graph': Array<Record<string, unknown>> };
        expect(withCrumbs['@graph'].some((n) => n['@type'] === 'BreadcrumbList')).toBe(true);
        expect(home['@graph'].some((n) => n['@type'] === 'BreadcrumbList')).toBe(false);
        const page = home['@graph'].find((n) => n['@type'] === 'WebPage');
        expect((page?.speakable as Record<string, unknown>)['@type']).toBe('SpeakableSpecification');
    });
});

/**
 * `collectionPage` gained author/publisher when Core 30 category pages needed
 * them. The portfolio index is its other caller and inherited the change, so
 * these assertions make that a decision rather than a side effect: the listing
 * of Hector's own projects is attributable to him, same as every other content
 * page on the site.
 */
describe('collectionPage attribution', () => {
    const graph = collectionPage({
        locale: 'en',
        name: 'Portfolio',
        description: 'Projects',
        url: 'https://hlorenzoz.com/en/portfolio/',
        items: [{ name: 'A', url: 'https://hlorenzoz.com/en/portfolio/a/' }],
        crumbs: [
            { name: 'Home', url: 'https://hlorenzoz.com/en/' },
            { name: 'Portfolio', url: 'https://hlorenzoz.com/en/portfolio/' },
        ],
    }) as { '@graph': Array<Record<string, unknown>> };
    const page = graph['@graph'].find((n) => n['@type'] === 'CollectionPage');

    it('attributes the listing to the named Person and the Organization', () => {
        expect((page?.author as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
        expect((page?.publisher as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
    });

    it('omits the dates when the caller supplies none', () => {
        // The portfolio index predates freshness dates; it must not gain
        // invented ones just because the parameters now exist.
        expect(page).not.toHaveProperty('datePublished');
        expect(page).not.toHaveProperty('dateModified');
    });
});

type Graph = { '@graph': Array<Record<string, unknown>> };

const CRUMBS = [
    { name: 'Home', url: 'https://hlorenzoz.com/en/' },
    { name: 'Local SEO', url: 'https://hlorenzoz.com/en/local-seo/' },
];

describe('servicePage (Core 30 service and category pages)', () => {
    const graph = servicePage({
        locale: 'en',
        name: 'Local SEO Ourense',
        description: 'Local search optimization for businesses in Ourense.',
        url: 'https://hlorenzoz.com/en/local-seo/',
        areaServed: ['Ourense', 'Xinzo de Limia'],
        crumbs: CRUMBS,
        faq: [{ question: 'How long does it take?', answer: 'Three to six months.' }],
        datePublished: '2026-07-20',
        dateModified: '2026-07-20',
    }) as Graph;

    it('emits a Service node whose provider is the shared organization', () => {
        const service = graph['@graph'].find((n) => n['@type'] === 'Service');
        expect(service).toBeDefined();
        expect((service?.provider as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
        expect(service?.serviceType).toBe('Local SEO Ourense');
    });

    it('attributes the page to the named Person, not to an anonymous brand', () => {
        const page = graph['@graph'].find((n) => n['@type'] === 'WebPage');
        expect((page?.author as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
        expect(page?.dateModified).toBe('2026-07-20T00:00:00+02:00');
    });

    it('carries areaServed, a breadcrumb, and the FAQ block', () => {
        const service = graph['@graph'].find((n) => n['@type'] === 'Service');
        expect(service?.areaServed).toEqual([
            { '@type': 'City', name: 'Ourense' },
            { '@type': 'City', name: 'Xinzo de Limia' },
        ]);
        expect(graph['@graph'].some((n) => n['@type'] === 'BreadcrumbList')).toBe(true);
        expect(graph['@graph'].some((n) => n['@type'] === 'FAQPage')).toBe(true);
    });

    it('omits the FAQ node when no questions are supplied', () => {
        const bare = servicePage({
            locale: 'en', name: 'n', description: 'd',
            url: 'https://hlorenzoz.com/en/n/', crumbs: CRUMBS,
        }) as Graph;
        expect(bare['@graph'].some((n) => n['@type'] === 'FAQPage')).toBe(false);
    });
});

describe('articlePage (Core 30 supporting content)', () => {
    const graph = articlePage({
        locale: 'es',
        headline: 'Cuanto cuesta el SEO local en Ourense',
        description: 'Rangos de precio reales y que incluye cada tramo.',
        url: 'https://hlorenzoz.com/es/local-seo/precios/',
        crumbs: CRUMBS,
        datePublished: '2026-07-01',
        dateModified: '2026-07-20',
        about: { url: 'https://hlorenzoz.com/es/local-seo/', name: 'Local SEO' },
    }) as Graph;

    it('emits an Article authored by the Person and published by the Organization', () => {
        const article = graph['@graph'].find((n) => n['@type'] === 'Article');
        expect(article).toBeDefined();
        expect((article?.author as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.person);
        expect((article?.publisher as Record<string, unknown>)['@id']).toBe(SCHEMA_IDS.organization);
    });

    it('carries both freshness dates and the mainEntityOfPage self-reference', () => {
        const article = graph['@graph'].find((n) => n['@type'] === 'Article');
        expect(article?.datePublished).toBe('2026-07-01T00:00:00+02:00');
        expect(article?.dateModified).toBe('2026-07-20T00:00:00+02:00');
        expect(article?.mainEntityOfPage).toBe('https://hlorenzoz.com/es/local-seo/precios/');
    });
});

describe('newsArticle (news posts)', () => {
    const url = 'https://hlorenzoz.com/es/news/post/';
    const graph = newsArticle({
        locale: 'es',
        headline: 'Titular',
        description: 'Resumen.',
        url,
        crumbs: [
            { name: 'Inicio', url: 'https://hlorenzoz.com/es/' },
            { name: 'Noticias', url: 'https://hlorenzoz.com/es/news/' },
            { name: 'Titular', url },
        ],
        datePublished: '2026-11-20',
        dateModified: '2026-11-24',
        image: ['https://cdn.hlorenzoz.com/a.webp'],
        about: { url: 'https://hlorenzoz.com/es/portfolio/x/', name: 'Proyecto X' },
    }) as Graph;
    const article = graph['@graph'].find((n) => n['@type'] === 'NewsArticle');

    it('emits a NewsArticle with the Article attribution, dates and language', () => {
        expect(article).toMatchObject({
            headline: 'Titular',
            url,
            inLanguage: 'es',
            mainEntityOfPage: url,
            datePublished: '2026-11-20T00:00:00+01:00',
            dateModified: '2026-11-24T00:00:00+01:00',
            image: ['https://cdn.hlorenzoz.com/a.webp'],
            about: {
                '@type': 'WebPage',
                '@id': 'https://hlorenzoz.com/es/portfolio/x/',
                url: 'https://hlorenzoz.com/es/portfolio/x/',
                name: 'Proyecto X',
            },
            author: { '@id': SCHEMA_IDS.person },
            publisher: { '@id': SCHEMA_IDS.organization },
        });
        expect(graph['@graph'].some((n) => n['@type'] === 'Article')).toBe(false);
    });

    it('orders the breadcrumb Home > News > post', () => {
        const crumbs = graph['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
        const items = crumbs?.itemListElement as { position: number; name: string }[];
        expect(items.map((i) => [i.position, i.name])).toEqual([[1, 'Inicio'], [2, 'Noticias'], [3, 'Titular']]);
    });
});

/**
 * Google treats self-issued review markup as spam. No builder may emit it
 * unless real, attributable reviews exist, and none do today. This is a
 * manual-action guard, not a style preference.
 */
describe('no builder fabricates review signals', () => {
    it('never emits AggregateRating or Review anywhere in a graph', () => {
        const graphs = [
            servicePage({
                locale: 'en', name: 'n', description: 'd',
                url: 'https://hlorenzoz.com/en/n/', crumbs: CRUMBS,
                faq: [{ question: 'q', answer: 'a' }],
            }),
            articlePage({
                locale: 'en', headline: 'h', description: 'd',
                url: 'https://hlorenzoz.com/en/n/', crumbs: CRUMBS,
                datePublished: '2026-07-01', dateModified: '2026-07-20',
            }),
            organizationGraph({ locale: 'en' }),
            organizationOffers([
                { name: 'Tier', offer: { role: 'addOn', base: { amount: 2499, recurrence: 'once' } } },
            ]),
        ];
        for (const graph of graphs) {
            const serialized = JSON.stringify(graph);
            expect(serialized).not.toContain('AggregateRating');
            expect(serialized).not.toContain('"Review"');
            expect(serialized).not.toContain('ratingValue');
        }
    });
});
