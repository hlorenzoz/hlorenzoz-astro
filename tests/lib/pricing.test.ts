import { describe, it, expect } from 'vitest';
import {
    PRICING,
    PAUSED_PRICING,
    CURRENCY,
    BUNDLE_DISCOUNT,
    UPFRONT_SHARE,
    FORMER_STANDALONE,
    EXAMPLE_CUSTOMER_VALUES,
    bundledAmount,
    upfrontAmount,
    coverage,
    offersByRole,
    formatAmount,
    formatOfferBase,
    monthlyAddOn,
    priceMessageValues,
    publishedPriceRange,
    schemaAmount,
    type ServiceKey,
} from '@/lib/pricing';
import { ALL_ROUTES } from '@/lib/routes';

/**
 * `lib/pricing.ts` is the executable form of the value ladder documented in
 * AGENTS.md. Every price the site shows, quotes in llms.txt, emits as JSON-LD
 * or prints in the commercial dossier derives from it.
 *
 * That centralisation is the whole point: the same figure used to live in
 * `home.pricing.tiers`, in six `services.*.hero.price` strings, in llms.txt and
 * in `ORGANIZATION.priceRange`, with nothing tying them together. They drifted,
 * and the published prices stopped matching the offer the agency actually sells.
 */
describe('PRICING covers the catalogue', () => {
    const serviceSlugs = ALL_ROUTES.filter((route) => route.tier === 'service').map((route) =>
        route.path.replace('services/', '')
    );
    const keyOf = (slug: string) => slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as ServiceKey;

    it('has an entry for every registered service route', () => {
        expect(serviceSlugs.length).toBe(4);

        for (const slug of serviceSlugs) {
            expect(
                PRICING[keyOf(slug)],
                `route "services/${slug}" has no PRICING entry. A service page that ships ` +
                'without a price in the single source of truth will show one figure and ' +
                'emit another.'
            ).toBeDefined();
        }
    });

    it('has a registered service route for every entry', () => {
        // The other direction: an offer with no page is priced in the data and
        // in the JSON-LD catalogue while a visitor has nowhere to read about it.
        expect(Object.keys(PRICING).sort()).toEqual(serviceSlugs.map(keyOf).sort());
    });

    it('gives every offer a base price', () => {
        // No offer is "quoted" any more. Software has a floor instead, so every
        // entry carries a figure and nothing has to print "ask us".
        for (const [key, offer] of Object.entries(PRICING)) {
            expect(offer.base.amount, `"${key}" has no base amount`).toBeGreaterThan(0);
        }
    });

    it('prices in EUR only, matching the currency the organization declares', () => {
        expect(CURRENCY).toBe('EUR');
    });
});

describe('the value ladder matches AGENTS.md', () => {
    it('makes Local SEO the one core offer, at 750 EUR a month', () => {
        expect(PRICING.localSeo).toEqual({ role: 'core', base: { amount: 750, recurrence: 'month' } });
        expect(offersByRole('core')).toEqual(['localSeo']);
    });

    it('lists the three optional services, in the order they are presented', () => {
        expect(offersByRole('addOn')).toEqual(['websiteDevelopment', 'aiVoiceReceptionist', 'softwareDevelopment']);
    });

    it('prices Website Development at 2500 EUR one-off with optional 49/mo hosting', () => {
        const website = PRICING.websiteDevelopment;
        expect(website.base).toEqual({ amount: 2500, recurrence: 'once' });

        const hosting = monthlyAddOn(website);
        expect(hosting?.amount).toBe(49);
        expect(hosting?.optional).toBe(true);
    });

    it('bills the voice receptionist monthly with no setup fee', () => {
        const voice = PRICING.aiVoiceReceptionist;
        expect(voice.base).toEqual({ amount: 350, recurrence: 'month' });
        // A leftover setup fee here would be published as a one-time charge the
        // agency no longer makes.
        expect(voice.addOns ?? []).toEqual([]);
    });

    it('publishes software as a floor, not as a price', () => {
        // 20000 is where quotes start. Without the flag it would be printed, and
        // emitted as JSON-LD, as the price of every project.
        expect(PRICING.softwareDevelopment.base).toEqual({ amount: 20000, recurrence: 'once', from: true });
    });

    it('carries no free trial anywhere', () => {
        // The 15-day trial is gone, replaced by the up-front payment. A leftover
        // `trialDays` would resurface as copy and as a Stripe trial period.
        expect(JSON.stringify(PRICING)).not.toMatch(/trial/i);
    });

    it('keeps the paused Digital Business Card out of the live offers', () => {
        expect(Object.keys(PRICING)).not.toContain('digitalBusinessCard');
        expect(PAUSED_PRICING.digitalBusinessCard.base.amount).toBe(150);
    });

    it('no longer prices review management on its own', () => {
        expect(Object.keys(PRICING)).not.toContain('reputationReviewManagement');
    });
});

