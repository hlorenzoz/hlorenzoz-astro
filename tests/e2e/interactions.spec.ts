import { test, expect, type Page } from '@playwright/test';
import articles from '../../lib/linkedin-articles.json' with { type: 'json' };

/**
 * Client-script behaviour of the Astro components. The Vitest ports render
 * server-side only (Container API), so everything that happens after a click,
 * a key press, a scroll or a timer is asserted here, against the built `dist/`.
 */

/** Pre-accepts cookies so the banner never overlays the element under test. */
async function acceptCookies(page: Page) {
    await page.addInitScript(() => window.localStorage.setItem('zaraz-consent', 'true'));
}

test.describe('FAQ accordion', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('opens one answer at a time and mirrors it in aria-expanded', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const faq = page.locator('#faq [data-faq]');
        const first = faq.locator('#faq-question-0').locator('xpath=..');
        const second = faq.locator('#faq-question-1').locator('xpath=..');

        await expect(first).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#faq-answer-0')).toBeHidden();

        await first.click();
        await expect(first).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#faq-answer-0')).toBeVisible();

        await second.click();
        await expect(second).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#faq-answer-1')).toBeVisible();
        await expect(first).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#faq-answer-0')).toBeHidden();

        await second.click();
        await expect(second).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#faq-answer-1')).toBeHidden();
    });
});

test.describe('home calculators', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('the cost of waiting adds a daily loss up per week, month and year, and shows "-" for zero', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const root = page.locator('#cost-of-waiting');
        const out = (name: string) => root.locator(`[data-output="${name}"]`);
        await expect(out('week')).toHaveText('€700');

        await root.locator('input[name="missed"]').fill('2');
        await root.locator('input[name="value"]').fill('100');
        await expect(out('day')).toHaveText('€200');
        await expect(out('week')).toHaveText('€1,000');
        await expect(out('month')).toHaveText('€4,333');
        await expect(out('year')).toContainText('€52,000');

        await root.locator('input[name="missed"]').fill('0');
        await expect(out('day')).toHaveText('-');
        await expect(out('month')).toHaveText('-');
    });

    test('the cost of waiting formats in the page locale', async ({ page }) => {
        await page.goto('/es/', { waitUntil: 'load' });
        const root = page.locator('#cost-of-waiting');
        // Spanish groups thousands only from five digits on (CLDR), so 10.000 shows the separator.
        await root.locator('input[name="value"]').fill('2000');
        await expect(root.locator('[data-output="week"]')).toHaveText(/^10\.000\s€$/);
        await root.locator('input[name="value"]').fill('');
        await expect(root.locator('[data-output="week"]')).toHaveText('-');
    });
});

test.describe('navbar mobile menu', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('opens, locks the page scroll, and closes with Escape', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const toggle = page.getByTestId('mobile-menu-toggle');
        const panel = page.locator('[data-mobile-menu-panel]');

        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(toggle).toHaveAttribute('aria-label', 'Close navigation menu');
        await expect(panel).toHaveClass(/translate-x-0/);
        await expect(page.locator('[data-mobile-menu]')).toBeVisible();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

        await page.keyboard.press('Escape');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(panel).toHaveClass(/translate-x-full/);
        await expect(page.locator('[data-mobile-menu]')).toBeHidden();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe('unset');
    });

    test('closes when a menu link is followed', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const toggle = page.getByTestId('mobile-menu-toggle');
        await toggle.click();
        await page.locator('[data-mobile-menu-panel] [data-mobile-menu-close]').last().click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
});

test.describe('language switcher', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('links to the same page in the other locale', async ({ page }) => {
        await page.goto('/en/services/local-seo/', { waitUntil: 'load' });
        const switcher = page.getByTestId('language-switcher');
        await switcher.click();
        await expect(switcher).toHaveAttribute('aria-expanded', 'true');

        const es = page.getByTestId('lang-option-es');
        await expect(es).toHaveAttribute('href', '/es/services/local-seo/');
        await es.click();
        await expect(page).toHaveURL(/\/es\/services\/local-seo\/$/);
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    });

    test('closes with Escape', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const switcher = page.getByTestId('language-switcher');
        await switcher.click();
        await expect(switcher).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press('Escape');
        await expect(switcher).toHaveAttribute('aria-expanded', 'false');
    });
});

