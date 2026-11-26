/**
 * Single source of truth for site-wide identity, contact, and URL constants.
 *
 * Everything that used to be hardcoded across the layout, sitemap, and page
 * files lives here. Consuming URLs through `absoluteUrl()` guarantees they
 * always match the canonical form the build emits (`/{locale}{path}/`,
 * trailingSlash: 'always') — which is what prevented the sitemap from drifting.
 */

export const BASE_URL = 'https://hlorenzoz.com';
export const CDN_URL = 'https://cdn.hlorenzoz.com';
export const SITE_NAME = 'Lorenzoz Agency';

// The locale table lives in the import-free `lib/routing.ts`, so any lib module
// can read it without an import cycle.
export { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, localeInfo, type Locale, type LocaleInfo } from '@/lib/routing';
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, localeInfo } from '@/lib/routing';

export const OG_IMAGE = `${CDN_URL}/hlorenzoz.com/og-image.webp`;

/**
 * The markets the online agency serves, in the display order AGENTS.md lists them
 * (alphabetical by English name): ISO 3166-1 alpha-2 codes for countries and the
 * UN M.49 code `150` for Europe, which `Intl.DisplayNames` names in every locale.
 *
 * Codes, not names, so there is ONE source: the schema emits English names, the
 * visible homepage band emits localized names ("Europe" vs "Europa"), and both
 * derive from this list through `marketNames`. A hand-written localized list per
 * locale is exactly the duplication that lets the two drift apart.
 */
export const SERVED_MARKETS = ['AU', 'CA', 'CR', '150', 'GB', 'US'] as const;

/** A numeric (UN M.49) market code is a region such as a continent, not a country. */
export const isContinentCode = (code: string) => /^\d+$/.test(code);

/**
 * Localized country names for the served markets, e.g. "España" for `es`.
 *
 * Memoized per locale: `Intl.DisplayNames` loads ICU region data on
 * construction, and this is called at module load (`areaServed`) and once per
 * homepage render per locale over a fixed six-code list. The cache is a
 * read-only snapshot; callers only ever `.map` over it.
 */
const MARKET_NAMES_CACHE = new Map<string, readonly string[]>();
export function marketNames(locale: string): readonly string[] {
    const key = localeInfo(locale).tag;
    const cached = MARKET_NAMES_CACHE.get(key);
    if (cached) return cached;

    const display = new Intl.DisplayNames([key], { type: 'region' });
    // Intl can, in principle, return undefined for an unknown code; fall back to
    // the code so a bad entry is visible rather than silently dropped.
    const names = SERVED_MARKETS.map((code) => display.of(code) ?? code);
    MARKET_NAMES_CACHE.set(key, names);
    return names;
}

/** Stable JSON-LD node identifiers, referenced across pages via `@id`. */
export const SCHEMA_IDS = {
    organization: `${BASE_URL}/#organization`,
    website: `${BASE_URL}/#website`,
    person: `${BASE_URL}/card/hector/#person`,
} as const;

export const ORGANIZATION = {
    name: SITE_NAME,
    legalName: 'Lorenzoz Agency',
    logo: `${BASE_URL}/icons/icon-512.png`,
    email: 'contact@hlorenzoz.com',
    supportEmail: 'privacy@hlorenzoz.com',
    telephone: '+34643844720',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Bank Transfer, Credit Card, Stripe',
    openingHours: 'Mo-Fr 09:00-18:00',
    /**
     * Same hours as `openingHours`, in the structured form schema.org prefers.
     * Both are emitted: the string stays for consumers that only read it, the
     * specification is what Google actually parses.
     */
    openingHoursSpecification: {
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
    },
    hasMap: 'https://maps.app.goo.gl/TfnWh83Z4e8yDFs58',
    address: {
        streetAddress: 'Rua Rio Sil',
        addressLocality: 'Xinzo de Limia',
        addressRegion: 'Ourense',
        postalCode: '32630',
        addressCountry: 'ES',
    },
    /**
     * Where the business actually delivers, as opposed to `address`, which is
     * only where it is physically registered (Xinzo de Limia).
     *
     * Derived from `SERVED_MARKETS` in the default (English) locale, because the
     * #organization node is emitted locale-independently. Emitted as schema.org
     * `Country` entities, Europe as a `Continent` (see `lib/schema`), not the hyperlocal town/region an
     * address-bound business would list.
     */
    areaServed: marketNames(DEFAULT_LOCALE),
    geo: { latitude: '42.0664', longitude: '-7.7241' },
    image: [
        `${CDN_URL}/hlorenzoz.com/ai-benefits.webp`,
        OG_IMAGE,
    ],
    /**
     * Profiles that resolve to the same entity. The Maps listing is the most
     * valuable one here: it is what ties the site's Organization node to the
     * Google Business Profile instead of leaving them as two separate
     * businesses that happen to share a name.
     */
    sameAs: [
        'https://www.linkedin.com/in/hlorenzoz/',
        'https://github.com/hlorenzoz',
        'https://www.upwork.com/freelancers/hlorenzoz',
        'https://maps.app.goo.gl/TfnWh83Z4e8yDFs58',
    ],
} as const;

