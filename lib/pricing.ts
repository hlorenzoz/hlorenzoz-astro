/**
 * The value ladder, in code.
 *
 * This is the executable form of the table in AGENTS.md ("Value ladder"), and
 * the ONLY place a figure is written down. The visible copy, the JSON-LD offers,
 * `public/llms.txt`, `ORGANIZATION.priceRange` and the commercial dossier all
 * derive from it.
 *
 * That matters because the alternative is what this replaces. The same price
 * used to be typed into `home.pricing.tiers` (en + es), into six
 * `services.*.hero.price` strings (en + es), into llms.txt and into
 * `priceRange`, with nothing tying them together. They drifted apart, and the
 * site spent months advertising prices the agency had stopped charging.
 *
 * Amounts are NUMBERS here, never pre-formatted strings. `formatAmount` renders
 * them per locale at the edge, and `schemaAmount` renders the locale-independent
 * form for JSON-LD. The old code went the other way, parsing digits back out of
 * display strings with a regex, and a Spanish "€1.000" duly became the numeric
 * string "1.000": one euro for a thousand-euro service.
 *
 * Every amount is BEFORE TAX. The copy marks each figure "+ VAT" / "+ IVA" and
 * the JSON-LD declares `valueAddedTaxIncluded: false`.
 */

/** Service keys mirror the slugs registered in `lib/routes.ts`, camel-cased. */
export type ServiceKey =
    | 'localSeo'
    | 'websiteDevelopment'
    | 'aiVoiceReceptionist'
    | 'softwareDevelopment';

/**
 * The agency sells one outcome through one `core` offer. Everything else is an
 * `addOn`: buyable on its own at list price, or discounted alongside the core.
 */
export type OfferRole = 'core' | 'addOn';

export type Recurrence = 'once' | 'month';

export interface PriceComponent {
    amount: number;
    recurrence: Recurrence;
    /** An optional charge: it is not part of the entry price. */
    optional?: boolean;
    /**
     * The amount is a FLOOR ("from 20000"), not an exact price. Work scoped per
     * project starts here; printing it bare would state it as what every client
     * pays.
     */
    from?: boolean;
}

export interface ServiceOffer {
    role: OfferRole;
    /** Every live offer has a published figure. Nothing is "ask us" any more. */
    base: PriceComponent;
    addOns?: readonly PriceComponent[];
}

export const CURRENCY = 'EUR' as const;

/**
 * Share taken off an add-on's list price when it is bought alongside the core
 * offer. Not a promotion and not time-limited: it must never be written as one.
 */
export const BUNDLE_DISCOUNT = 0.3;

/** Share of the first charge paid up front. It replaced the free trial. */
export const UPFRONT_SHARE = 0.5;

/**
 * The ladder itself. Keep in step with the table in AGENTS.md: that document is
 * the commercial source of truth, this is its implementation.
 *
 * Declaration order is presentation order: the core offer first, then the
 * add-ons as the pricing section lists them. `offersByRole` relies on it.
 */
export const PRICING: Record<ServiceKey, ServiceOffer> = {
    localSeo: {
        role: 'core',
        // One plan, four pillars, all included. Review management used to be
        // its own 297/mo service; it is inside this figure now.
        base: { amount: 750, recurrence: 'month' },
    },
    websiteDevelopment: {
        role: 'addOn',
        base: { amount: 2500, recurrence: 'once' },
        addOns: [{ amount: 49, recurrence: 'month', optional: true }],
    },
    aiVoiceReceptionist: {
        role: 'addOn',
        // Monthly, with no setup fee. Leaving a setup component here would
        // publish a one-time charge the agency does not make.
        base: { amount: 350, recurrence: 'month' },
    },
    softwareDevelopment: {
        role: 'addOn',
        base: { amount: 20000, recurrence: 'once', from: true },
    },
};

/**
 * Offers the agency has stopped selling for now but intends to bring back.
 *
 * Deliberately OUTSIDE `PRICING`: nothing that iterates the live offers (the
 * pricing section, the JSON-LD catalogue, llms.txt, the price range, the
 * dossier) can publish a paused one by accident. The Digital Business Card has
 * been paused since 2026-10-08; its route is commented out in `lib/routes.ts`
 * and its page sits in a private folder. Bringing it back is task #T0021.
 */
export const PAUSED_PRICING = {
    digitalBusinessCard: {
        role: 'addOn',
        base: { amount: 150, recurrence: 'once' },
        addOns: [{ amount: 25, recurrence: 'month', optional: true }],
    },
} as const satisfies Record<string, ServiceOffer>;

/**
 * What the agency charged for these two services when it sold them on their
 * own. They are the ONLY "bought separately" figures the site and the dossier
 * quote: the agency's own former list prices, not an estimate of what the
 * market charges. Content and backlinks were quoted per client and have no
 * figure to put here.
 */
export const FORMER_STANDALONE = { localSeo: 897, reviewManagement: 297 } as const;

/**
 * Yearly value of one new customer, for the worked example "what a customer
 * who never arrives costs". ILLUSTRATIVE inputs: wherever they are shown they
 * are labelled as an example, never as results the agency claims.
 */
export const EXAMPLE_CUSTOMER_VALUES = [250, 750, 2500] as const;