test.describe('cookie banner', () => {
    // It waits for the visitor's first interaction: a page load alone (a
    // crawler, Lighthouse, PageSpeed Insights) never shows it, so it cannot
    // paint late and push Speed Index back. No user agent sniffing.
    test.beforeEach(async ({ page }) => page.clock.install());

    test('stays hidden until the first interaction, then stores the choice in zaraz-consent', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const banner = page.locator('[data-cookie-banner]');

        await page.clock.runFor(10000);
        await expect(banner).toBeHidden();

        await page.mouse.wheel(0, 400);
        await expect(banner).toBeVisible();

        await page.getByTestId('cookie-accept').click();
        await expect(banner).toBeHidden();
        expect(await page.evaluate(() => localStorage.getItem('zaraz-consent'))).toBe('true');

        // A stored choice keeps it away on the next visit, even after interacting.
        await page.reload({ waitUntil: 'load' });
        await page.keyboard.press('Tab');
        await page.clock.runFor(1000);
        await expect(banner).toBeHidden();
    });

    test('stores a rejection as false', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        await page.keyboard.press('Tab');
        await page.getByTestId('cookie-reject').click();
        await expect(page.locator('[data-cookie-banner]')).toBeHidden();
        expect(await page.evaluate(() => localStorage.getItem('zaraz-consent'))).toBe('false');
    });

    test('never appears for a load without interaction, whatever the user agent', async ({ browser }) => {
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) Chrome/157.0 Mobile Safari/537.36' });
        const page = await context.newPage();
        await page.clock.install();
        await page.goto('/en/', { waitUntil: 'load' });
        await page.clock.runFor(15000);
        await expect(page.locator('[data-cookie-banner]')).toBeHidden();
        await context.close();
    });
});

test.describe('home carousels', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    for (const { id, next, prev, dot, slides } of [
        { id: '#portfolio', next: 'Next slide', prev: 'Previous slide', dot: /Go to slide/, slides: Infinity },
        { id: '#articles', next: 'Next article', prev: 'Previous article', dot: /Go to article/, slides: articles.length },
    ]) {
        test(`${id}: next/prev move the current dot and the disabled state`, async ({ page }) => {
            // Controls render only for 2+ slides; the articles carousel runs the
            // same script as the portfolio one, so it is covered there meanwhile.
            test.skip(slides < 3, `${id} needs 3+ slides in the data to step through`); // guardrail: allow-skip depends on content volume
            await page.goto('/en/', { waitUntil: 'load' });
            const section = page.locator(id);
            await section.scrollIntoViewIfNeeded();
            const dots = section.getByRole('button', { name: dot });
            const prevButton = section.getByRole('button', { name: prev, exact: true });
            const nextButton = section.getByRole('button', { name: next, exact: true });

            await expect(dots.first()).toHaveAttribute('aria-current', 'true');
            await expect(prevButton).toBeDisabled();

            await nextButton.click();
            await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
            await expect(dots.first()).toHaveAttribute('aria-current', 'false');
            await expect(prevButton).toBeEnabled();
            await expect(dots.nth(1).locator('div')).toHaveClass(/w-10/);

            await prevButton.click();
            await expect(dots.first()).toHaveAttribute('aria-current', 'true');
            await expect(prevButton).toBeDisabled();
        });

        test(`${id}: a dot jumps to its slide`, async ({ page }) => {
            test.skip(slides < 3, `${id} needs 3+ slides in the data to step through`); // guardrail: allow-skip depends on content volume
            await page.goto('/en/', { waitUntil: 'load' });
            const section = page.locator(id);
            await section.scrollIntoViewIfNeeded();
            const dots = section.getByRole('button', { name: dot });
            await dots.nth(2).click();
            await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true');
        });
    }

    test('a single LinkedIn article renders no arrows or dots', async ({ page }) => {
        test.skip(articles.length !== 1, 'only meaningful with exactly one article'); // guardrail: allow-skip depends on content volume
        await page.goto('/en/', { waitUntil: 'load' });
        await expect(page.locator('#articles')).toBeVisible();
        await expect(page.locator('#articles button')).toHaveCount(0);
    });

    test('the arrow keys step the portfolio carousel', async ({ page }) => {
        await page.goto('/en/', { waitUntil: 'load' });
        const section = page.locator('#portfolio');
        await section.scrollIntoViewIfNeeded();
        const dots = section.getByRole('button', { name: /Go to slide/ });
        await page.keyboard.press('ArrowRight');
        await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
        await page.keyboard.press('ArrowLeft');
        await expect(dots.first()).toHaveAttribute('aria-current', 'true');
    });

    test('the portfolio carousel reaches its last slide and steps back from it', async ({ page }) => {
        // Several compact cards fit at once, so the last ones cannot align to the
        // start: "next" must still end on the last dot, and "previous" must move.
        await page.goto('/en/', { waitUntil: 'load' });
        const section = page.locator('#portfolio');
        await section.scrollIntoViewIfNeeded();
        const dots = section.getByRole('button', { name: /Go to slide/ });
        const nextButton = section.getByRole('button', { name: 'Next slide', exact: true });
        const prevButton = section.getByRole('button', { name: 'Previous slide', exact: true });
        for (let i = 0; i < 20 && (await nextButton.isEnabled()); i++) {
            await nextButton.click();
            await page.waitForTimeout(400);
        }
        await expect(dots.last()).toHaveAttribute('aria-current', 'true');
        await expect(nextButton).toBeDisabled();
        await prevButton.click();
        await expect(dots.last()).toHaveAttribute('aria-current', 'false');
        await expect(nextButton).toBeEnabled();
    });
});

