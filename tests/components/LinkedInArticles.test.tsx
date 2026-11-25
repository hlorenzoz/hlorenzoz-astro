/**
 * This carousel is a client component that formats a date, which makes it one
 * of the few places in the app where the same string is produced twice: once by
 * the UTC build that emits the static HTML, and once by the reader's browser
 * during hydration. Article dates are bare `YYYY-MM-DD`, so `new Date()` reads
 * them as UTC midnight — a formatter without a pinned `timeZone` then renders
 * the previous day for every reader west of UTC.
 *
 * On `2026-07-01` that is not an off-by-one-day cosmetic issue: it is a
 * different *month*. The build shipped "Jul 2026", browsers in the Americas
 * rendered "Jun 2026", React saw a text mismatch and threw #418 (
 * "Hydration failed because the server rendered HTML didn't match the client"),
 * discarding the server tree and re-rendering the page on the client. It
 * surfaced in PageSpeed Insights, whose runners sit west of UTC, and was
 * invisible from Europe — which is exactly why it needs a test that does not
 * depend on where the suite happens to run.
 *
 * So this file pins TZ to a zone west of UTC. Under the bug these assertions
 * fail; the day-of-month is never rendered, so nothing here is sensitive to
 * anything but the defect itself.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { LinkedInArticle } from '@/lib/linkedin';
import { setTestTimeZone } from '../helpers/timezone';

// Restores by deleting when TZ was unset, which a bare reassignment cannot do.
const restoreTimeZone = setTestTimeZone('America/Los_Angeles');
afterAll(restoreTimeZone);

/**
 * The locale reaches the component through `useParams`, so the mock has to read
 * it from somewhere mutable. Keeping it on a holder that `beforeEach` resets
 * makes the suite order-independent: a test that changes the locale cannot leak
 * into the next one, and no test depends on having run after another.
 */
const nav = { locale: 'en' };
vi.mock('next/navigation', () => ({
    useParams: () => ({ locale: nav.locale }),
    usePathname: () => '/en',
}));

/**
 * Counts constructions so the re-subscription regression is observable, and
 * keeps the latest callback so a test can drive a resize: jsdom reports 0 for
 * every layout box, so the component's mount-time measurement is 0 and the
 * width has to be re-measured after the test sets `offsetWidth`.
 */
const observer = { count: 0, notify: () => {} };
class CountingResizeObserver {
    constructor(callback: () => void) {
        observer.count += 1;
        observer.notify = callback;
    }
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
}
vi.stubGlobal('ResizeObserver', CountingResizeObserver);

/** Gives the scroll area a real width and lets the component re-measure it. */
function setWidth(scrollArea: HTMLElement, width: number) {
    Object.defineProperty(scrollArea, 'offsetWidth', { value: width, configurable: true });
    act(() => {
        observer.notify();
    });
}

import { LinkedInArticles } from '@/components/LinkedInArticles';

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

beforeEach(() => {
    nav.locale = 'en';
    observer.count = 0;
});

describe('LinkedInArticles date rendering', () => {
    it('renders the publication month in UTC, not in the reader timezone', () => {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');

        render(<LinkedInArticles articles={[article()]} />);

        expect(screen.getByText('Jul 2026')).toBeDefined();
        expect(screen.queryByText('Jun 2026')).toBeNull();
    });

    it('keeps the month stable across locales', () => {
        nav.locale = 'es';

        render(<LinkedInArticles articles={[article()]} />);

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
     * `RangeError: Invalid time value` — and this carousel renders on the home
     * page, so that throw took the home page down.
     */
    it.each([
        ['wrong shape', '2026-7-1'],
        ['impossible day', '2026-02-31'],
        ['month 13', '2026-13-01'],
        ['free text', 'not a date'],
        ['empty', ''],
    ])('renders instead of throwing on a malformed date (%s)', (_label, bad) => {
        expect(() =>
            render(<LinkedInArticles articles={[article({ date: bad })]} />)
        ).not.toThrow();
    });

    it('falls back to the raw value so a bad date stays visible', () => {
        render(<LinkedInArticles articles={[article({ date: '2026-13-01' })]} />);

        expect(screen.getByText('2026-13-01')).toBeDefined();
    });

    it('still renders the rest of the card when the date is unusable', () => {
        const bad = article({ date: 'not a date', title: 'Card with a broken date' });

        render(<LinkedInArticles articles={[bad]} />);

        expect(screen.getByText('Card with a broken date')).toBeDefined();
        expect(screen.getByRole('link').getAttribute('href')).toBe(bad.url);
    });
});

describe('LinkedInArticles scroll subscription', () => {
    /**
     * The effect used to depend on `activeIndex`, so every carousel step tore
     * down the ResizeObserver and the scroll listener and built new ones —
     * mid-gesture, and dropping any event that landed in the gap.
     */
    it('subscribes once and does not rebuild the observer as the index advances', () => {
        const articles = [
            article({ id: 'a' }),
            article({ id: 'b' }),
            article({ id: 'c' }),
        ];

        const { container } = render(<LinkedInArticles articles={articles} />);
        expect(observer.count).toBe(1);

        const scrollArea = container.querySelector('.overflow-x-auto') as HTMLDivElement;
        setWidth(scrollArea, 1000);

        for (const left of [300, 600, 900]) {
            act(() => {
                scrollArea.scrollLeft = left;
                scrollArea.dispatchEvent(new Event('scroll'));
            });
        }

        // Under the old `[activeIndex]` dependency this reaches 4.
        expect(observer.count).toBe(1);
    });

    it('still tracks the active slide while subscribed only once', () => {
        const articles = [
            article({ id: 'a' }),
            article({ id: 'b' }),
            article({ id: 'c' }),
        ];

        const { container } = render(<LinkedInArticles articles={articles} />);
        const scrollArea = container.querySelector('.overflow-x-auto') as HTMLDivElement;
        setWidth(scrollArea, 1000);

        const dots = screen.getAllByRole('button', { name: /goToSlide/i });
        expect(dots).toHaveLength(3);

        act(() => {
            scrollArea.scrollLeft = 600;
            scrollArea.dispatchEvent(new Event('scroll'));
        });

        expect(dots[2].getAttribute('aria-current')).toBe('true');
        expect(dots[0].getAttribute('aria-current')).toBe('false');
    });
});