describe('the terms', () => {
    it('takes 30% off an optional service bought alongside Local SEO', () => {
        expect(BUNDLE_DISCOUNT).toBe(0.3);
        expect(bundledAmount(2500)).toBe(1750);
        expect(bundledAmount(350)).toBe(245);
        expect(bundledAmount(20000)).toBe(14000);
    });

    it('asks for half up front', () => {
        expect(UPFRONT_SHARE).toBe(0.5);
        expect(upfrontAmount(750)).toBe(375);
        expect(upfrontAmount(2500)).toBe(1250);
    });

    it('keeps the former standalone prices for the comparison only', () => {
        // The agency's own past list prices for the two pillars it used to sell
        // separately. They are quoted in "bought separately" and nowhere else.
        expect(FORMER_STANDALONE).toEqual({ localSeo: 897, reviewManagement: 297 });
    });

    it('offers three illustrative customer values, smallest first', () => {
        expect(EXAMPLE_CUSTOMER_VALUES).toEqual([250, 750, 2500]);
    });
});

describe('coverage', () => {
    it('counts the customers a month that pay for the plan when one is worth less than it', () => {
        expect(coverage(750, 250)).toEqual({ clients: 3, months: 1 });
        expect(coverage(750, 400)).toEqual({ clients: 2, months: 1 });
    });

    it('is one customer a month when a customer is worth exactly the plan', () => {
        expect(coverage(750, 750)).toEqual({ clients: 1, months: 1 });
    });

    it('counts the months one customer pays for when one is worth more than the plan', () => {
        expect(coverage(750, 2500)).toEqual({ clients: 1, months: 3 });
    });
});

describe('formatAmount', () => {
    it('uses the separator each locale actually reads', () => {
        expect(formatAmount(2500, 'en')).toBe('€2,500');
        expect(formatAmount(2500, 'es')).toBe('2.500 €');
    });

    it('omits decimals for whole-euro amounts', () => {
        expect(formatAmount(750, 'en')).toBe('€750');
        expect(formatAmount(750, 'es')).toBe('750 €');
    });

    /**
     * The bug this replaces: `offerCatalog` normalised a price string with
     * `replace(/[^0-9.]/g, '')`, so the Spanish rendering "€1.000" became the
     * numeric string "1.000" and the JSON-LD advertised ONE euro for a
     * thousand-euro service. Amounts are numbers here and only ever become
     * strings at the edges, so the round trip cannot lose a thousands separator.
     */
    it('keeps the schema amount locale-independent', () => {
        expect(schemaAmount(2500)).toBe('2500');
        expect(Number(schemaAmount(2500))).toBe(2500);
    });
});

describe('formatOfferBase', () => {
    it('marks a monthly base as recurring', () => {
        expect(formatOfferBase(PRICING.localSeo, 'en')).toEqual({ amount: '€750', period: 'month', from: false });
    });

    it('leaves a one-time base without a period', () => {
        expect(formatOfferBase(PRICING.websiteDevelopment, 'en')).toEqual({ amount: '€2,500', period: null, from: false });
    });

    it('flags a floor, so the caller prints "from" beside it', () => {
        expect(formatOfferBase(PRICING.softwareDevelopment, 'es')).toEqual({ amount: '20.000 €', period: null, from: true });
    });
});

/**
 * One helper feeds every service page, which each interpolate a different
 * subset. Hand-written value objects per page would be as many places to forget
 * one and ship a raw "{bundlePrice}" to a visitor.
 */
describe('priceMessageValues', () => {
    it('supplies the list price, the bundled price and the terms', () => {
        expect(priceMessageValues(PRICING.websiteDevelopment, 'en')).toEqual({
            price: '€2,500',
            bundlePrice: '€1,750',
            discount: 30,
            upfront: 50,
            monthly: '€49',
        });
        expect(priceMessageValues(PRICING.softwareDevelopment, 'es')).toEqual({
            price: '20.000 €',
            bundlePrice: '14.000 €',
            discount: 30,
            upfront: 50,
        });
    });

    it('gives the core offer no bundled price: it is what the discount hangs on', () => {
        expect(priceMessageValues(PRICING.localSeo, 'en')).toEqual({ price: '€750', discount: 30, upfront: 50 });
    });
});

describe('publishedPriceRange', () => {
    /**
     * `ORGANIZATION.priceRange` used to be the hand-written string
     * '€150 - €1,299'. It survived a repricing untouched, which is exactly how a
     * LocalBusiness ends up advertising a price it no longer charges.
     */
    it('spans the cheapest and dearest list prices, and marks the top as a floor', () => {
        // 350 (voice, monthly) to 20000 (software). The trailing "+" is the
        // difference between "at most 20000" and "20000 and up".
        expect(publishedPriceRange('en')).toBe('€350 to €20,000+');
    });

    it('excludes optional monthly add-ons from the floor', () => {
        // The 49/mo hosting is not a price at which a service can be bought.
        expect(publishedPriceRange('en')).not.toContain('€49 ');
    });

    it('never advertises the discounted price as the floor', () => {
        // 245 is what the voice receptionist costs alongside Local SEO. It is a
        // conditional price, so it must not become the bottom of the range.
        expect(publishedPriceRange('en')).not.toContain('245');
    });
});
