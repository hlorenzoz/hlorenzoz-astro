/**
 * Pure JSON-LD builders. Each returns a plain object ready to hand to the
 * <JsonLd> component. They consume `site-config` so identity/URL data lives in
 * exactly one place, and they reference shared entities by `@id`
 * (`#organization`, `#website`, `#person`) — the same graph is emitted once
 * globally in the root layout, so page-level nodes stay lightweight.
 */
import {
    SITE_NAME,
    SCHEMA_IDS,
    ORGANIZATION,
    PERSON,
    OG_IMAGE,
    DEFAULT_LOCALE,
    absoluteUrl,
} from '@/lib/site-config';
import {
    CURRENCY,
    schemaAmount,
    type PriceComponent,
    type ServiceOffer,
} from '@/lib/pricing';
import { schemaDateTime } from '@/lib/schema/datetime';

/**
 * Canonical URLs for the shared, `@id`-bearing entities. These must stay stable
 * across every page/locale that emits them — a single `@id` advertising
 * different `url` values confuses entity dedup — so they always resolve to the
 * default-locale canonical page, not the current request's locale.
 */
const ENTITY_URLS = {
    site: absoluteUrl(DEFAULT_LOCALE),
    person: absoluteUrl(DEFAULT_LOCALE, 'card/hector'),
} as const;

export type JsonLdObject = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

/**
 * The one place a stored `YYYY-MM-DD` becomes an emitted date: Google rejects a
 * bare date as "missing a time zone". Every builder spreads this instead of the
 * raw values, so no call site can forget the conversion.
 */
function freshnessDates(datePublished?: string, dateModified?: string): JsonLdObject {
    return {
        ...(datePublished ? { datePublished: schemaDateTime(datePublished) } : {}),
        ...(dateModified ? { dateModified: schemaDateTime(dateModified) } : {}),
    };
}

/** A page an article is about, as a typed node rather than a bare URL string. */
export interface SchemaPageRef {
    url: string;
    /** Human title of that page, e.g. the portfolio item's localized title. */
    name: string;
}

/**
 * One entry in the catalogue: a named service plus the offer that prices it.
 */
export interface CatalogEntry {
    name: string;
    description?: string;
    offer: ServiceOffer;
    /**
     * Localized sentences about the offer's terms, from `lib/offer-notes.ts`.
     *
     * Passed in rather than generated here. These builders are free of i18n, and
     * when this file assembled the wording itself it did so in hardcoded
     * English: the Spanish pages published "Includes 1 Tarjeta Digital" on a
     * node declaring `inLanguage: es`.
     */
    notes?: string[];
}

/**
 * Turns a `PriceComponent` into the right schema.org shape.
 *
 * Three distinctions matter, and each was a published error at some point:
 *
 * - A recurring charge is a `UnitPriceSpecification` measured per month
 *   (UN/CEFACT unitCode "MON"); a one-off is a plain `PriceSpecification`. This
 *   used to be decided by which FIELD a number arrived in, with `price` assumed
 *   one-time. A monthly-only service would have been published as a single
 *   charge.
 * - A floor is `minPrice`, never `price`. "From 20000" emitted as `price` states
 *   that every project costs 20000.
 * - Every figure is before tax, so `valueAddedTaxIncluded` is `false` on all of
 *   them. Omitting it leaves a consumer to assume the number is what is paid.
 */
function priceSpec(component: PriceComponent): JsonLdObject {
    const amount = schemaAmount(component.amount);
    const figure = component.from ? { minPrice: amount } : { price: amount };

    if (component.recurrence === 'month') {
        return {
            '@type': 'UnitPriceSpecification',
            priceCurrency: CURRENCY,
            ...figure,
            valueAddedTaxIncluded: false,
            referenceQuantity: {
                '@type': 'QuantitativeValue',
                value: 1,
                unitCode: 'MON',
                unitText: 'MONTH',
            },
            ...(component.optional ? { description: 'Optional recurring charge' } : {}),
        };
    }

    return {
        '@type': 'PriceSpecification',
        priceCurrency: CURRENCY,
        ...figure,
        valueAddedTaxIncluded: false,
        ...(component.optional ? { description: 'Optional charge' } : {}),
    };
}