/** The live service keys with a given role, in presentation order. */
export function offersByRole(role: OfferRole): ServiceKey[] {
    return (Object.keys(PRICING) as ServiceKey[]).filter((key) => PRICING[key].role === role);
}

/** List price of an add-on once the bundle discount is applied, in whole euros. */
export function bundledAmount(amount: number): number {
    return Math.round(amount * (1 - BUNDLE_DISCOUNT));
}

/** The part of a charge paid up front, in whole euros. */
export function upfrontAmount(amount: number): number {
    return Math.round(amount * UPFRONT_SHARE);
}

/**
 * How many customers pay for the plan. When one customer is worth less than a
 * month of the plan it takes several a month; when worth more, one customer
 * covers several months.
 */
export function coverage(monthlyPrice: number, customerValue: number): { clients: number; months: number } {
    if (customerValue < monthlyPrice) {
        return { clients: Math.ceil(monthlyPrice / customerValue), months: 1 };
    }
    return { clients: 1, months: Math.floor(customerValue / monthlyPrice) };
}

/** Maps a route slug ('local-seo') to its `PRICING` key ('localSeo'). */
export function serviceKeyFromSlug(slug: string): ServiceKey {
    return slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase()) as ServiceKey;
}

/** Maps a `PRICING` key ('localSeo') back to its route slug ('local-seo'). */
export function slugFromServiceKey(key: ServiceKey): string {
    return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/**
 * Display form for a locale: "€2,500" in English, "2.500 €" in Spanish.
 *
 * Whole euros only. Every figure in the ladder is a round number, and rendering
 * "€2,500.00" on a pricing card is noise.
 */
export function formatAmount(amount: number, locale: string): string {
    return new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-IE', {
        style: 'currency',
        currency: CURRENCY,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        // Spanish omits the separator below five digits by default, which would
        // render "2500 €" while the rest of the site's Spanish copy writes
        // "20.000 €". Group always, in both locales.
        useGrouping: 'always',
    })
        .format(amount)
        // Intl separates the symbol from the amount with a no-break space, and
        // WHICH one is ICU-version dependent: U+00A0 on some builds, U+202F
        // (narrow) on others. AGENTS.md bans both, so strip either. Written as
        // escapes, not literally: a raw no-break space in source is exactly the
        // invisible character the rule exists to keep out.
        .replace(/[\u00A0\u202F]/g, ' ');
}

/**
 * The locale-independent string schema.org expects: digits and an optional
 * decimal point, never a thousands separator.
 */
export function schemaAmount(amount: number): string {
    return String(amount);
}

/**
 * The headline figure for an offer, whether it recurs, and whether it is a
 * floor. A caller that ignores `from` prints a starting price as the price.
 */
export function formatOfferBase(
    offer: ServiceOffer,
    locale: string
): { amount: string; period: Recurrence | null; from: boolean } {
    return {
        amount: formatAmount(offer.base.amount, locale),
        period: offer.base.recurrence === 'month' ? 'month' : null,
        from: offer.base.from === true,
    };
}

/** The recurring add-on, if the offer has one. */
export function monthlyAddOn(offer: ServiceOffer): PriceComponent | undefined {
    return offer.addOns?.find((addOn) => addOn.recurrence === 'month');
}

/**
 * Interpolation values for a `hero.price` message.
 *
 * One helper for every service page, which each use a different subset.
 * Hand-written value objects per page would be as many chances to forget one
 * and render a literal "{bundlePrice}" to a visitor. Extra values are ignored by
 * next-intl, so passing the full set everywhere is safe and keeps the call
 * sites identical.
 *
 * `bundlePrice` is absent for the core offer: it is what the discount hangs on,
 * so it has no discounted price of its own.
 */
export function priceMessageValues(
    offer: ServiceOffer,
    locale: string
): Record<string, string | number> {
    const monthly = monthlyAddOn(offer);
    return {
        price: formatAmount(offer.base.amount, locale),
        ...(offer.role === 'addOn'
            ? { bundlePrice: formatAmount(bundledAmount(offer.base.amount), locale) }
            : {}),
        discount: Math.round(BUNDLE_DISCOUNT * 100),
        upfront: Math.round(UPFRONT_SHARE * 100),
        ...(monthly ? { monthly: formatAmount(monthly.amount, locale) } : {}),
    };
}

/**
 * `ORGANIZATION.priceRange`, derived rather than typed.
 *
 * It was the literal '€150 - €1,299' and survived a full repricing untouched,
 * which is how a LocalBusiness ends up advertising a range it no longer charges.
 *
 * List prices only. Optional monthly add-ons (49/mo hosting) are NOT prices at
 * which any service can be bought, and the bundled prices are conditional on
 * buying the core offer, so neither may set the floor. When the dearest offer
 * is itself a floor the range ends in "+": "20000 and up", not "at most 20000".
 */
export function publishedPriceRange(locale: string): string {
    const bases = Object.values(PRICING).map((offer) => offer.base);
    const lowest = bases.reduce((a, b) => (b.amount < a.amount ? b : a));
    const highest = bases.reduce((a, b) => (b.amount > a.amount ? b : a));

    return `${formatAmount(lowest.amount, locale)} to ${formatAmount(highest.amount, locale)}${
        highest.from ? '+' : ''
    }`;
}
