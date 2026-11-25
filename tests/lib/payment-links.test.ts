import { describe, it, expect } from 'vitest';
import { PRICING, type ServiceKey } from '@/lib/pricing';
import { isCurrent, paymentLinkUrl, type PaymentLinkEntry } from '@/lib/payment-links';
import paymentLinksData from '@/lib/payment-links.json';

/**
 * `lib/payment-links.json` is generated from `lib/pricing.ts` by
 * `scripts/create-payment-links.mjs`, never edited or typed into the Stripe
 * Dashboard by hand.
 *
 * The two can still drift: a price changes and nobody reruns the script. This
 * used to be caught by a test that failed until someone resynced, which only
 * works if the person changing the price has a Stripe key to hand. The guard is
 * structural now: a link whose amount no longer matches the published price is
 * simply not offered, so a visitor is never sent to pay an old figure.
 */
const ledger = paymentLinksData as Record<string, PaymentLinkEntry>;
const KEYS = Object.keys(PRICING) as ServiceKey[];

const entry = (over: Partial<PaymentLinkEntry> = {}): PaymentLinkEntry => ({
    productId: 'prod_x',
    priceId: 'price_x',
    paymentLinkId: 'plink_x',
    url: 'https://buy.stripe.com/test_x',
    amount: 750,
    recurrence: 'month',
    mode: 'test',
    updatedAt: '2026-10-09T00:00:00.000Z',
    ...over,
});

describe('isCurrent()', () => {
    it('accepts an entry that charges exactly the published price', () => {
        expect(isCurrent(entry(), PRICING.localSeo)).toBe(true);
    });

    it('rejects an entry created for an older price', () => {
        // The real case: the ledger still holds 897/mo for Local SEO.
        expect(isCurrent(entry({ amount: 897 }), PRICING.localSeo)).toBe(false);
    });

    it('rejects an entry whose billing interval changed', () => {
        expect(isCurrent(entry({ recurrence: 'once' }), PRICING.localSeo)).toBe(false);
    });

    it('rejects an entry that still carries a free trial', () => {
        // The trial is gone. A link created with one would start billing 15 days
        // late, contradicting the up-front payment the copy states.
        expect(isCurrent(entry({ trialDays: 15 }), PRICING.localSeo)).toBe(false);
    });

    it('never accepts a link for a floor price', () => {
        // "From 20000" is where quotes start, not an amount anyone can pay.
        expect(isCurrent(entry({ amount: 20000, recurrence: 'once' }), PRICING.softwareDevelopment)).toBe(false);
    });

    it('rejects a missing entry', () => {
        expect(isCurrent(undefined, PRICING.localSeo)).toBe(false);
    });
});

describe('paymentLinkUrl()', () => {
    it('offers a link only when the ledger matches the published price', () => {
        for (const key of KEYS) {
            const url = paymentLinkUrl(key);
            if (isCurrent(ledger[key], PRICING[key])) {
                expect(url, `"${key}" has a current ledger entry but no link`).toMatch(/^https:\/\/buy\.stripe\.com\//);
            } else {
                expect(url, `"${key}" is offered a link that charges a different price`).toBeUndefined();
            }
        }
    });

    it('never sends a visitor to pay a figure other than the published one', () => {
        for (const key of KEYS) {
            if (paymentLinkUrl(key) === undefined) continue;
            expect(ledger[key].amount).toBe(PRICING[key].base.amount);
        }
    });
});

describe('the ledger file', () => {
    it('holds only Stripe-hosted Payment Links', () => {
        for (const item of Object.values(ledger)) {
            expect(item.url).toMatch(/^https:\/\/buy\.stripe\.com\//);
        }
    });
});
