import { test, expect } from '@playwright/test';

/**
 * The payment CTA on a service page, when there is one.
 *
 * A page shows "Pay Securely Online" only while `lib/payment-links.json` holds
 * a link that charges the price currently published (see `paymentLinkUrl`).
 * After a price change and before the Stripe sync is rerun, the button is
 * hidden on purpose, so this suite cannot assume it is there. What it asserts
 * is the invariant: a payment CTA, if shown, is a real Stripe Payment Link, and
 * there is never more than one.
 *
 * Deliberately never clicks it. That would leave Cloudflare's static preview
 * and reach Stripe, which this suite must not do.
 */
const SERVICE_SLUGS = ['local-seo', 'website-development', 'ai-voice-receptionist', 'software-development'];

test.describe('Service page payment CTAs', () => {
    for (const slug of SERVICE_SLUGS) {
        test(`${slug}: any payment CTA shown is a Stripe Payment Link`, async ({ page }) => {
            await page.goto(`/en/services/${slug}/`, { waitUntil: 'domcontentloaded' });

            const paymentLinks = page.getByRole('link', { name: 'Pay Securely Online' });
            const count = await paymentLinks.count();
            expect(count).toBeLessThanOrEqual(1);

            if (count === 1) {
                await expect(paymentLinks).toHaveAttribute('href', /^https:\/\/buy\.stripe\.com\//);
                await expect(paymentLinks).toHaveAttribute('target', '_blank');
            }
        });
    }

    test('software-development: never has a payment CTA (its price is a floor)', async ({ page }) => {
        await page.goto('/en/services/software-development/', { waitUntil: 'domcontentloaded' });

        await expect(page.getByRole('link', { name: 'Pay Securely Online' })).toHaveCount(0);
    });

    for (const slug of ['reputation-review-management', 'digital-business-card']) {
        test(`${slug}: the page no longer exists`, async ({ page }) => {
            // Absorbed into Local SEO and paused, respectively. The static
            // preview does not apply `_redirects`, so the export simply has no
            // such page; in production these paths redirect.
            const response = await page.goto(`/en/services/${slug}/`, { waitUntil: 'domcontentloaded' });
            expect(response?.status()).toBe(404);
        });
    }
});