test.describe('portfolio type filter', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('shows only the chosen type and announces the count', async ({ page }) => {
        await page.goto('/en/portfolio/', { waitUntil: 'load' });
        const filter = page.locator('[data-portfolio-filter]');
        const cards = page.locator('[data-portfolio-type]');
        const total = await cards.count();
        const live = await page.locator('[data-portfolio-type="live"]').count();
        expect(live).toBeGreaterThan(0);
        expect(live).toBeLessThan(total);

        const liveButton = filter.locator('[data-filter="live"]');
        await liveButton.click();
        await expect(liveButton).toHaveAttribute('aria-pressed', 'true');
        await expect(filter.locator('[data-filter="all"]')).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('[data-portfolio-type="live"]:visible')).toHaveCount(live);
        await expect(page.locator('[data-portfolio-type="demo"]:visible')).toHaveCount(0);
        await expect(filter.getByRole('status')).toHaveText(`Showing ${live} of ${total} projects`);

        await filter.locator('[data-filter="all"]').click();
        await expect(page.locator('[data-portfolio-type]:visible')).toHaveCount(total);
        await expect(filter.getByRole('status')).toHaveText(`Showing ${total} of ${total} projects`);
    });
});

test.describe('full screenshot carousel', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('opens the lightbox, steps images, and closes with Escape', async ({ page }) => {
        await page.goto('/en/portfolio/lorenzoz-agency/', { waitUntil: 'load' });
        const root = page.locator('[data-fsc]').first();
        const modal = root.locator('[data-fsc-modal]');
        const counter = root.locator('[data-fsc-counter]');
        await root.scrollIntoViewIfNeeded();

        await expect(counter).toHaveText(/^01 \/ \d{2}$/);
        await root.locator('[data-fsc-open] [data-fsc-next]').click();
        await expect(counter).toHaveText(/^02 \/ \d{2}$/);
        await expect(modal).toBeHidden();

        await root.locator('[data-fsc-open]').click({ position: { x: 20, y: 20 } });
        await expect(modal).toBeVisible();
        await expect(root.locator('[data-fsc-modal-count]')).toHaveText(/^Image 2 of \d+$/);
        await expect(root.locator('[data-fsc-modal-img]')).toHaveAttribute('src', /cdn-cgi\/image/);

        await page.keyboard.press('ArrowRight');
        await expect(root.locator('[data-fsc-modal-count]')).toHaveText(/^Image 3 of \d+$/);

        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
    });

    test('closes the lightbox with its close button', async ({ page }) => {
        await page.goto('/en/portfolio/lorenzoz-agency/', { waitUntil: 'load' });
        const root = page.locator('[data-fsc]').first();
        await root.scrollIntoViewIfNeeded();
        await root.locator('[data-fsc-open]').click({ position: { x: 20, y: 20 } });
        await expect(root.locator('[data-fsc-modal]')).toBeVisible();
        await root.getByRole('button', { name: 'Close' }).click();
        await expect(root.locator('[data-fsc-modal]')).toBeHidden();
    });
});

test.describe('assistant after a language switch', () => {
    test.beforeEach(async ({ page }) => acceptCookies(page));

    test('shows the conversation from the previous page at once, without scrolling', async ({ page }) => {
        // A call (not a chat) carried over: the widget waits for a click, so no session opens here.
        await page.addInitScript(() =>
            sessionStorage.setItem(
                'elevenlabs-conversation',
                JSON.stringify({ mode: 'call', messages: [{ role: 'user', text: 'hola' }, { role: 'agent', text: 'Hola, en que puedo ayudarte?' }] })
            )
        );
        await page.goto('/es/', { waitUntil: 'load' });
        const log = page.locator('[data-elevenlabs] [role="log"]');
        await expect(log).toContainText('Hola, en que puedo ayudarte?', { timeout: 15000 });
        await expect(page.locator('[data-elevenlabs]').getByRole('button', { name: 'Iniciar una llamada' })).toBeVisible();
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
});
