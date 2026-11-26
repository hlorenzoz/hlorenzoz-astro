import { test, expect } from '@playwright/test';

/**
 * Service pages publish no price but the entry price and take no payment: the
 * rest of every solution is quoted after a free first call (the needs
 * analysis), so the hero offers that call and the booking CTA is the only one.
 */
const SERVICE_SLUGS = ['local-seo', 'website-development', 'ai-voice-receptionist', 'software-development'];

test.describe('Service pages are quoted, not priced', () => {
    for (const slug of SERVICE_SLUGS) {
        test(`${slug}: states the quote, shows no price but the entry price and no payment CTA`, async ({ page }) => {
            await page.goto(`/en/services/${slug}/`, { waitUntil: 'domcontentloaded' });

            await expect(page.locator('h1 ~ div').getByRole('link', { name: 'Book your free needs analysis' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Pay Securely Online' })).toHaveCount(0);
            await expect(page.locator('a[href^="https://buy.stripe.com/"]')).toHaveCount(0);
            const text = await page.locator('#main-content').innerText();
            expect(text.replaceAll('€500', '')).not.toMatch(/€\s?\d|\d\s?€/);
        });
    }

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