/**
 * The `Offer` node for one catalogue entry: the base price, any optional
 * add-on charges, and the localized notes on its terms.
 */
export function serviceOffer(entry: CatalogEntry): JsonLdObject {
    const { offer } = entry;

    const specs: JsonLdObject[] = [priceSpec(offer.base), ...(offer.addOns ?? []).map(priceSpec)];

    const descriptions = [
        ...(entry.description ? [entry.description] : []),
        ...(entry.notes ?? []),
    ];

    const node: JsonLdObject = {
        '@type': 'Offer',
        itemOffered: {
            '@type': 'Service',
            name: entry.name,
            ...(entry.description ? { description: entry.description } : {}),
            provider: { '@id': SCHEMA_IDS.organization },
        },
    };

    if (descriptions.length) node.description = descriptions.join(' ');
    node.priceSpecification = specs.length === 1 ? specs[0] : specs;

    return node;
}

/**
 * OfferCatalog for the live offers, attached to the organization via
 * `hasOfferCatalog`.
 *
 * It consumes `ServiceOffer` objects from `lib/pricing.ts` rather than the
 * display strings it used to parse with a regex. That parser was the reason a
 * Spanish "€1.000" normalized to the numeric string "1.000": the JSON-LD
 * advertised one euro for a thousand-euro service, and nothing caught it
 * because the visible page was correct.
 */
export function offerCatalog(entries: CatalogEntry[]): JsonLdObject {
    return {
        '@type': 'OfferCatalog',
        name: `${SITE_NAME} Services`,
        itemListElement: entries.map(serviceOffer),
    };
}

/**
 * The global identity graph: ProfessionalService (a LocalBusiness subtype,
 * good for local rich results) + WebSite + Person, cross-linked by `@id`.
 * Rendered once in the root layout so every page carries it. The pricing
 * OfferCatalog is intentionally NOT attached here — it belongs to the home
 * page only (see `organizationOffers`) so it doesn't bloat every page.
 */
export function organizationGraph({ locale }: { locale: string }): JsonLdObject {
    const organization: JsonLdObject = {
        '@type': 'ProfessionalService',
        '@id': SCHEMA_IDS.organization,
        name: ORGANIZATION.name,
        url: ENTITY_URLS.site,
        logo: ORGANIZATION.logo,
        image: [...ORGANIZATION.image],
        description: ORGANIZATION.description,
        address: {
            '@type': 'PostalAddress',
            ...ORGANIZATION.address,
        },
        email: ORGANIZATION.email,
        telephone: ORGANIZATION.telephone,
        priceRange: ORGANIZATION.priceRange,
        hasMap: ORGANIZATION.hasMap,
        currenciesAccepted: ORGANIZATION.currenciesAccepted,
        paymentAccepted: ORGANIZATION.paymentAccepted,
        openingHours: ORGANIZATION.openingHours,
        openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            ...ORGANIZATION.openingHoursSpecification,
            dayOfWeek: [...ORGANIZATION.openingHoursSpecification.dayOfWeek],
        },
        // The countries the online agency serves, as opposed to `address`,
        // which is only where it is physically registered. Emitted as `Country`
        // because these are national markets, not the town/region an
        // address-bound local business would declare.
        areaServed: ORGANIZATION.areaServed.map((area) => ({
            '@type': 'Country',
            name: area,
        })),
        geo: {
            '@type': 'GeoCoordinates',
            ...ORGANIZATION.geo,
        },
        sameAs: [...ORGANIZATION.sameAs],
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: ORGANIZATION.supportEmail,
            telephone: ORGANIZATION.telephone,
            availableLanguage: ['English', 'Spanish'],
        },
    };

    return {
        '@context': CONTEXT,
        '@graph': [
            organization,
            {
                '@type': 'WebSite',
                '@id': SCHEMA_IDS.website,
                url: ENTITY_URLS.site,
                name: SITE_NAME,
                publisher: { '@id': SCHEMA_IDS.organization },
                inLanguage: locale,
            },
            {
                '@type': 'Person',
                '@id': SCHEMA_IDS.person,
                name: PERSON.name,
                url: ENTITY_URLS.person,
                image: [...PERSON.image],
                jobTitle: PERSON.jobTitle,
                email: ORGANIZATION.email,
                telephone: ORGANIZATION.telephone,
                worksFor: { '@id': SCHEMA_IDS.organization },
                sameAs: [...PERSON.sameAs],
            },
        ],
    };
}

