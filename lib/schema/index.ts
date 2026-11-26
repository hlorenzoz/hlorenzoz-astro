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
    localeInfo,
    SERVED_MARKETS,
    isContinentCode,
} from '@/lib/site-config';
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
 * The global identity graph: ProfessionalService (a LocalBusiness subtype,
 * good for local rich results) + WebSite + Person, cross-linked by `@id`.
 * Rendered once in the root layout so every page carries it.
 */
export function organizationGraph({ locale, description }: { locale: string; description: string }): JsonLdObject {
    const organization: JsonLdObject = {
        '@type': 'ProfessionalService',
        '@id': SCHEMA_IDS.organization,
        name: ORGANIZATION.name,
        url: ENTITY_URLS.site,
        logo: ORGANIZATION.logo,
        image: [...ORGANIZATION.image],
        description,
        address: {
            '@type': 'PostalAddress',
            ...ORGANIZATION.address,
        },
        email: ORGANIZATION.email,
        telephone: ORGANIZATION.telephone,
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
        areaServed: ORGANIZATION.areaServed.map((area, i) => ({
            '@type': isContinentCode(SERVED_MARKETS[i]) ? 'Continent' : 'Country',
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
                inLanguage: localeInfo(locale).tag,
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
        inLanguage: localeInfo(locale).tag,
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
        inLanguage: localeInfo(locale).tag,
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
        inLanguage: localeInfo(locale).tag,
        provider: { '@id': SCHEMA_IDS.organization },
        image: image ?? OG_IMAGE,
    };
    if (areaServed?.length) {
        service.areaServed = areaServed.map((area) => ({ '@type': 'City', name: area }));
    }

    const page: JsonLdObject = {
        '@type': 'WebPage',
        '@id': url,
        name,
        description,
        url,
        inLanguage: localeInfo(locale).tag,
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
        inLanguage: localeInfo(locale).tag,
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
export function profilePage({ locale, dateModified }: { locale: string; dateModified?: string }): JsonLdObject {
    return {
        '@context': CONTEXT,
        '@type': 'ProfilePage',
        url: absoluteUrl(locale, 'card/hector'),
        inLanguage: localeInfo(locale).tag,
        isPartOf: { '@id': SCHEMA_IDS.website },
        mainEntity: { '@id': SCHEMA_IDS.person },
        ...(dateModified ? { dateModified: schemaDateTime(dateModified) } : {}),
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
    dateModified,
}: {
    locale: string;
    name: string;
    description?: string;
    url: string;
    crumbs?: { name: string; url: string }[];
    speakable?: string[];
    /** The route's `lastModified` (`YYYY-MM-DD`), emitted zoned like every schema date. */
    dateModified?: string;
}): JsonLdObject {
    const page: JsonLdObject = {
        '@type': 'WebPage',
        name,
        ...(description ? { description } : {}),
        url,
        inLanguage: localeInfo(locale).tag,
        isPartOf: { '@id': SCHEMA_IDS.website },
        primaryImageOfPage: OG_IMAGE,
        ...(dateModified ? { dateModified: schemaDateTime(dateModified) } : {}),
    };
    if (speakable) {
        page.speakable = { '@type': 'SpeakableSpecification', cssSelector: speakable };
    }

    const graph = crumbs && crumbs.length > 1 ? [breadcrumb(crumbs), page] : [page];
    return { '@context': CONTEXT, '@graph': graph };
}
