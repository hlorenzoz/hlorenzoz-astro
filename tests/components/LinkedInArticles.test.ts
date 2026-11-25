/**
 * Article dates are bare `YYYY-MM-DD`, so `new Date()` reads them as UTC
 * midnight, and a formatter without a pinned `timeZone` renders the previous
 * day for every reader west of UTC. On `2026-07-01` that is a different
 * *month*: the Next build shipped "Jul 2026", browsers in the Americas
 * re-rendered "Jun 2026" and React threw hydration error #418.
 *
 * The Astro component formats at build time only, but the build machine's zone
 * must not leak into the month either, so this file pins TZ to a zone west of
 * UTC. Under the bug these assertions fail; the day of the month is never
 * rendered, so nothing here is sensitive to anything but the defect itself.
 */
import { describe, it, expect, afterAll } from 'vitest';
import type { LinkedInArticle } from '@/lib/linkedin';
import { renderAstro } from '@/tests/helpers/render';
import { setTestTimeZone } from '../helpers/timezone';
import LinkedInArticles from '@/src/components/LinkedInArticles.astro';

// Restores by deleting when TZ was unset, which a bare reassignment cannot do.
const restoreTimeZone = setTestTimeZone('America/Los_Angeles');
afterAll(restoreTimeZone);

const article = (over: Partial<LinkedInArticle> = {}): LinkedInArticle => ({
    id: 'first-of-month',
    url: 'https://www.linkedin.com/pulse/first-of-month',
    image: 'https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/me/cover.webp',
    title: 'An article published on the first of a month',
    excerpt: 'The date that turns a timezone slip into a wrong month.',
    // UTC midnight on this date is still 30 June in Los Angeles.
    date: '2026-07-01',
    readTimeMin: 6,
    ...over,
});

const render = (articles: LinkedInArticle[], locale = 'en') => renderAstro(LinkedInArticles, { articles, locale });

describe('LinkedInArticles date rendering', () => {
    it('renders the publication month in UTC, not in the reader timezone', async () => {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');

        const screen = await render([article()]);

        expect(screen.getByText('Jul 2026')).toBeDefined();
        expect(screen.queryByText('Jun 2026')).toBeNull();
    });

    it('keeps the month stable across locales', async () => {
        const screen = await render([article()], 'es');

        // Spanish abbreviates differently ("jul"), but it must still be July.
        expect(screen.getByText(/jul/i)).toBeDefined();
        expect(screen.queryByText(/jun/i)).toBeNull();
    });
});

describe('LinkedInArticles malformed dates', () => {
    /**
     * `getLinkedInArticles()` casts `linkedin-articles.json` with a bare
     * `as LinkedInArticle[]`, so nothing validates `date` at runtime. Passing an
     * unparseable value to `Intl.DateTimeFormat.format` throws
     * `RangeError: Invalid time value`, and this carousel renders on the home
     * page, so that throw would fail the home page build.
     */
    it.each([
        ['wrong shape', '2026-7-1'],
        ['impossible day', '2026-02-31'],
        ['month 13', '2026-13-01'],
        ['free text', 'not a date'],
        ['empty', ''],
    ])('renders instead of throwing on a malformed date (%s)', async (_label, bad) => {
        await expect(render([article({ date: bad })])).resolves.toBeDefined();
    });

    it('falls back to the raw value so a bad date stays visible', async () => {
        const screen = await render([article({ date: '2026-13-01' })]);

        expect(screen.getByText('2026-13-01')).toBeDefined();
    });

    it('still renders the rest of the card when the date is unusable', async () => {
        const bad = article({ date: 'not a date', title: 'Card with a broken date' });

        const screen = await render([bad]);

        expect(screen.getByText('Card with a broken date')).toBeDefined();
        expect(screen.getByRole('link').getAttribute('href')).toBe(bad.url);
    });
});

/**
 * Scrolling, the ResizeObserver and the keyboard handler live in the client
 * script (covered by Playwright). Here: the server-rendered initial state the
 * script starts from.
 */
describe('LinkedInArticles initial carousel state', () => {
    const three = [article({ id: 'a' }), article({ id: 'b' }), article({ id: 'c' })];

    it('renders one dot per article with the first one current', async () => {
        const screen = await render(three);
        const dots = screen.getAllByRole('button', { name: /Go to article/ });
        expect(dots).toHaveLength(3);
        expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual(['true', 'false', 'false']);
        expect(dots[0].firstElementChild).toHaveClass('w-10', 'bg-blue-600');
        expect(dots[1].firstElementChild).toHaveClass('w-2.5', 'bg-gray-300');
    });

    it('starts with "previous" disabled and "next" enabled', async () => {
        const screen = await render(three);
        expect(screen.getByRole('button', { name: 'Previous article' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Next article' })).toBeEnabled();
    });

    it('marks the scroll track and its ratios for the client script', async () => {
        const { body } = await render(three);
        const root = body.querySelector('#articles[data-carousel]') as HTMLElement;
        expect(root.dataset.itemRatio).toBe('0.3');
        expect(root.dataset.fallbackRatio).toBe('0.6');
        expect(root.querySelector('[data-carousel-track]')?.children).toHaveLength(3);
    });

    it('renders no arrows or dots for a single article, and nothing without articles', async () => {
        const one = await render([article()]);
        expect(one.queryAllByRole('button')).toHaveLength(0);
        // The (deduped) client script tag may still be emitted; the section is not.
        const none = await render([]);
        expect(none.body.querySelector('#articles')).toBeNull();
        expect(none.body.textContent?.trim()).toBe('');
    });
});
