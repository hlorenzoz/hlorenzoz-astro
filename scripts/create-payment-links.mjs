#!/usr/bin/env node
/**
 * Stripe Payment Link sync (idempotent).
 *
 * `lib/pricing.ts` is the single source of truth for every service's price.
 * This script is the ONLY thing allowed to create Payment Links from it —
 * never type a price into the Stripe Dashboard by hand, or it drifts from
 * the code exactly the way the site's prices once drifted from each other.
 *
 * For each service with a fixed `base` price (one published as a floor,
 * `from: true`, is skipped: it has no amount to check out), this creates or reuses a Stripe
 * Product, always creates a fresh Price (Prices are immutable, so a changed
 * amount or interval needs a new one), creates a Payment Link for it, and
 * deactivates whatever Price/Payment Link it replaces. Re-running with an
 * unchanged price list AND an unchanged mode (test/live) is a no-op.
 *
 * `lib/payment-links.json` is the ledger, keyed by ServiceKey. It's
 * committed — Payment Link URLs aren't secret, only STRIPE_SECRET_KEY is.
 *
 * Usage:  STRIPE_SECRET_KEY=sk_test_... bun run stripe:sync-payment-links
 */
import process from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Stripe from 'stripe';
import { PRICING } from '../lib/pricing.ts';
import enMessages from '../messages/en.json' with { type: 'json' };

// Resolved from the working directory, not `import.meta.url`: this module is
// also imported (for its pure helpers) by a Vitest suite, whose loader does
// not always hand back a `file:`-scheme URL. The script is only ever run
// from the repo root (via the `stripe:sync-payment-links` package.json
// script, or Vitest itself), so `process.cwd()` is reliable here.
const LEDGER_PATH = join(process.cwd(), 'lib/payment-links.json');

export function readLedger(path = LEDGER_PATH) {
    let raw;
    try {
        raw = readFileSync(path, 'utf8');
    } catch (err) {
        if (err.code === 'ENOENT') return {};
        throw err;
    }
    return JSON.parse(raw);
}

export function writeLedger(ledger, path = LEDGER_PATH) {
    const sorted = Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
}

/**
 * A ledger entry is only reusable when it was created in the SAME mode
 * (test/live) we're running in now. Without this check, going live with an
 * unchanged price list would silently keep serving the old sandbox Payment
 * Link — real visitors would "pay" on a test link that charges nobody.
 */
export function unchanged(entry, offer, mode) {
    return (
        entry &&
        entry.url &&
        entry.mode === mode &&
        entry.amount === offer.base.amount &&
        entry.recurrence === offer.base.recurrence &&
        // A link created with a free trial is stale: the trial no longer exists.
        !entry.trialDays
    );
}

async function syncService(stripe, serviceKey, offer, ledger, mode) {
    const existing = ledger[serviceKey];

    if (unchanged(existing, offer, mode)) {
        console.log(`${serviceKey}: unchanged, reusing ${existing.url}`);
        return existing;
    }

    const productId =
        existing?.productId ??
        (
            await stripe.products.create({
                name: enMessages.services[serviceKey].name,
                metadata: { serviceKey },
            })
        ).id;

    const price = await stripe.prices.create({
        product: productId,
        currency: 'eur',
        unit_amount: offer.base.amount * 100,
        ...(offer.base.recurrence === 'month' ? { recurring: { interval: 'month' } } : {}),
        metadata: { serviceKey },
    });

    const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { serviceKey },
        after_completion: {
            type: 'hosted_confirmation',
            hosted_confirmation: {
                custom_message: 'Thank you — we will be in touch shortly to get started.',
            },
        },
    });

    if (existing?.priceId) {
        await stripe.prices.update(existing.priceId, { active: false });
    }
    if (existing?.paymentLinkId) {
        await stripe.paymentLinks.update(existing.paymentLinkId, { active: false });
    }

    console.log(`${serviceKey}: created ${paymentLink.url}`);

    return {
        productId,
        priceId: price.id,
        paymentLinkId: paymentLink.id,
        url: paymentLink.url,
        amount: offer.base.amount,
        recurrence: offer.base.recurrence,
        mode,
        updatedAt: new Date().toISOString(),
    };
}

async function main() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not set. Export it before running this script.');
    }
    const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test';
    const stripe = new Stripe(secretKey);

    const ledger = readLedger();
    // A floor price ("from 20000") has no fixed amount to charge, so no link.
    const payable = Object.entries(PRICING).filter(([, offer]) => !offer.base.from);

    for (const [serviceKey, offer] of payable) {
        ledger[serviceKey] = await syncService(stripe, serviceKey, offer, ledger, mode);
    }

    writeLedger(ledger);
    console.log(`Done. ${payable.length} payable service(s) synced in ${mode} mode.`);
}

// Only run when executed directly (`node scripts/create-payment-links.mjs`),
// not when imported by a test for its pure helpers.
if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
