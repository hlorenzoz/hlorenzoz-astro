import { test, expect } from '@playwright/test';

test.describe('Homepage E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Hide cookie banner for all tests to avoid interference
    await page.addInitScript(() => {
      window.localStorage.setItem('zaraz-consent', 'true');
      window.localStorage.setItem('cookie-consent', 'accepted');
      const style = document.createElement('style');
      style.innerHTML = '#zaraz-consent-banner, .cookie-banner, [id*="consent"] { display: none !important; }';
      document.head.appendChild(style);
    });
  });

  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check page title
    await expect(page).toHaveTitle(/Lorenzoz Agency/);

    // Check hero section (allow more time for dev server compilation)
    await expect(page.getByRole('heading', { name: /We study your business/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#home').getByRole('link', { name: 'Book your free needs analysis' })).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check navbar links (allow some time for JS to hydrate)
    // On mobile/tablet (< 1280px), open the menu first
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1280) {
      const menuButton = page.getByTestId('mobile-menu-toggle');
      await menuButton.click();
      // Wait for solutions text to be visible in the mobile menu
      await page.waitForTimeout(500);
    }

    // Filter by visibility and use better locators to ensure we target the NAVBAR elements
    const nav = page.locator('nav');
    const mobileMenu = page.locator('div.xl\\:hidden').filter({ hasText: /Navigation/i });

    const contactLink = (viewport && viewport.width < 1280)
      ? mobileMenu.getByText(/Contact/i)
      : nav.getByText(/Contact/i).filter({ visible: true });

    await expect(contactLink.first()).toBeAttached({ timeout: 15000 });
  });

  test('should display the four solutions, each linking to its service page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const solutionsSection = page.locator('section#solutions');
    await solutionsSection.scrollIntoViewIfNeeded();
    for (const [name, slug] of [
      ['Local SEO', 'local-seo'],
      ['Website Development', 'website-development'],
      ['AI Voice Receptionist', 'ai-voice-receptionist'],
      ['Software Development', 'software-development'],
    ]) {
      await expect(solutionsSection.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', `/en/services/${slug}/`);
    }
  });

  test('should display verifiable facts and no price', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const facts = page.locator('section#facts');
    await facts.scrollIntoViewIfNeeded();
    await expect(facts.getByText('98 / 100')).toBeVisible({ timeout: 10000 });
    await expect(facts.getByRole('link', { name: 'check it' })).toHaveAttribute('href', /pagespeed\.web\.dev/);
    // The calculator shows the visitor's figures and a dental clinic's market prices, never ours;
    // the only price of ours on the page is the entry price.
    const outsideCalculators = await page.evaluate(() => {
      const body = document.body.cloneNode(true) as HTMLElement;
      body.querySelectorAll('#cost-of-waiting').forEach((el) => el.remove());
      return body.textContent ?? '';
    });
    expect(outsideCalculators).toContain('€500');
    expect(outsideCalculators.replaceAll('€500', '')).not.toMatch(/€\s?\d|\d\s?€/);
  });

  test('should open the How we work section from the hero', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.locator('#home').getByRole('link', { name: 'How we work' }).click();
    await expect(page).toHaveURL(/#how$/);
    await expect(page.locator('section#how')).toBeInViewport();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check main heading is visible even in mobile
    await expect(page.getByRole('heading', { name: /We study your business/i })).toBeVisible({ timeout: 10000 });
  });

  test('should have accessible multi-language versions', async ({ page }) => {
    // Verify English (default)
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Test Spanish version directly
    // This verifies that the static export generated the /es/ route correctly
    await page.goto('/es/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 10000 });

    // The Spanish hero is translated, not the English copy.
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1')).not.toContainText(/We study your business/i);
  });
});
