import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLedger, unchanged } from '../../scripts/create-payment-links.mjs';

// A scratch file, never the real committed lib/payment-links.json — these
// tests must not touch the actual production ledger.
const TEST_LEDGER_PATH = join(tmpdir(), `payment-links-test-${process.pid}.json`);

/**
 * Regression coverage for two bugs found in review:
 * - `unchanged()` ignored the ledger's `mode`, so going live with an
 *   unchanged price list silently kept serving the old sandbox link.
 * - `readLedger()` swallowed JSON parse errors the same way as a missing
 *   file, so a corrupted ledger silently recreated every Stripe object
 *   instead of failing loudly.
 */
describe('unchanged()', () => {
    const offer = { base: { amount: 750, recurrence: 'month' } };

    it('is true when the ledger entry matches price and mode', () => {
        const entry = { url: 'https://buy.stripe.com/test_x', mode: 'test', amount: 750, recurrence: 'month' };
        expect(unchanged(entry, offer, 'test')).toBe(true);
    });

    it('is false when the mode differs, even if the price is identical (test -> live)', () => {
        const entry = { url: 'https://buy.stripe.com/test_x', mode: 'test', amount: 750, recurrence: 'month' };
        expect(unchanged(entry, offer, 'live')).toBe(false);
    });

    it('is false when the amount changed', () => {
        const entry = { url: 'https://buy.stripe.com/test_x', mode: 'test', amount: 999, recurrence: 'month', trialDays: 15 };
        expect(unchanged(entry, offer, 'test')).toBe(false);
    });

    it('is false for a missing entry', () => {
        expect(unchanged(undefined, offer, 'test')).toBeFalsy();
    });
});

describe('readLedger()', () => {
    afterEach(() => {
        rmSync(TEST_LEDGER_PATH, { force: true });
    });

    it('returns {} when the ledger file does not exist', () => {
        expect(readLedger(TEST_LEDGER_PATH)).toEqual({});
    });

    it('throws instead of silently discarding a corrupted ledger', () => {
        writeFileSync(TEST_LEDGER_PATH, '{ not valid json');
        expect(() => readLedger(TEST_LEDGER_PATH)).toThrow();
    });

    it('parses a well-formed ledger normally', () => {
        writeFileSync(TEST_LEDGER_PATH, '{"localSeo": {"url": "https://buy.stripe.com/test_x"}}');
        expect(readLedger(TEST_LEDGER_PATH)).toEqual({ localSeo: { url: 'https://buy.stripe.com/test_x' } });
    });
});