/**
 * Attaches the pricing OfferCatalog to the organization by `@id`. Emitted only
 * on the home page (where pricing lives) — Google merges this into the global
 * #organization node without repeating the catalog on every page.
 */
export function organizationOffers(entries: CatalogEntry[]): JsonLdObject {
    return {
        '@context': CONTEXT,
        '@type': 'ProfessionalService',
        '@id': SCHEMA_IDS.organization,
        hasOfferCatalog: offerCatalog(entries),
    };
}

/**
 * Bare `FAQPage` node (no `@context`), for embedding in a `@graph`.
 *
 * The exported `faqPage()` below is the standalone document form. This is the
 * same shape without the wrapper, shared by every page builder that can carry a
 * People Also Ask block instead of each re-inlining the mapping.
 */
function faqNode(items: { question: string; answer: string }[]): JsonLdObject {
    return {
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    };
}

/** BreadcrumbList from an ordered list of {name, url}. */
export function breadcrumb(items: { name: string; url: string }[]): JsonLdObject {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

/** FAQPage. Note: since 2023 Google only renders FAQ rich results for
 * gov/health sites, but the markup stays valuable for AI/GEO citation. */
export function faqPage(items: { question: string; answer: string }[]): JsonLdObject {
    return {
        '@context': CONTEXT,
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    };
}

/** ItemList of Service offerings provided by the organization. */
export function serviceList(items: { title: string; description: string }[]): JsonLdObject {
    return {
        '@context': CONTEXT,
        '@type': 'ItemList',
        itemListElement: items.map((item) => ({
            '@type': 'Service',
            name: item.title,
            description: item.description,
            provider: { '@id': SCHEMA_IDS.organization },
        })),
    };
}

/**
 * CollectionPage + inner ItemList for a listing page (e.g. the portfolio
 * index). Each entry links to its detail URL, making the list eligible for
 * Google's list treatment.
 */
export function collectionPage({
    locale,
    name,
    description,
    url,
    items,
    crumbs,
    datePublished,
    dateModified,
    faq,
}: {
    locale: string;
    name: string;
    description: string;
    url: string;
    items: { name: string; url: string }[];
    crumbs: { name: string; url: string }[];
    /**
     * Freshness dates. Optional because the portfolio index predates them, but
     * a Core 30 category page must supply both: it is a content page like any
     * other, and dropping author/date there was a silent E-E-A-T failure on
     * every one of the 5 to 10 category pages a Core 30 site carries.
     */
    datePublished?: string;
    dateModified?: string;
    faq?: { question: string; answer: string }[];
}): JsonLdObject {
    const page: JsonLdObject = {
        '@type': 'CollectionPage',
        name,
        description,
        url,
        inLanguage: locale,
        isPartOf: { '@id': SCHEMA_IDS.website },
        // Same attribution the service and article builders emit, so a category
        // page names an accountable human rather than an anonymous brand.
        author: { '@id': SCHEMA_IDS.person },
        publisher: { '@id': SCHEMA_IDS.organization },
        ...freshnessDates(datePublished, dateModified),
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items.map((item, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: item.name,
                url: item.url,
            })),
        },
    };

    const graph: JsonLdObject[] = [breadcrumb(crumbs), page];
    if (faq?.length) graph.push(faqNode(faq));

    return { '@context': CONTEXT, '@graph': graph };
}

/**
 * Breadcrumb + enriched CreativeWork for a portfolio detail page. Live/demo
 * projects map to a more specific type (`WebSite` / `WebApplication`).
 */
