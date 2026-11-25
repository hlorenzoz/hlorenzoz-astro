import { test, expect } from '@playwright/test';

test.describe('Portfolio Detail Pages', () => {
    // Force serial execution to prevent resource contention during heavy navigation tests
    test.describe.configure({ mode: 'serial' });

    // English Version
    test('should render dental clinic EN detail page correctly', async ({ page }) => {
        // Use 'domcontentloaded' to avoid waiting for heavy third-party assets like Google Maps
        await page.goto('/en/portfolio/dental-clinic-1/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Ensure h1 is visible with timeout
        const title = page.locator('h1');
        await expect(title).toContainText('Restore Your Confidence', { timeout: 20000 });

        // Use scroll for sections
        const carousel = page.locator('#portfolio-features');
        await carousel.scrollIntoViewIfNeeded();
        await expect(carousel).toBeVisible();

        const showcase = page.locator('#portfolio-showcase');
        await showcase.scrollIntoViewIfNeeded();
        await expect(showcase).toBeVisible();

        const cta = page.locator('#portfolio-cta');
        await cta.scrollIntoViewIfNeeded();
        await expect(cta).toBeVisible();
    });

    test('ES detail page shows a breadcrumb whose parent link opens the portfolio', async ({ page }) => {
        await page.goto('/es/portfolio/masajes-orisha/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const crumbs = page.getByRole('navigation', { name: 'Ruta de navegación' });
        await expect(crumbs).toBeVisible({ timeout: 20000 });
        await expect(crumbs.getByRole('listitem')).toHaveCount(3);

        await crumbs.getByRole('link', { name: 'Portafolio' }).click();
        await expect(page).toHaveURL(/\/es\/portfolio\/?$/);
        await expect(page.locator('h1')).toBeVisible();
    });

    test('live entries describe the business, demos do not', async ({ page }) => {
        await page.goto('/en/portfolio/gerp-dj/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const heading = page.getByRole('heading', { level: 2, name: 'About GERP DJ' });
        await heading.scrollIntoViewIfNeeded();
        await expect(heading).toBeVisible({ timeout: 20000 });

        await page.goto('/en/portfolio/dental-clinic-1/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
        await expect(page.locator('#portfolio-business')).toHaveCount(0);
    });

    // Spanish Version
    test('should render dental clinic ES detail page correctly', async ({ page }) => {
        await page.goto('/es/portfolio/dental-clinic-1/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const title = page.locator('h1');
        await expect(title).toContainText('Restaura Tu Confianza', { timeout: 20000 });

        const cta = page.locator('#portfolio-cta');
        await cta.scrollIntoViewIfNeeded();
        await expect(cta).toBeVisible();
    });

    test('should handle navigation and language switching on dental clinic page', async ({ page }) => {
        // More robust navigation strategy
        await page.goto('/en/portfolio/dental-clinic-1', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Ensure critical content is present
        await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });

        const viewport = page.viewportSize();
        const isMobile = viewport && viewport.width < 1280;

        if (isMobile) {
            // Open mobile menu
            const menuBtn = page.getByTestId('mobile-menu-toggle');
            await expect(menuBtn).toBeVisible({ timeout: 10000 });
            await menuBtn.click({ force: true });

            // Interaction might need a small delay for react hydration to settle
            await page.waitForTimeout(500);

            // Ensure menu option is attached and click it
            const menuOption = page.getByTestId('mobile-lang-option-es');
            await expect(menuOption).toBeAttached({ timeout: 15000 });

            // Interaction might need a small delay for react hydration to settle
            await page.waitForTimeout(200);

            // Dispatch click directly to avoid being intercepted by animations/menu closing
            await menuOption.dispatchEvent('click');

            // Wait for transition to start
            await page.waitForTimeout(500);
        } else {
            // Desktop switcher
            const switcher = page.getByTestId('language-switcher');
            await expect(switcher).toBeVisible({ timeout: 10000 });
            await switcher.click({ force: true });

            // Interaction might need a small delay
            await page.waitForTimeout(200);

            // Dispatch click directly to avoid being intercepted
            const langOption = page.getByTestId('lang-option-es');
            await expect(langOption).toBeAttached({ timeout: 15000 });
            await langOption.dispatchEvent('click');

            // Interaction might need a small delay
            await page.waitForTimeout(500);
        }

        // Verify translation update
        await expect(page).toHaveURL(/\/es\/portfolio\/dental-clinic-1/, { timeout: 30000 });
        await expect(page.locator('h1')).toContainText(/Restaura Tu Confianza/i, { timeout: 30000 });
    });


});
