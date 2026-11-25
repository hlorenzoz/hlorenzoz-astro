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
    await expect(page.getByRole('heading', { name: /More local customers/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/from Google and AI/i).first()).toBeVisible();
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

  test('should display features', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check feature cards
    const solutionsSection = page.locator('section#solutions');
    await solutionsSection.scrollIntoViewIfNeeded();
    // The four pillars of the one core offer.
    await expect(solutionsSection.getByText(/Authority content/i).first()).toBeVisible({ timeout: 10000 });
    await expect(solutionsSection.getByText(/Backlinks and citations/i).first()).toBeVisible();
    await expect(solutionsSection.getByText(/Authority on Google and AI/i).first()).toBeVisible();
    await expect(solutionsSection.getByText(/Review management/i).first()).toBeVisible();
  });

  test('should display stats', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check stats section
    const stats = page.locator('section#stats');
    await stats.scrollIntoViewIfNeeded();
    // The plan's price, marked as before tax, and the two counts.
    await expect(stats.getByText('€750')).toBeVisible({ timeout: 10000 });
    await expect(stats.getByText('+ VAT')).toBeVisible();
    await expect(stats.getByText(/Pillars of work/i)).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check main heading is visible even in mobile
    await expect(page.getByRole('heading', { name: /More local customers/i })).toBeVisible({ timeout: 10000 });
  });

  test('should have accessible multi-language versions', async ({ page }) => {
    // Verify English (default)
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Test Spanish version directly
    // This verifies that the static export generated the /es/ route correctly
    await page.goto('/es/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es', { timeout: 10000 });

    // Check for Spanish content
    await expect(page.locator('body')).toContainText(/Más clientes locales/i, { timeout: 10000 });
  });
});