export function portfolioDetail({
    locale,
    name,
    description,
    projectUrl,
    image,
    type,
    keywords,
    dateModified,
    crumbs,
}: {
    locale: string;
    name: string;
    description: string;
    projectUrl: string;
    image: string;
    type: 'live' | 'demo';
    keywords?: string;
    /** The case study's `lastModified` (`YYYY-MM-DD`), emitted zoned like every schema date. */
    dateModified?: string;
    crumbs: { name: string; url: string }[];
}): JsonLdObject {
    const work: JsonLdObject = {
        '@type': type === 'live' ? 'WebSite' : 'WebApplication',
        name,
        description,
        url: projectUrl,
        image,
        inLanguage: locale,
        creator: { '@id': SCHEMA_IDS.organization },
    };
    if (type === 'demo') work.applicationCategory = 'BusinessApplication';
    if (keywords) work.keywords = keywords;
    if (dateModified) work.dateModified = schemaDateTime(dateModified);

    return {
        '@context': CONTEXT,
        '@graph': [breadcrumb(crumbs), work],
    };
}

/**
 * Breadcrumb + `Service` (+ optional `FAQPage`) for a Core 30 service or
 * category page.
 *
 * `Service` rather than a bare `WebPage` because the page describes an offering
 * with a provider and a service area, which is what a local pack listing is
 * matched against. The provider is referenced by `@id` so it merges into the
 * single `#organization` node emitted globally, instead of restating the
 * business on every page.
 *
 * `AggregateRating` is deliberately absent and must stay that way unless real,
 * attributable reviews exist. Self-issued review markup is a manual-action
 * risk, not a ranking gain.
 */
export function servicePage({
    locale,
    name,
    description,
    url,
    serviceType,
    areaServed,
    crumbs,
    faq,
    image,
    relatedPages,
    datePublished,
    dateModified,
    offer,
    offerNotes,
}: {
    locale: string;
    name: string;
    description: string;
    url: string;
    /** Specific service label, e.g. 'Local SEO'. Defaults to `name`. */
    serviceType?: string;
    /** City or region names the service covers. */
    areaServed?: string[];
    crumbs: { name: string; url: string }[];
    /**
     * Pages one tier below this one: the supporting content that answers
     * People Also Ask questions about this service.
     *
     * Emitted as `WebPage.significantLink`. Without it the Core 30 linking
     * mirror stopped at the service tier and every supporting post had an
     * inbound link from nowhere.
     */
    relatedPages?: { name: string; url: string }[];
    faq?: { question: string; answer: string }[];
    image?: string;
    datePublished?: string;
    dateModified?: string;
    /**
     * The published price, when there is one.
     *
     * Every service page shows a price to the reader; until this existed none of
     * them emitted one, so a crawler saw a page about a service whose cost was
     * invisible to it. The home page's OfferCatalog covers only the three
     * featured tiers, which left the rest priced on screen and unpriced in the
     * graph.
     */
    offer?: ServiceOffer;
    /** Localized sentences about the offer's terms, from `lib/offer-notes.ts`. */
    offerNotes?: string[];
}): JsonLdObject {
    // Both nodes describe the same URL, so the Service gets a stable fragment
    // `@id` and the WebPage points at it through `mainEntity`. Without that
    // link a consumer sees two unrelated things asserting the same address and
    // has to guess whether the Service is what the page is about, which throws
    // away the reason for using Service over a bare WebPage in the first place.
    const serviceId = `${url}#service`;

    const service: JsonLdObject = {
        '@type': 'Service',
        '@id': serviceId,
        name,
        description,
        url,
        serviceType: serviceType ?? name,
        inLanguage: locale,
        provider: { '@id': SCHEMA_IDS.organization },
        image: image ?? OG_IMAGE,
    };
    if (areaServed?.length) {
        service.areaServed = areaServed.map((area) => ({ '@type': 'City', name: area }));
    }
    if (offer) {
        // The Service already carries name/description, so the Offer's own
        // itemOffered would restate them. `serviceOffer` builds the shape once;
        // only the pricing half of it belongs here. Every live offer has a base
        // price now, so there is always something to emit.
        const { itemOffered: _itemOffered, ...pricing } = serviceOffer({
            name,
            offer,
            notes: offerNotes,
        });
        service.offers = pricing;
    }

    const page: JsonLdObject = {
        '@type': 'WebPage',
        '@id': url,
        name,
        description,
        url,
        inLanguage: locale,
        isPartOf: { '@id': SCHEMA_IDS.website },
        mainEntity: { '@id': serviceId },
        // The named human accountable for the page. Points at the same Person
        // node the digital card publishes, so expertise is attributable rather
        // than asserted by an anonymous brand.
        author: { '@id': SCHEMA_IDS.person },
        publisher: { '@id': SCHEMA_IDS.organization },
        ...freshnessDates(datePublished, dateModified),
        ...(relatedPages?.length
            ? { significantLink: relatedPages.map((p) => p.url) }
            : {}),
    };

    const graph: JsonLdObject[] = [breadcrumb(crumbs), page, service];
    if (faq?.length) {
        graph.push(faqNode(faq));
    }

    return { '@context': CONTEXT, '@graph': graph };
}

