import { test, expect } from '@playwright/test';

const SEED = 'masajes-orisha-added-to-portfolio';

test.describe('News', () => {
    test('listing -> post -> portfolio case study (EN)', async ({ page }) => {
        await page.goto('/en/news/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(page.locator('h1')).toHaveText('News', { timeout: 20000 });

        await page.locator(`#news-list h2 a[href^="/en/news/${SEED}"]`).click();
        await expect(page).toHaveURL(new RegExp(`/en/news/${SEED}/?$`));
        await expect(page.locator('h1')).toHaveText('Masajes Orisha joins the portfolio');
        await expect(page.locator('article time[datetime="2026-11-24"]').first()).toBeVisible();
        await expect(page.locator('a[href="https://masajesorisha.com/"]')).toBeVisible();

        await page.locator('a[href^="/en/portfolio/masajes-orisha"]').click();
        await expect(page).toHaveURL(/\/en\/portfolio\/masajes-orisha\/?$/);
        await expect(page.locator('h1')).toBeVisible();
    });

    test('Spanish post renders its own copy', async ({ page }) => {
        await page.goto(`/es/news/${SEED}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(page.locator('h1')).toHaveText('Masajes Orisha se suma al portafolio', { timeout: 20000 });
    });

    test('post shows a breadcrumb whose parent link opens the listing', async ({ page }) => {
        await page.goto(`/en/news/${SEED}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
        await expect(crumbs).toBeVisible({ timeout: 20000 });
        await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Masajes Orisha joins the portfolio');

        await crumbs.getByRole('link', { name: 'News' }).click();
        await expect(page).toHaveURL(/\/en\/news\/?$/);
        await expect(page.locator('h1')).toHaveText('News');
    });

    test('home shows the news strip above the LinkedIn articles', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const news = page.locator('#news');
        await news.scrollIntoViewIfNeeded();
        await expect(news.locator(`a[href^="/en/news/${SEED}"]`)).toBeVisible();
        // Newest first: the GERP DJ post was appended after the seed.
        const posts = await news.locator('li a[href^="/en/news/"]').evaluateAll((links) =>
            [...new Set(links.map((a) => (a.getAttribute('href') ?? '').replace(/\/$/, '')))]
        );
        expect(posts).toEqual(['/en/news/gerp-dj-added-to-portfolio', `/en/news/${SEED}`]);
        const order = await page.evaluate(() => {
            const n = document.getElementById('news');
            const a = document.getElementById('articles');
            return Boolean(n && a && n.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        expect(order).toBe(true);
    });
});
