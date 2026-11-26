import { test, expect, type Page } from '@playwright/test';

/**
 * The booking calendar closes every service landing page. It must fill its
 * container (`max-w-5xl`, 1024px) like the home page's, and the whole iframe
 * must sit inside every box that clips it, so no time slot is cut off.
 *
 * It once rendered as a 300px column: the section reused `hero-bg-deep`, which
 * BaseLayout's critical CSS turns into a centred flex column.
 */
const PAGE_PADDING = 48; // px-6 on both sides

async function calendarBoxes(page: Page) {
    return page.evaluate(() => {
        const iframe = document.querySelector('#booking iframe[src*="cal.com"]')!;
        const wrapper = iframe.closest('#booking-calendar')!.firstElementChild!;
        const box = (el: Element) => {
            const r = el.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width };
        };
        const clippers: ReturnType<typeof box>[] = [];
        for (let el = iframe.parentElement; el && el.id !== 'booking'; el = el.parentElement) {
            if (getComputedStyle(el).overflow !== 'visible') clippers.push(box(el));
        }
        return { iframe: box(iframe), wrapper: box(wrapper), clippers };
    });
}

for (const width of [1440, 390]) {
    test(`the booking calendar fills its container and is not clipped at ${width}px`, async ({ page }) => {
        await page.addInitScript(() => window.localStorage.setItem('zaraz-consent', 'true'));
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/en/services/website-development/', { waitUntil: 'load' });
        await page.locator('#booking-calendar').scrollIntoViewIfNeeded();

        const { iframe, wrapper, clippers } = await calendarBoxes(page);
        expect(wrapper.width).toBeGreaterThanOrEqual(0.9 * Math.min(width - PAGE_PADDING, 1024));
        expect(iframe.width).toBeGreaterThanOrEqual(0.85 * wrapper.width);
        for (const clip of clippers) {
            expect(iframe.top).toBeGreaterThanOrEqual(clip.top);
            expect(iframe.bottom).toBeLessThanOrEqual(clip.bottom);
            expect(iframe.left).toBeGreaterThanOrEqual(clip.left);
            expect(iframe.right).toBeLessThanOrEqual(clip.right);
        }
    });
}