/**
 * Breadcrumb + `Article` (+ optional `FAQPage`) for supporting content: the
 * People Also Ask posts that hang off a Core 30 service page.
 *
 * `Article` carries the author, publisher and dates that a service page does
 * not need, which is the whole point of the tier: it is a piece of writing by
 * a named person, not a description of an offering.
 */
export function articlePage({
    type = 'Article',
    locale,
    headline,
    description,
    url,
    crumbs,
    datePublished,
    dateModified,
    image,
    about,
    faq,
}: {
    /** `NewsArticle` for news posts; same attribution and dates either way. */
    type?: 'Article' | 'NewsArticle';
    locale: string;
    headline: string;
    description: string;
    url: string;
    crumbs: { name: string; url: string }[];
    /** ISO date, e.g. '2026-07-20'. */
    datePublished: string;
    dateModified: string;
    image?: string | string[];
    /**
     * Page the article covers, for entity association. An object, never a bare
     * URL: Google reads a string `about` as an untyped Thing named by the URL.
     */
    about?: SchemaPageRef;
    faq?: { question: string; answer: string }[];
}): JsonLdObject {
    const article: JsonLdObject = {
        '@type': type,
        headline,
        description,
        url,
        inLanguage: locale,
        image: image ?? OG_IMAGE,
        author: { '@id': SCHEMA_IDS.person },
        publisher: { '@id': SCHEMA_IDS.organization },
        isPartOf: { '@id': SCHEMA_IDS.website },
        mainEntityOfPage: url,
        ...freshnessDates(datePublished, dateModified),
    };
    if (about) {
        article.about = { '@type': 'WebPage', '@id': about.url, url: about.url, name: about.name };
    }

    const graph: JsonLdObject[] = [breadcrumb(crumbs), article];
    if (faq?.length) {
        graph.push(faqNode(faq));
    }

    return { '@context': CONTEXT, '@graph': graph };
}

/**
 * Breadcrumb + `NewsArticle` for a news post: `articlePage` with the news type,
 * so the author/publisher shape cannot drift between the two.
 */
export function newsArticle(args: Omit<Parameters<typeof articlePage>[0], 'type' | 'faq'>): JsonLdObject {
    return articlePage({ ...args, type: 'NewsArticle' });
}

/** ProfilePage wrapping the globally-defined Person, for the digital card. */
export function profilePage({ locale }: { locale: string }): JsonLdObject {
    return {
        '@context': CONTEXT,
        '@type': 'ProfilePage',
        url: absoluteUrl(locale, 'card/hector'),
        inLanguage: locale,
        isPartOf: { '@id': SCHEMA_IDS.website },
        mainEntity: { '@id': SCHEMA_IDS.person },
    };
}

/**
 * Generic WebPage node with site link. Includes a BreadcrumbList when `crumbs`
 * are given (legal pages) and a `speakable` block when `speakable` selectors
 * are given (home page, for voice/GEO extraction).
 */
export function webPage({
    locale,
    name,
    description,
    url,
    crumbs,
    speakable,
}: {
    locale: string;
    name: string;
    description?: string;
    url: string;
    crumbs?: { name: string; url: string }[];
    speakable?: string[];
}): JsonLdObject {
    const page: JsonLdObject = {
        '@type': 'WebPage',
        name,
        ...(description ? { description } : {}),
        url,
        inLanguage: locale,
        isPartOf: { '@id': SCHEMA_IDS.website },
        primaryImageOfPage: OG_IMAGE,
    };
    if (speakable) {
        page.speakable = { '@type': 'SpeakableSpecification', cssSelector: speakable };
    }

    const graph = crumbs && crumbs.length > 1 ? [breadcrumb(crumbs), page] : [page];
    return { '@context': CONTEXT, '@graph': graph };
}