export const PERSON = {
    name: 'Héctor Luis Lorenzo Zaldivar',
    jobTitle: 'Founder & AI Architect',
    image: [
        `${CDN_URL}/hlorenzoz.com/hector-profile.webp`,
        OG_IMAGE,
    ],
    sameAs: [
        'https://www.linkedin.com/in/hlorenzoz/',
        'https://github.com/hlorenzoz',
        'https://www.upwork.com/freelancers/hlorenzoz',
    ],
} as const;

/**
 * Builds a canonical absolute URL: `${BASE_URL}/{locale}{path}/`.
 *
 * Mirrors `astro.config.mjs` `trailingSlash: 'always'` and the per-page
 * `alternates.canonical` values, so sitemap entries and canonicals can never
 * disagree. `path` may be empty (home), and leading/trailing slashes are
 * normalized so callers don't have to think about them.
 *
 * @example absoluteUrl('en')                        // https://hlorenzoz.com/en/
 * @example absoluteUrl('es', '/portfolio')          // https://hlorenzoz.com/es/portfolio/
 * @example absoluteUrl('en', 'portfolio/real-estate') // https://hlorenzoz.com/en/portfolio/real-estate/
 */
export function absoluteUrl(locale: string, path = ''): string {
    const clean = path.replace(/^\/+|\/+$/g, '');
    const suffix = clean ? `${clean}/` : '';
    return `${BASE_URL}/${locale}/${suffix}`;
}

/**
 * Truncate free text to a meta-description-friendly length (~160 chars).
 *
 * The suffix is three ASCII dots, not the ellipsis character. AGENTS.md bans
 * that character in any file, and this helper now backs every page's meta and
 * og:description through `pageMetadata`, so a single non-ASCII character here
 * would reach the head of every page on the site.
 */
export function metaDescription(text: string, max = 160): string {
    if (text.length <= max) return text;
    const ELLIPSIS = '...';
    // A max below the suffix length has no room for it, and `slice(0, max - 3)`
    // with a negative end counts from the END of the string instead of
    // truncating, so it returned MORE than the caller asked for:
    // metaDescription('abcdef', 2) used to yield 'abcde...' (8 chars).
    if (max <= ELLIPSIS.length) return text.slice(0, max);
    return `${text.slice(0, max - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
}

/**
 * Maps an app locale to the `og:locale` value OpenGraph expects
 * (`language_TERRITORY`). Kept here so every page's metadata agrees rather
 * than each page inlining its own `locale === 'es' ? ... : ...` ternary.
 */
export function ogLocale(locale: string): string {
    return localeInfo(locale).ogLocale;
}

/**
 * hreflang map for a path that exists in `locales`: BCP 47 tag -> URL, plus
 * `x-default` -> the default locale. `locales` is required on purpose: listing
 * every configured locale would point hreflang at pages not built yet. Pages
 * get it from the route registry (`routeAlternates` in `lib/routes.ts`).
 */
export function languageAlternates(path: string, locales: readonly string[]): Record<string, string> {
    const alternates: Record<string, string> = {};
    for (const locale of LOCALES) {
        if (locales.includes(locale)) alternates[LOCALE_INFO[locale].tag] = absoluteUrl(locale, path);
    }
    alternates['x-default'] = absoluteUrl(DEFAULT_LOCALE, path);
    return alternates;
}
